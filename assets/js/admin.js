/* =========================================================
   Peaceful Nights Guide — admin.js
   Simple client-side admin: login, edit JSON, download updates.
   ========================================================= */

// ---- CHANGE THESE CREDENTIALS ----
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'peacefulnights2025'; // change after first login!
// ----------------------------------

const SESSION_KEY = 'pn-admin-session';
const STORAGE_PREFIX = 'pn-admin-data-';

function isAdminLoggedIn() {
  const s = localStorage.getItem(SESSION_KEY);
  if (!s) return false;
  try {
    const { expires } = JSON.parse(s);
    return expires > Date.now();
  } catch { return false; }
}

function adminLogin(username, password) {
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      user: username,
      expires: Date.now() + 1000 * 60 * 60 * 8 // 8 hours
    }));
    return true;
  }
  return false;
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
