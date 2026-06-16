# Peaceful Nights Guide — Website

A complete, professional website for selling digital parenting guides. Built with plain HTML, CSS, and JavaScript so it loads fast, costs nothing to host, and you can edit everything from a built-in admin panel.

---

## Table of contents

1. [What's inside](#whats-inside)
2. [Preview the site on your computer](#preview-the-site-on-your-computer)
3. [Deploy it to the internet (free)](#deploy-it-to-the-internet-free)
4. [Connect your custom domain](#connect-your-custom-domain)
5. [Using the admin panel](#using-the-admin-panel)
6. [How the "save" flow works (important)](#how-the-save-flow-works-important)
7. [Changing the admin password](#changing-the-admin-password)
8. [Connecting Mailchimp or ConvertKit](#connecting-mailchimp-or-convertkit)
9. [Adding new products](#adding-new-products)
10. [Writing new blog posts](#writing-new-blog-posts)
11. [SEO checklist](#seo-checklist)
12. [Optional upgrade: true cloud admin (Decap CMS)](#optional-upgrade-true-cloud-admin)
13. [Troubleshooting](#troubleshooting)

---

## What's inside

```
peaceful-nights-guide/
├── index.html              ← Homepage
├── blog.html               ← Blog index
├── pages/product.html      ← Product page template (one file serves every product)
├── blog/post.html          ← Blog post template (one file serves every post)
├── admin/                  ← Your private admin panel
│   ├── login.html
│   └── dashboard.html
├── assets/
│   ├── css/style.css       ← All the styling
│   ├── js/                 ← Site + admin JavaScript
│   ├── images/             ← Logos, product images, blog images
│   └── files/              ← PDFs and videos you upload
├── data/
│   ├── products.json       ← All your products live here
│   ├── blog.json           ← All your blog posts live here
│   └── config.json         ← Site settings, social links, FAQs, testimonials
├── robots.txt
├── sitemap.xml
└── README.md               ← This file
```

The three files in `data/` are the **heart of the site**. The admin panel edits them. The site reads them. If you ever need to change something and the admin panel can't reach it, you can open those JSON files in any text editor.

---

## Preview the site on your computer

You **cannot** just double-click `index.html` — the browser blocks JSON files from loading that way. You need a small local server. Two easy options:

### Option A — VS Code (recommended for you)

1. Open the project folder in VS Code.
2. Install the extension **Live Server** (by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.
4. Your site opens in the browser at something like `http://127.0.0.1:5500`.

### Option B — Command line

If you have Python installed (most Macs do):

```bash
cd peaceful-nights-guide
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

Or if you have Node.js:

```bash
npx serve peaceful-nights-guide
```

---

## Deploy it to the internet (free)

You don't need WordPress hosting. Pick one:

### Netlify (easiest — drag and drop)

1. Go to **netlify.com** and create a free account.
2. On your dashboard, find the area that says **"Drag and drop your site folder here"**.
3. Drag the entire `peaceful-nights-guide` folder onto it.
4. Done. Netlify gives you a URL like `peaceful-nights-guide-abc.netlify.app` instantly.

To update later: drag the folder again, or use Netlify Drop.

### Vercel

1. Sign up at **vercel.com**.
2. Click **Add New → Project**, then **Import** or upload the folder.
3. Vercel deploys it automatically.

### GitHub Pages

1. Create a repo on GitHub, upload all the files.
2. Settings → Pages → Source: `main` branch, `/ (root)`.
3. Your site goes live at `username.github.io/repo-name`.

**My recommendation: Netlify.** Easiest, fastest, free, and supports custom domains in two clicks.

---

## Connect your custom domain

Say you've bought `peacefulnightsguide.com` from Namecheap, GoDaddy, or Google Domains.

### On Netlify

1. Netlify dashboard → your site → **Domain settings** → **Add custom domain**.
2. Enter `peacefulnightsguide.com` and click Verify.
3. Netlify shows you DNS records to add. Two common setups:
   - **Easiest:** point your domain's nameservers to Netlify's (Netlify shows you them).
   - **Or:** add an `A` record pointing `@` to Netlify's IP, plus a `CNAME` for `www`.
4. Wait 5–60 minutes for DNS to propagate.
5. Netlify auto-issues a free SSL certificate. Your site is now `https://peacefulnightsguide.com`.

### On Vercel

Same flow — Vercel dashboard → Domains → Add → follow the DNS instructions.

---

## Using the admin panel

Open `/admin/login.html` on your site (e.g. `https://peacefulnightsguide.com/admin/login.html`).

**Default login:**
- Username: `admin`
- Password: `peacefulnights2025`

**⚠️ Change the password before going live.** See [Changing the admin password](#changing-the-admin-password).

Once logged in, you'll see tabs:

- **Products** — add, edit, delete products. Each product has a title, price, image, Gumroad link, short description, and full description (with bullet features).
- **Blog** — write new posts. Each post has a title, slug (URL), cover image, excerpt, and full content. Content supports HTML for headings, paragraphs, lists.
- **Settings** — edit social links, site title, hero text, about section, testimonials, FAQs, and the email form action URL.

---

## How the "save" flow works (important)

This is a static site, so the admin panel can't write to your server directly. Instead it works like this:

1. You edit things in the admin panel. Your changes are **previewed instantly** and saved to your browser's local storage.
2. When you're ready to publish, click **Export JSON** at the top of each tab.
3. Your browser downloads `products.json`, `blog.json`, or `config.json`.
4. Replace the file inside `peaceful-nights-guide/data/` with the downloaded one.
5. Re-upload the project to Netlify (drag and drop again). Your changes are now live for everyone.

**Image uploads** work the same way: when you upload an image in the admin, it downloads a copy with a clean filename. Drop that file into `assets/images/` before re-uploading the site.

**PDFs and videos** behave identically: they download with a clean filename so you can place them into `assets/files/` and reference them in your products or posts.

If you'd rather edit and publish in one click from a cloud dashboard, see [Optional upgrade: Decap CMS](#optional-upgrade-true-cloud-admin) at the bottom.

---

## Changing the admin password

1. Open `assets/js/admin.js` in VS Code.
2. Near the top, find:
   ```js
   const ADMIN_USERNAME = 'admin';
   const ADMIN_PASSWORD = 'peacefulnights2025';
   ```
3. Change `'peacefulnights2025'` to a strong password of your choice. Keep the quotes.
4. Save the file. Re-upload the project to Netlify.

**Note:** This is light protection — it stops casual visitors but isn't bank-grade security. The admin panel never exposes anything sensitive (no payments, no customer data — Gumroad handles all of that). If you want stronger protection, put the `/admin/` folder behind Netlify Identity (free, takes 10 minutes — see Netlify docs).

---

## Connecting Mailchimp or ConvertKit

The "Get Free Parenting Tips" signup form needs an **action URL** from your email provider.

### Mailchimp

1. In Mailchimp, go to **Audience → Signup forms → Embedded forms**.
2. Copy the form HTML and look for `action="https://..."` — that's your URL.
3. Open the admin panel → **Settings** tab → **Email form action URL** field.
4. Paste your URL. Click **Save** and **Export config.json**.
5. Replace `data/config.json` and re-upload.

### ConvertKit

1. In ConvertKit, create a **Form**, then click **Embed**.
2. Choose the **HTML** option and copy the `action="..."` URL.
3. Same as above — paste it in admin Settings.

---

## Adding new products

1. Admin panel → **Products** tab → **+ New product**.
2. Fill in:
   - **Title** (e.g. "The Toddler Bedtime Bundle")
   - **Slug** (auto-fills — this becomes the URL, e.g. `toddler-bedtime-bundle`)
   - **Price** (e.g. `12.99`)
   - **Short description** (1–2 lines, shows on the homepage card)
   - **Full description** (longer, shows on the product page — HTML allowed)
   - **Features** (one per line — appear as a bulleted list)
   - **Image** (upload from your computer)
   - **Gumroad URL** — paste the full link from Gumroad (e.g. `https://peacefulnightsguide.gumroad.com/l/abc123`)
3. Click **Save**.
4. Click **Export products.json** at the top.
5. Replace `data/products.json`, drop the new image into `assets/images/`, re-upload the site.

Your product is now live at `/pages/product.html?id=your-slug`. You can share that link anywhere.

---

## Writing new blog posts

1. Admin panel → **Blog** tab → **+ New post**.
2. Fill in title, slug, excerpt, cover image, and the full post content.
3. Content supports basic HTML:
   ```html
   <h2>A section heading</h2>
   <p>A paragraph.</p>
   <ul>
     <li>A bullet</li>
     <li>Another bullet</li>
   </ul>
   <p><strong>Bold text</strong> and <em>italic</em>.</p>
   ```
4. Save → Export blog.json → replace the file → re-upload.

---

## SEO checklist

The site is already set up for parenting and sleep keywords. To rank well:

- ✅ Page titles and meta descriptions are pulled from your product titles and the config — keep them descriptive (include words like "baby sleep", "toddler", "bedtime").
- ✅ `sitemap.xml` and `robots.txt` are included — submit your sitemap in **Google Search Console** once your domain is live.
- ✅ Images use descriptive `alt` text — when you upload a product image, give it a clear name like `baby-sleep-guide-cover.png` rather than `IMG_3429.png`.
- ✅ Blog post slugs use keywords (e.g. `how-to-help-baby-sleep-faster`).
- ✅ All pages are mobile-friendly and fast — Google rewards both.
- 📌 **Do this after launch:** verify your domain in [Google Search Console](https://search.google.com/search-console), submit your sitemap, and check there are no indexing errors.

---

## Optional upgrade: true cloud admin

If editing → exporting → re-uploading feels clunky, you can upgrade to **Decap CMS** (free, open-source). It gives you a true cloud admin panel that commits changes directly to your hosted site — no exporting, no re-uploading.

Rough steps:
1. Put your site on GitHub.
2. Deploy via Netlify connected to GitHub.
3. Add a `/admin/config.yml` file pointing Decap at your JSON files.
4. Enable Netlify Identity (free).

There's a great walkthrough at [decapcms.org](https://decapcms.org/docs/intro/). If you want, I can wire this up for you in a follow-up — it takes about 30 minutes.

---

## Troubleshooting

**The site looks broken when I open `index.html` directly.**
You need a local server. See [Preview the site on your computer](#preview-the-site-on-your-computer).

**I uploaded to Netlify but the admin panel says "couldn't load data".**
Make sure the `data/` folder uploaded with the rest. Open `your-site.netlify.app/data/products.json` in your browser — if it's missing, re-upload.

**I edited something in admin and don't see it on the public site.**
Your edits live in your browser only until you **Export → replace the JSON file → re-upload**. The public site reads from the JSON files on the server, not from your browser.

**The Gumroad button doesn't open Gumroad.**
Check the product's Gumroad URL in admin. It should start with `https://` and be the full link, not just the product ID.

**Dark mode toggle doesn't remember my choice on other devices.**
That's expected — dark mode preference is per-device (stored in each browser).

---

Questions? Stuck? You can always open the JSON files directly in VS Code — they're plain text. The structure is obvious once you peek inside.

Good luck with the launch 🌙
