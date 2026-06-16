/* =========================================================
   Peaceful Nights Guide — admin-ui.js
   Wires the dashboard.html UI to data IO.
   ========================================================= */

if (!requireAdmin()) {
  // Stop — requireAdmin already redirected
} else {
  // Double-check the token with the server before showing the dashboard.
  // If it's stale, clear it and go to login (prevents redirect loops).
  verifyAdminSession().then((ok) => {
    if (!ok) {
      clearAdminSession();
      location.href = 'login.html';
    } else {
      initAdminUI();
    }
  });
}

function initAdminUI() {
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    adminLogout();
  });

  // Tab switching
  document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = link.getAttribute('data-tab');
      document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => p.style.display = 'none');
      const panel = document.querySelector(`[data-panel="${tab}"]`);
      if (panel) panel.style.display = 'block';
    });
  });

  initProductsUI();
  initBlogUI();
  initSettingsUI();
  initMediaUI();
  initExportUI();
}

/* ---------- PRODUCTS ---------- */
let _products = null;
let _editingProductIdx = -1;

async function loadProductsFromServer() {
  try {
    const res = await fetch('../data/products.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return { products: data.products || [] };
    }
  } catch {}
  return { products: [] };
}

async function initProductsUI() {
  _products = await loadProductsFromServer();
  renderProductsList();

  document.getElementById('add-product').addEventListener('click', () => openProductEditor(-1));
  document.getElementById('cancel-product').addEventListener('click', closeProductEditor);
  document.getElementById('save-product').addEventListener('click', saveProductFromForm);
  document.getElementById('export-products').addEventListener('click', () => downloadJSON('products', _products));

  document.getElementById('p-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataURL = await fileToDataURL(file);
    document.getElementById('p-image').value = dataURL;
    document.getElementById('p-image-preview').innerHTML = `<img src="${dataURL}" style="max-width:100%;border-radius:8px;">`;
  });
}

function renderProductsList() {
  const host = document.getElementById('products-list');
  if (!_products.products.length) {
    host.innerHTML = '<p class="muted">No products yet. Click "+ New product" to add your first guide.</p>';
    return;
  }
  host.innerHTML = _products.products.map((p, i) => `
    <div class="row">
      <div class="name">
        <strong>${p.title || 'Untitled'}</strong>
        <small>${p.price || '—'} · ${p.featured ? '⭐ Featured · ' : ''}<a href="${p.gumroadUrl}" target="_blank">Gumroad link</a></small>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openProductEditor(${i})">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deleteProduct(${i})">Delete</button>
    </div>
  `).join('');
}

function openProductEditor(idx) {
  _editingProductIdx = idx;
  const p = idx >= 0 ? _products.products[idx] : {
    id: uid('product'), title: '', tagline: '', description: '',
    bullets: [], price: '', image: 'assets/images/product-1.svg', gumroadUrl: '',
    seo: { metaTitle: '', metaDescription: '' }, featured: false
  };
  document.getElementById('p-title').value = p.title || '';
  document.getElementById('p-tagline').value = p.tagline || '';
  document.getElementById('p-description').value = p.description || '';
  document.getElementById('p-bullets').value = (p.bullets || []).join('\n');
  document.getElementById('p-price').value = p.price || '';
  document.getElementById('p-gumroad').value = p.gumroadUrl || '';
  document.getElementById('p-image').value = p.image || '';
  document.getElementById('p-meta-title').value = p.seo?.metaTitle || '';
  document.getElementById('p-meta-description').value = p.seo?.metaDescription || '';
  document.getElementById('p-featured').checked = !!p.featured;
  const preview = document.getElementById('p-image-preview');
  preview.innerHTML = p.image ? `<img src="${p.image.startsWith('data:') ? p.image : '../' + p.image}" style="max-width:100%;border-radius:8px;" onerror="this.style.display='none'">` : '';
  document.getElementById('product-editor').style.display = 'block';
  document.getElementById('product-editor').scrollIntoView({ behavior: 'smooth' });
}

function closeProductEditor() {
  document.getElementById('product-editor').style.display = 'none';
  _editingProductIdx = -1;
}

async function saveProductFromForm() {
  const title = document.getElementById('p-title').value.trim();
  if (!title) { alert('Please enter a title'); return; }
  const product = {
    id: _editingProductIdx >= 0 ? _products.products[_editingProductIdx].id : uid('product'),
    title,
    tagline: document.getElementById('p-tagline').value.trim(),
    description: document.getElementById('p-description').value.trim(),
    bullets: document.getElementById('p-bullets').value.split('\n').map(s => s.trim()).filter(Boolean),
    price: document.getElementById('p-price').value.trim(),
    image: document.getElementById('p-image').value.trim(),
    gumroadUrl: document.getElementById('p-gumroad').value.trim(),
    pageSlug: slugify(title),
    featured: document.getElementById('p-featured').checked,
    seo: {
      metaTitle: document.getElementById('p-meta-title').value.trim(),
      metaDescription: document.getElementById('p-meta-description').value.trim()
    }
  };

  const saveBtn = document.getElementById('save-product');
  saveBtn.disabled = true;
  try {
    await apiSend('POST', '../api/products', product);
    _products = await loadProductsFromServer(); // refresh from the database
    renderProductsList();
    closeProductEditor();
    showToast('Product saved — it is now live on your site');
  } catch (err) {
    if (err.message !== 'unauthorized') alert('Could not save: ' + err.message);
  } finally {
    saveBtn.disabled = false;
  }
}

async function deleteProduct(idx) {
  if (!confirm('Delete this product?')) return;
  const product = _products.products[idx];
  try {
    await apiSend('DELETE', '../api/products/' + encodeURIComponent(product.id));
    _products = await loadProductsFromServer();
    renderProductsList();
    showToast('Product deleted');
  } catch (err) {
    if (err.message !== 'unauthorized') alert('Could not delete: ' + err.message);
  }
}

/* ---------- BLOG ---------- */
let _blog = null;
let _editingPostIdx = -1;

async function initBlogUI() {
  _blog = await fetchJSONData('blog') || { posts: [] };
  renderBlogList();

  document.getElementById('add-post').addEventListener('click', () => openPostEditor(-1));
  document.getElementById('cancel-post').addEventListener('click', closePostEditor);
  document.getElementById('save-post').addEventListener('click', savePostFromForm);
  document.getElementById('export-blog').addEventListener('click', () => downloadJSON('blog', _blog));

  document.getElementById('b-image-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const dataURL = await fileToDataURL(file);
    document.getElementById('b-image').value = dataURL;
    document.getElementById('b-image-preview').innerHTML = `<img src="${dataURL}" style="max-width:100%;border-radius:8px;">`;
  });
}

function renderBlogList() {
  const host = document.getElementById('blog-list');
  if (!_blog.posts.length) {
    host.innerHTML = '<p class="muted">No posts yet. Click "+ New post" to write your first article.</p>';
    return;
  }
  host.innerHTML = _blog.posts.map((p, i) => `
    <div class="row">
      <div class="name">
        <strong>${p.title}</strong>
        <small>${p.date} · ${(p.tags || []).join(', ')}</small>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openPostEditor(${i})">Edit</button>
      <button class="btn btn-danger btn-sm" onclick="deletePost(${i})">Delete</button>
    </div>
  `).join('');
}

function openPostEditor(idx) {
  _editingPostIdx = idx;
  const today = new Date().toISOString().slice(0, 10);
  const p = idx >= 0 ? _blog.posts[idx] : {
    id: uid('post'), title: '', slug: '', excerpt: '',
    date: today, author: 'Peaceful Nights Guide',
    image: 'assets/images/blog-1.svg', tags: [], content: '<p></p>'
  };
  document.getElementById('b-title').value = p.title || '';
  document.getElementById('b-excerpt').value = p.excerpt || '';
  document.getElementById('b-date').value = p.date || today;
  document.getElementById('b-author').value = p.author || '';
  document.getElementById('b-tags').value = (p.tags || []).join(', ');
  document.getElementById('b-image').value = p.image || '';
  document.getElementById('b-content').value = p.content || '';
  const preview = document.getElementById('b-image-preview');
  preview.innerHTML = p.image ? `<img src="${p.image.startsWith('data:') ? p.image : '../' + p.image}" style="max-width:100%;border-radius:8px;" onerror="this.style.display='none'">` : '';
  document.getElementById('post-editor').style.display = 'block';
  document.getElementById('post-editor').scrollIntoView({ behavior: 'smooth' });
}

function closePostEditor() {
  document.getElementById('post-editor').style.display = 'none';
  _editingPostIdx = -1;
}

function savePostFromForm() {
  const title = document.getElementById('b-title').value.trim();
  if (!title) { alert('Please enter a title'); return; }
  const post = {
    id: _editingPostIdx >= 0 ? _blog.posts[_editingPostIdx].id : uid('post'),
    title,
    slug: slugify(title),
    excerpt: document.getElementById('b-excerpt').value.trim(),
    date: document.getElementById('b-date').value,
    author: document.getElementById('b-author').value.trim(),
    image: document.getElementById('b-image').value.trim(),
    tags: document.getElementById('b-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    content: document.getElementById('b-content').value
  };
  if (_editingPostIdx >= 0) {
    _blog.posts[_editingPostIdx] = post;
  } else {
    _blog.posts.push(post);
  }
  saveJSONData('blog', _blog);
  renderBlogList();
  closePostEditor();
}

function deletePost(idx) {
  if (!confirm('Delete this post?')) return;
  _blog.posts.splice(idx, 1);
  saveJSONData('blog', _blog);
  renderBlogList();
}

/* ---------- SETTINGS ---------- */
let _config = null;

async function initSettingsUI() {
  _config = await fetchJSONData('config') || {};
  fillSettingsForm();

  document.getElementById('save-settings').addEventListener('click', saveSettingsFromForm);
  document.getElementById('export-settings').addEventListener('click', () => downloadJSON('config', _config));
  document.getElementById('add-testimonial').addEventListener('click', () => {
    _config.testimonials = _config.testimonials || [];
    _config.testimonials.push({ name: '', role: '', quote: '' });
    renderTestimonialsEditor();
  });
  document.getElementById('add-faq').addEventListener('click', () => {
    _config.faqs = _config.faqs || [];
    _config.faqs.push({ question: '', answer: '' });
    renderFAQsEditor();
  });
}

function fillSettingsForm() {
  const c = _config;
  document.getElementById('s-hero-eyebrow').value = c.hero?.eyebrow || '';
  document.getElementById('s-hero-headline').value = c.hero?.headline || '';
  document.getElementById('s-hero-sub').value = c.hero?.subheadline || '';
  document.getElementById('s-hero-cta').value = c.hero?.ctaText || '';
  document.getElementById('s-hero-cta-link').value = c.hero?.ctaLink || '';

  document.getElementById('s-about-headline').value = c.about?.headline || '';
  document.getElementById('s-about-body').value = c.about?.body || '';

  document.getElementById('s-social-tiktok').value = c.social?.tiktok || '';
  document.getElementById('s-social-twitter').value = c.social?.twitter || '';
  document.getElementById('s-social-instagram').value = c.social?.instagram || '';
  document.getElementById('s-social-facebook').value = c.social?.facebook || '';
  document.getElementById('s-social-youtube').value = c.social?.youtube || '';

  document.getElementById('s-email-heading').value = c.email?.heading || '';
  document.getElementById('s-email-sub').value = c.email?.subheading || '';
  document.getElementById('s-email-action').value = c.email?.formAction || '';

  document.getElementById('s-seo-title').value = c.seo?.metaTitle || '';
  document.getElementById('s-seo-desc').value = c.seo?.metaDescription || '';
  document.getElementById('s-seo-keywords').value = c.seo?.keywords || '';

  renderTestimonialsEditor();
  renderFAQsEditor();
}

function renderTestimonialsEditor() {
  const host = document.getElementById('s-testimonials');
  host.innerHTML = (_config.testimonials || []).map((t, i) => `
    <div class="admin-card" style="background: var(--bg-soft);">
      <div class="field"><label>Name</label><input type="text" data-tn="${i}" value="${escapeAttr(t.name)}"></div>
      <div class="field"><label>Role</label><input type="text" data-tr="${i}" value="${escapeAttr(t.role)}"></div>
      <div class="field"><label>Quote</label><textarea data-tq="${i}">${escapeHTML2(t.quote)}</textarea></div>
      <button class="btn btn-danger btn-sm" onclick="removeTestimonial(${i})">Remove</button>
    </div>
  `).join('');
}

function removeTestimonial(i) {
  _config.testimonials.splice(i, 1);
  renderTestimonialsEditor();
}

function renderFAQsEditor() {
  const host = document.getElementById('s-faqs');
  host.innerHTML = (_config.faqs || []).map((f, i) => `
    <div class="admin-card" style="background: var(--bg-soft);">
      <div class="field"><label>Question</label><input type="text" data-fq="${i}" value="${escapeAttr(f.question)}"></div>
      <div class="field"><label>Answer</label><textarea data-fa="${i}">${escapeHTML2(f.answer)}</textarea></div>
      <button class="btn btn-danger btn-sm" onclick="removeFAQ(${i})">Remove</button>
    </div>
  `).join('');
}

function removeFAQ(i) {
  _config.faqs.splice(i, 1);
  renderFAQsEditor();
}

function escapeAttr(s = '') {
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
function escapeHTML2(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function saveSettingsFromForm() {
  _config.hero = _config.hero || {};
  _config.hero.eyebrow = document.getElementById('s-hero-eyebrow').value;
  _config.hero.headline = document.getElementById('s-hero-headline').value;
  _config.hero.subheadline = document.getElementById('s-hero-sub').value;
  _config.hero.ctaText = document.getElementById('s-hero-cta').value;
  _config.hero.ctaLink = document.getElementById('s-hero-cta-link').value;

  _config.about = _config.about || {};
  _config.about.headline = document.getElementById('s-about-headline').value;
  _config.about.body = document.getElementById('s-about-body').value;

  _config.social = {
    tiktok: document.getElementById('s-social-tiktok').value,
    twitter: document.getElementById('s-social-twitter').value,
    instagram: document.getElementById('s-social-instagram').value,
    facebook: document.getElementById('s-social-facebook').value,
    youtube: document.getElementById('s-social-youtube').value
  };

  _config.email = _config.email || {};
  _config.email.heading = document.getElementById('s-email-heading').value;
  _config.email.subheading = document.getElementById('s-email-sub').value;
  _config.email.formAction = document.getElementById('s-email-action').value;

  _config.seo = _config.seo || {};
  _config.seo.metaTitle = document.getElementById('s-seo-title').value;
  _config.seo.metaDescription = document.getElementById('s-seo-desc').value;
  _config.seo.keywords = document.getElementById('s-seo-keywords').value;

  // Save testimonials
  _config.testimonials = (_config.testimonials || []).map((t, i) => ({
    name: document.querySelector(`[data-tn="${i}"]`)?.value || '',
    role: document.querySelector(`[data-tr="${i}"]`)?.value || '',
    quote: document.querySelector(`[data-tq="${i}"]`)?.value || ''
  }));

  // Save FAQs
  _config.faqs = (_config.faqs || []).map((f, i) => ({
    question: document.querySelector(`[data-fq="${i}"]`)?.value || '',
    answer: document.querySelector(`[data-fa="${i}"]`)?.value || ''
  }));

  saveJSONData('config', _config);
}

/* ---------- MEDIA ---------- */
function initMediaUI() {
  document.getElementById('process-media').addEventListener('click', async () => {
    const fileInput = document.getElementById('media-file');
    const file = fileInput.files[0];
    if (!file) { alert('Pick a file first'); return; }

    // Download a copy with a clean filename (slugified)
    const ext = file.name.split('.').pop();
    const base = slugify(file.name.replace(/\.[^.]+$/, ''));
    const cleanName = `${base}.${ext}`;

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = cleanName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    const dataURL = await fileToDataURL(file);
    let previewHTML = '';
    if (file.type.startsWith('image/')) {
      previewHTML = `<img src="${dataURL}" style="max-width: 320px; border-radius: 8px;"><p class="muted" style="margin-top:8px;">Path to use: <code>assets/images/${cleanName}</code></p>`;
    } else if (file.type.startsWith('video/')) {
      previewHTML = `<video src="${dataURL}" controls style="max-width:320px;border-radius:8px;"></video><p class="muted" style="margin-top:8px;">Path to use: <code>assets/files/${cleanName}</code></p>`;
    } else if (file.type === 'application/pdf') {
      previewHTML = `<p>PDF ready: <strong>${cleanName}</strong></p><p class="muted">Path to use: <code>assets/files/${cleanName}</code></p>`;
    }
    document.getElementById('media-preview').innerHTML = previewHTML;
    showToast(`Downloaded as ${cleanName}`);
  });
}

/* ---------- EXPORT TAB ---------- */
function initExportUI() {
  document.getElementById('export-all-products').addEventListener('click', async () => {
    const data = await fetchJSONData('products');
    if (data) downloadJSON('products', data);
  });
  document.getElementById('export-all-blog').addEventListener('click', async () => {
    const data = await fetchJSONData('blog');
    if (data) downloadJSON('blog', data);
  });
  document.getElementById('export-all-config').addEventListener('click', async () => {
    const data = await fetchJSONData('config');
    if (data) downloadJSON('config', data);
  });
  document.getElementById('reset-local').addEventListener('click', () => {
    if (!confirm('Discard all unsaved local edits? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_PREFIX + 'products');
    localStorage.removeItem(STORAGE_PREFIX + 'blog');
    localStorage.removeItem(STORAGE_PREFIX + 'config');
    location.reload();
  });
}
