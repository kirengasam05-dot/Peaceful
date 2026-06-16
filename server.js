/* =========================================================
   Peaceful Nights Guide — server.js
   Serves the static site AND a small admin API so products
   can be added/edited/deleted and persisted to disk.

   The public site is unchanged: it still fetches
   /data/products.json — but the server now answers that
   route from the database file instead of the bundled flat
   file, so admin changes go live instantly for everyone.

   Storage is a JSON file on disk (no native dependencies, so
   it builds anywhere). On Render it lives on a persistent
   disk so the data survives redeploys.
   ========================================================= */

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

// Where the database file lives. On Render this points at a
// persistent disk (e.g. /var/data) so data survives redeploys.
// If that folder can't be created/written (e.g. no disk attached),
// we fall back to a project-local folder so the app still runs —
// but note that fallback storage is wiped on every redeploy.
const FALLBACK_DIR = path.join(ROOT, '.data');
let DATA_DIR = process.env.DATA_DIR || FALLBACK_DIR;
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (err) {
  console.warn(
    `Could not use DATA_DIR "${DATA_DIR}" (${err.code}). ` +
    `Falling back to "${FALLBACK_DIR}". ` +
    `Attach a persistent disk at that path for data that survives redeploys.`
  );
  DATA_DIR = FALLBACK_DIR;
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_FILE = path.join(DATA_DIR, 'products.db.json');

// Admin credentials come from environment variables in production.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'peacefulnights2025';

/* ---------- Storage ---------- */
function readProducts() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')).products || [];
  } catch {
    return [];
  }
}

function writeProducts(products) {
  // Atomic write: write to a temp file, then rename into place.
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify({ products }, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// Seed the database from data/products.json the very first time,
// so the existing product isn't lost when you switch to the DB.
if (!fs.existsSync(DB_FILE)) {
  try {
    const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'products.json'), 'utf8'));
    writeProducts(seed.products || []);
    console.log(`Seeded ${(seed.products || []).length} product(s) from data/products.json`);
  } catch (err) {
    console.warn('No products to seed:', err.message);
    writeProducts([]);
  }
}

function upsertProduct(product) {
  const products = readProducts();
  // Only one product can be "featured" — clear the flag on the others.
  if (product.featured) {
    products.forEach((p) => { if (p.id !== product.id) p.featured = false; });
  }
  const idx = products.findIndex((p) => p.id === product.id);
  if (idx >= 0) {
    products[idx] = product;
  } else {
    products.push(product);
  }
  writeProducts(products);
}

function deleteProduct(id) {
  writeProducts(readProducts().filter((p) => p.id !== id));
}

/* ---------- Auth (simple bearer tokens, kept in memory) ---------- */
const tokens = new Map(); // token -> expiry timestamp
const TOKEN_TTL = 1000 * 60 * 60 * 8; // 8 hours

function issueToken() {
  const token = crypto.randomBytes(24).toString('hex');
  tokens.set(token, Date.now() + TOKEN_TTL);
  return token;
}

function isValidToken(token) {
  const expiry = tokens.get(token);
  if (!expiry) return false;
  if (expiry < Date.now()) {
    tokens.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!isValidToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — please sign in again.' });
  }
  next();
}

/* ---------- App ---------- */
const app = express();
// Product images are stored as base64 data URLs, so allow a large body.
app.use(express.json({ limit: '15mb' }));

// The public site reads this — now answered from the database.
app.get('/data/products.json', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ products: readProducts() });
});

// Admin login -> returns a token used for write requests.
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ token: issueToken() });
  }
  res.status(401).json({ error: 'Invalid username or password.' });
});

// List products (same data the public site gets).
app.get('/api/products', (req, res) => {
  res.json({ products: readProducts() });
});

// Create or update a product.
app.post('/api/products', requireAuth, (req, res) => {
  const product = req.body || {};
  if (!product.title || !String(product.title).trim()) {
    return res.status(400).json({ error: 'A product title is required.' });
  }
  if (!product.id) {
    product.id = 'product-' + crypto.randomBytes(4).toString('hex');
  }
  upsertProduct(product);
  res.json(product);
});

// Delete a product.
app.delete('/api/products/:id', requireAuth, (req, res) => {
  deleteProduct(req.params.id);
  res.status(204).end();
});

// Everything else: serve the static site files from the repo root.
app.use(express.static(ROOT, { extensions: ['html'] }));

app.listen(PORT, () => {
  console.log(`Peaceful Nights Guide running on http://localhost:${PORT}`);
});
