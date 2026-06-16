/* =========================================================
   Peaceful Nights Guide — server.js
   Serves the static site AND a small admin API so products
   can be added/edited/deleted and persisted.

   Storage is pluggable (see store.js):
     - DATABASE_URL set  -> PostgreSQL (real database)
     - otherwise         -> JSON file on disk

   The public site is unchanged: it still fetches
   /data/products.json — but the server answers that route
   from storage, so admin changes go live instantly.
   ========================================================= */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createStore } = require('./store');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

// Folder used only by the JSON-file fallback store. If it isn't
// writable (e.g. no disk attached), fall back to a project-local dir.
const FALLBACK_DIR = path.join(ROOT, '.data');
let DATA_DIR = process.env.DATA_DIR || FALLBACK_DIR;
if (!process.env.DATABASE_URL) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn(
      `Could not use DATA_DIR "${DATA_DIR}" (${err.code}). Falling back to "${FALLBACK_DIR}".`
    );
    DATA_DIR = FALLBACK_DIR;
  }
}

// Admin credentials come from environment variables in production.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'peacefulnights2025';

const store = createStore({ dataDir: DATA_DIR });

/* ---------- Auth (stateless signed tokens) ----------
   Tokens are signed with a secret (HMAC), so any server process
   can validate them without shared memory. This survives Render
   restarts, redeploys, and multiple instances — which is what
   caused the "session expired" errors with in-memory tokens. */
const TOKEN_TTL = 1000 * 60 * 60 * 8; // 8 hours
// Stable secret so tokens stay valid across restarts. Defaults to
// the admin password if SESSION_SECRET isn't set.
const SESSION_SECRET = process.env.SESSION_SECRET || ('pn-' + ADMIN_PASSWORD);

function sign(data) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

function issueToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TOKEN_TTL })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function isValidToken(token) {
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return false;
  const expected = sign(payload);
  // constant-time comparison
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof exp === 'number' && exp > Date.now();
  } catch {
    return false;
  }
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — please sign in again.' });
  }
  next();
}

// Wrap async route handlers so errors become clean 500s.
const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  });

/* ---------- App ---------- */
const app = express();
app.use(express.json({ limit: '15mb' })); // images are base64 data URLs

// The public site reads this — answered from storage.
app.get('/data/products.json', wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ products: await store.list() });
}));

// Admin login -> token used for write requests.
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ token: issueToken() });
  }
  res.status(401).json({ error: 'Invalid username or password.' });
});

app.get('/api/products', wrap(async (req, res) => {
  res.json({ products: await store.list() });
}));

app.post('/api/products', requireAuth, wrap(async (req, res) => {
  const product = req.body || {};
  if (!product.title || !String(product.title).trim()) {
    return res.status(400).json({ error: 'A product title is required.' });
  }
  if (!product.id) product.id = 'product-' + crypto.randomBytes(4).toString('hex');
  await store.upsert(product);
  res.json(product);
}));

app.delete('/api/products/:id', requireAuth, wrap(async (req, res) => {
  await store.remove(req.params.id);
  res.status(204).end();
}));

// Everything else: serve the static site from the repo root.
app.use(express.static(ROOT, { extensions: ['html'] }));

/* ---------- Boot ---------- */
(async () => {
  let seed = [];
  try {
    seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8')).products || [];
  } catch { /* no seed file */ }

  await store.init(seed);
  console.log(`Storage backend: ${store.kind}`);

  app.listen(PORT, () => {
    console.log(`Peaceful Nights Guide running on http://localhost:${PORT}`);
  });
})().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
