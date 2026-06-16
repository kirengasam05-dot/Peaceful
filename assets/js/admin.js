/* =========================================================
   Peaceful Nights Guide — admin.js
   Simple client-side admin: login, edit JSON, download updates.
   ========================================================= */

// Admin credentials now live on the SERVER (set ADMIN_USERNAME /
// ADMIN_PASSWORD as environment variables in Render). The browser
// no longer holds the password — it logs in against the API and
// receives a short-lived token.

const SESSION_KEY = 'pn-admin-session';
const STORAGE_PREFIX = 'pn-admin-data-';

function isAdminLoggedIn() {
  const s = localStorage.getItem(SESSION_KEY);
  if (!s) return false;
  try {
    const { expires, token } = JSON.parse(s);
    return !!token && expires > Date.now();
  } catch { return false; }
}

function getAdminToken() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY))?.token || null; }
  catch { return null; }
}

async function adminLogin(username, password) {
  try {
    const res = await fetch('../api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) return false;
    const { token } = await res.json();
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: username,
      token,
      expires: Date.now() + 1000 * 60 * 60 * 8 // 8 hours
    }));
    return true;
  } catch {
    return false; // server unreachable (e.g. opened without `npm start`)
  }
}

// Authenticated JSON request to the admin API. Redirects to login
// if the session has expired.
async function apiSend(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (getAdminToken() || '')
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) {
    showToast('Session expired — please sign in again');
    setTimeout(() => (location.href = 'login.html'), 1200);
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

function adminLogout() {
  localStorage.removeItem(SESSION_KEY);
  location.href = 'login.html';
}

function requireAdmin() {
  if (!isAdminLoggedIn()) {
    location.href = 'login.html';
    return false;
  }
  return true;
}

// ---- Data IO ----
async function fetchJSONData(name) {
  // Try localStorage first (live edits), then fetch from /data/
  const local = localStorage.getItem(STORAGE_PREFIX + name);
  if (local) {
    try { return JSON.parse(local); } catch {}
  }
  try {
    const res = await fetch(`../data/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return null;
  }
}

function saveJSONData(name, data) {
  localStorage.setItem(STORAGE_PREFIX + name, JSON.stringify(data));
  showToast(`${name}.json saved locally — click "Export" to download`);
}

function downloadJSON(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// Convert file (image / pdf / video) to data URL for in-browser preview/storage
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Slugify for blog post slugs
function slugify(s) {
  return String(s).toLowerCase().trim()
    .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
