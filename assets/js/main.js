/* =========================================================
   Peaceful Nights Guide — main.js
   Loads JSON data and renders the site dynamically.
   ========================================================= */

// Detect base path from this script's own location so the site
// works at root or in any subfolder.
const SCRIPT_EL = document.currentScript || document.querySelector('script[src*="main.js"]');
const BASE = SCRIPT_EL ? SCRIPT_EL.src.replace(/assets\/js\/main\.js.*$/, '') : './';

// ---------- Theme toggle ----------
(function initTheme() {
  const saved = localStorage.getItem('pn-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initial);

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.theme-toggle');
    if (!btn) return;
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('pn-theme', next);
  });
})();

// ---------- Mobile menu ----------
document.addEventListener('click', (e) => {
  if (e.target.closest('.menu-btn')) {
    document.querySelector('.mobile-menu')?.classList.toggle('open');
  }
  if (e.target.closest('.mobile-menu a')) {
    document.querySelector('.mobile-menu')?.classList.remove('open');
  }
});

// ---------- Data loaders ----------
async function loadJSON(relativePath) {
  try {
    const res = await fetch(`${BASE}${relativePath}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${relativePath}`);
    return await res.json();
  } catch (err) {
    console.error('Data load error:', err);
    return null;
  }
}

// ---------- Helpers ----------
function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Resolve a possibly-relative asset path against BASE.
function asset(path) {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path)) return path;
  if (path.startsWith('/')) return path;
  return `${BASE}${path}`;
}

function imageMarkup(path, alt) {
  const src = asset(path);
  if (path && path.endsWith('.svg')) {
    return `<object data="${src}" type="image/svg+xml" aria-label="${escapeHTML(alt)}" style="width:100%;height:100%;"></object>`;
  }
  return `<img src="${src}" alt="${escapeHTML(alt)}" loading="lazy">`;
}

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
  el.setAttribute('content', content);
}

// ---------- Render: config-driven pieces ----------
async function renderSiteConfig() {
  const cfg = await loadJSON('data/config.json');
  if (!cfg) return;

  if (cfg.seo?.metaTitle && document.title === 'Peaceful Nights Guide') document.title = cfg.seo.metaTitle;
  setMeta('description', cfg.seo?.metaDescription);
  setMeta('keywords', cfg.seo?.keywords);
  setMeta('og:title', cfg.seo?.metaTitle, 'property');
  setMeta('og:description', cfg.seo?.metaDescription, 'property');
  setMeta('og:type', 'website', 'property');

  const hero = document.querySelector('[data-hero]');
  if (hero && cfg.hero) {
    const eb = hero.querySelector('[data-hero-eyebrow]');
    if (eb) eb.textContent = cfg.hero.eyebrow;
    const hl = hero.querySelector('[data-hero-headline]');
    if (hl) hl.innerHTML = cfg.hero.headline.replace(/(possible|peaceful|calm)/gi, '<em>$1</em>');
    const sub = hero.querySelector('[data-hero-sub]');
    if (sub) sub.textContent = cfg.hero.subheadline;
    const primary = hero.querySelector('[data-hero-cta]');
    if (primary) { primary.textContent = cfg.hero.ctaText; primary.href = cfg.hero.ctaLink; }
    const secondary = hero.querySelector('[data-hero-cta-2]');
    if (secondary) { secondary.textContent = cfg.hero.secondaryCtaText; secondary.href = cfg.hero.secondaryCtaLink; }
  }

  const about = document.querySelector('[data-about]');
  if (about && cfg.about) {
    const h = about.querySelector('[data-about-headline]');
    if (h) h.textContent = cfg.about.headline;
    const b = about.querySelector('[data-about-body]');
    if (b) b.textContent = cfg.about.body;
  }

  const tWrap = document.querySelector('[data-testimonials]');
  if (tWrap && cfg.testimonials) {
    tWrap.innerHTML = cfg.testimonials.map(t => `
      <article class="testimonial">
        <div class="stars" aria-label="5 out of 5 stars">★★★★★</div>
        <p class="quote">${escapeHTML(t.quote)}</p>
        <div class="author">${escapeHTML(t.name)}</div>
        <div class="role">${escapeHTML(t.role)}</div>
      </article>
    `).join('');
  }

  const faq = document.querySelector('[data-faqs]');
  if (faq && cfg.faqs) {
    faq.innerHTML = cfg.faqs.map(f => `
      <details class="faq-item">
        <summary>${escapeHTML(f.question)}</summary>
        <div class="answer"><p>${escapeHTML(f.answer)}</p></div>
      </details>
    `).join('');
  }

  const emailForm = document.querySelector('[data-email-form]');
  if (emailForm && cfg.email) {
    emailForm.action = cfg.email.formAction;
    const eh = document.querySelector('[data-email-heading]');
    if (eh) eh.textContent = cfg.email.heading;
    const es = document.querySelector('[data-email-sub]');
    if (es) es.textContent = cfg.email.subheading;
  }

  renderSocials(cfg.social);

  document.querySelectorAll('[data-site-name]').forEach(el => el.textContent = cfg.site?.name || 'Peaceful Nights Guide');
  document.querySelectorAll('[data-site-tagline]').forEach(el => el.textContent = cfg.site?.tagline || '');
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
}

function renderSocials(social = {}) {
  const icons = {
    tiktok: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.26z"/></svg>',
    twitter: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    instagram: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    facebook: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/></svg>',
    youtube: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
  };
  document.querySelectorAll('[data-socials]').forEach(wrap => {
    wrap.innerHTML = Object.entries(icons).map(([key, svg]) => {
      const url = social[key];
      if (!url) return '';
      return `<a href="${url}" target="_blank" rel="noopener" aria-label="${key}">${svg}</a>`;
    }).join('');
  });
}

// ---------- Render: products ----------
async function renderProducts() {
  const data = await loadJSON('data/products.json');
  if (!data?.products) return;

  const featuredHost = document.querySelector('[data-featured-product]');
  if (featuredHost) {
    const featured = data.products.find(p => p.featured) || data.products[0];
    if (featured) {
      featuredHost.innerHTML = `
        <div class="image">${imageMarkup(featured.image, featured.title)}</div>
        <div>
          <span class="eyebrow">Featured guide</span>
          <h2>${escapeHTML(featured.title)}</h2>
          <p>${escapeHTML(featured.description)}</p>
          <ul>${(featured.bullets || []).map(b => `<li>${escapeHTML(b)}</li>`).join('')}</ul>
          <div class="price-row">
            <span class="price">${escapeHTML(featured.price)}</span>
            <span class="price-note">Instant PDF download</span>
          </div>
          <div class="actions" style="display:flex;gap:10px;flex-wrap:wrap;">
            <a class="btn btn-accent btn-lg" href="${escapeHTML(featured.gumroadUrl)}" target="_blank" rel="noopener">Buy now</a>
            <a class="btn btn-ghost btn-lg" href="${BASE}pages/product.html?id=${encodeURIComponent(featured.id)}">Read more</a>
          </div>
        </div>
      `;
    }
  }

  const grid = document.querySelector('[data-products-grid]');
  if (grid) {
    grid.innerHTML = data.products.map(p => `
      <article class="product-card">
        <div class="product-image">${imageMarkup(p.image, p.title)}</div>
        <h3>${escapeHTML(p.title)}</h3>
        <p class="tagline">${escapeHTML(p.tagline)}</p>
        <div class="price">${escapeHTML(p.price)}</div>
        <div class="actions">
          <a class="btn btn-accent" href="${escapeHTML(p.gumroadUrl)}" target="_blank" rel="noopener">Buy now</a>
          <a class="btn btn-ghost" href="${BASE}pages/product.html?id=${encodeURIComponent(p.id)}">Details</a>
        </div>
      </article>
    `).join('');
  }

  const single = document.querySelector('[data-product-single]');
  if (single) {
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const product = data.products.find(p => p.id === id) || data.products[0];
    if (product) {
      document.title = product.seo?.metaTitle || `${product.title} — Peaceful Nights Guide`;
      setMeta('description', product.seo?.metaDescription || product.tagline);
      single.innerHTML = `
        <div class="image">${imageMarkup(product.image, product.title)}</div>
        <div>
          <span class="eyebrow">Digital guide</span>
          <h1>${escapeHTML(product.title)}</h1>
          <p class="lede">${escapeHTML(product.tagline)}</p>
          <p>${escapeHTML(product.description)}</p>
          <ul>${(product.bullets || []).map(b => `<li>${escapeHTML(b)}</li>`).join('')}</ul>
          <div class="price-row">
            <span class="price">${escapeHTML(product.price)}</span>
            <span class="price-note">Instant PDF download via Gumroad</span>
          </div>
          <div class="actions" style="display:flex;gap:10px;flex-wrap:wrap;">
            <a class="btn btn-accent btn-lg" href="${escapeHTML(product.gumroadUrl)}" target="_blank" rel="noopener">Buy now</a>
            <a class="btn btn-ghost btn-lg" href="${BASE}index.html">Back to home</a>
          </div>
        </div>
      `;
    }
  }
}

// ---------- Render: blog ----------
async function renderBlog() {
  const data = await loadJSON('data/blog.json');
  if (!data?.posts) return;

  const index = document.querySelector('[data-blog-index]');
  if (index) {
    const sorted = [...data.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
    index.innerHTML = sorted.map(p => `
      <a class="blog-card" href="${BASE}blog/post.html?slug=${encodeURIComponent(p.slug)}">
        <div class="image">${imageMarkup(p.image, p.title)}</div>
        <div class="body">
          <div class="meta">${formatDate(p.date)} · ${(p.tags || []).join(' · ')}</div>
          <h3>${escapeHTML(p.title)}</h3>
          <p>${escapeHTML(p.excerpt)}</p>
          <div class="read">Read article →</div>
        </div>
      </a>
    `).join('');
  }

  const teaser = document.querySelector('[data-blog-teaser]');
  if (teaser) {
    const top = [...data.posts].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    teaser.innerHTML = top.map(p => `
      <a class="blog-card" href="${BASE}blog/post.html?slug=${encodeURIComponent(p.slug)}">
        <div class="image">${imageMarkup(p.image, p.title)}</div>
        <div class="body">
          <div class="meta">${formatDate(p.date)}</div>
          <h3>${escapeHTML(p.title)}</h3>
          <p>${escapeHTML(p.excerpt)}</p>
          <div class="read">Read article →</div>
        </div>
      </a>
    `).join('');
  }

  const single = document.querySelector('[data-blog-single]');
  if (single) {
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const post = data.posts.find(p => p.slug === slug) || data.posts[0];
    if (post) {
      document.title = `${post.title} — Peaceful Nights Guide`;
      setMeta('description', post.excerpt);
      single.innerHTML = `
        <div class="meta">${formatDate(post.date)} · ${escapeHTML(post.author || '')}</div>
        <h1>${escapeHTML(post.title)}</h1>
        <p class="lede">${escapeHTML(post.excerpt)}</p>
        <div class="post-image">${imageMarkup(post.image, post.title)}</div>
        <div class="post-body">${post.content}</div>
        <div class="center" style="margin-top:48px;">
          <a href="${BASE}blog.html" class="btn btn-ghost">← All articles</a>
        </div>
      `;
    }
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', () => {
  renderSiteConfig();
  renderProducts();
  renderBlog();
});
