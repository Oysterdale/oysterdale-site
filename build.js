/* Build script for Oysterdale Records
 * 1. Generate news pages from markdown
 * 2. Generate news index page
 * 3. Generate RSS feed
 * 4. Inject SEO metadata into all pages
 */

const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const yaml = require("js-yaml");

const ROOT = process.cwd();

const NEWSLETTER_SECTION = `
  <div class="page-content">
    <!-- NEWSLETTER SIGNUP -->
    <section id="newsletter-section" style="margin-top:3rem;padding-top:2rem;border-top:1px solid rgba(255,255,255,.1);">
      <h2>Join the Crew</h2>
      <p style="opacity:.7;margin-bottom:1.5rem;">Get weekly pearls delivered to your inbox. No spam, just groove.</p>

      <!-- Success message (hidden by default) -->
      <div id="newsletter-success" style="display:none;max-width:480px;text-align:center;background:rgba(107,76,122,0.3);border:1px solid rgba(155,123,184,0.5);border-radius:12px;padding:20px;">
        <div style="font-size:32px;margin-bottom:8px;">✅</div>
        <h3 style="margin:0 0 0.5rem;color:#fff;">Welcome to the crew!</h3>
        <p style="margin:0;opacity:0.9;">Thank you for joining the family. Watch your inbox for weekly pearls.</p>
      </div>

      <form id="newsletter-form" name="newsletter" method="POST" data-netlify="true" netlify-honeypot="bot-field" style="max-width:480px;display:flex;flex-direction:column;gap:16px;">
        <p style="display:none;">
          <label>Don't fill this out: <input name="bot-field"></label>
        </p>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label for="newsletter-name" style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.7;margin-left:16px;">Name</label>
          <input type="text" id="newsletter-name" name="name" placeholder="Your name" required style="width:100%;padding:12px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.05);color:#fff;font-size:14px;outline:none;">
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label for="newsletter-email" style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;opacity:0.7;margin-left:16px;">Email</label>
          <input type="email" id="newsletter-email" name="email" placeholder="your@email.com" required style="width:100%;padding:12px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.05);color:#fff;font-size:14px;outline:none;">
        </div>
        <button type="submit" style="padding:12px 24px;border-radius:999px;border:none;background:#fff;color:#000;font-weight:700;font-size:14px;cursor:pointer;transition:opacity .2s;margin-top:4px;">Subscribe</button>
      </form>
    </section>
  </div>
`;

const cfgPath = path.join(ROOT, "site.config.json");
const siteCfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, "utf8")) : {};
const siteUrl = (siteCfg.siteUrl || "https://oysterdalerecords.com").replace(/\/$/, "");

// Ensure directories exist
const NEWS_DIR = path.join(ROOT, "content", "news");
const NEWS_BUILD_DIR = path.join(ROOT, "news");
const UPLOADS_DIR = path.join(ROOT, "uploads", "news");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.error("Invalid JSON:", p, e.message); return null; }
}

function readMarkdown(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, "utf8");

  // Parse frontmatter
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  try {
    const frontmatter = yaml.load(match[1]);
    const body = match[2].trim();
    return { frontmatter, body };
  } catch (e) {
    console.error("Invalid frontmatter in:", filePath, e.message);
    return null;
  }
}

function toAbsolute(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return siteUrl + url;
  return siteUrl + "/" + url;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");
}

// Simple markdown to HTML converter
function markdownToHTML(md) {
  const hrRegex = /^(?:---|\*\*\*|___)\s*$/gim;

  // Split by horizontal rules
  const parts = md.split(hrRegex);
  const hrs = md.match(hrRegex) || [];

  let result = "";

  parts.forEach((part, i) => {
    const trimmed = part.trim();
    if (!trimmed) return;

    // If the entire part looks like a single HTML block, pass it through raw
    const isHTMLBlock =
      /^<([a-zA-Z][a-zA-Z0-9]*)[^>]*>[\s\S]*<\/\1>\s*$/.test(trimmed) ||
      /^<[a-zA-Z][^>]*\/>\s*$/.test(trimmed);

    let html;
    if (isHTMLBlock) {
      // Convert bold/italic/links inside HTML text nodes
      html = trimmed
        .replace(/>([^<]*?)\*\*\*([^<]*?)\*\*\*([^<]*?)</g, ">$1<strong><em>$2</em></strong>$3<")
        .replace(/>([^<]*?)\*\*([^<]*?)\*\*([^<]*?)</g, ">$1<strong>$2</strong>$3<")
        .replace(/>([^<]*?)\*([^<]*?)\*([^<]*?)</g, ">$1<em>$2</em>$3<")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    } else {
      html = trimmed
        // Headers
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        // Bold/Italic
        .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        // Images
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        // Paragraphs
        .replace(/\n\n/g, "</p><p>")
        // Line breaks
        .replace(/\n/g, "<br>");
    }

    if (html) {
      if (isHTMLBlock) {
        result += html;
      } else {
        result += "<p>" + html + "</p>";
      }
    }

    if (i < hrs.length) {
      result += "<hr>";
    }
  });

  return result;
}

// Get all news posts
function getNewsPosts() {
  ensureDir(NEWS_DIR);
  const files = fs.readdirSync(NEWS_DIR).filter(f => f.endsWith(".md"));

  const posts = files.map(file => {
    const filePath = path.join(NEWS_DIR, file);
    const parsed = readMarkdown(filePath);
    if (!parsed) return null;

    const { frontmatter, body } = parsed;
    const slug = slugify(frontmatter.title || file.replace(".md", ""));
    const date = frontmatter.date || new Date().toISOString();

    return {
      file,
      slug,
      date,
      title: frontmatter.title || "Untitled",
      author: frontmatter.author || "Oysterdale Records",
      category: frontmatter.category || "news",
      tags: frontmatter.tags || [],
      excerpt: frontmatter.excerpt || body.substring(0, 250).replace(/\*\*/g, '').replace(/\*/g, '') + "...",
      image: frontmatter.image || "",
      seo: frontmatter.seo || {},
      body
    };
  }).filter(Boolean);

  // Sort by date (newest first)
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Generate individual news post HTML
function generateNewsPostPage(post) {
  const pageDir = path.join(NEWS_BUILD_DIR, post.slug);
  ensureDir(pageDir);

  const pageUrl = `${siteUrl}/news/${post.slug}/`;
  const imageUrl = post.image ? toAbsolute(post.image) : "";

  // Use SEO from frontmatter or defaults
  const metaTitle = post.seo.meta_title || post.title;
  const metaDesc = post.seo.meta_description || post.excerpt;
  const ogTitle = post.seo.og_title || metaTitle;
  const ogDesc = post.seo.og_description || metaDesc;
  const ogImage = post.seo.og_image ? toAbsolute(post.seo.og_image) : imageUrl;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${metaTitle} | Oysterdale Records</title>
  <meta name="description" content="${metaDesc}">
  <meta name="keywords" content="${post.tags.join(", ")}">
  <link rel="canonical" href="${pageUrl}">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDesc}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ""}

  <!-- Twitter -->
  <meta name="twitter:card" content="${ogImage ? "summary_large_image" : "summary"}">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDesc}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}

  <!-- Article metadata -->
  <meta property="article:published_time" content="${post.date}">
  <meta property="article:author" content="${post.author}">
  <meta property="article:section" content="${post.category}">
  ${post.tags.map(tag => `<meta property="article:tag" content="${tag}">`).join("\n  ")}

  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/styles-news-page.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="/scripts/menu.js?v=3" defer></script>
</head>
<body>
  <header class="site-header">
    <div class="logo-title">
      <a href="/" aria-label="Home">
        <img src="/.netlify/images?url=/images/oysterdale-logo.png&w=220&h=60&fit=contain&fm=webp&q=74" alt="Oysterdale Records Logo" class="logo-img" width="220" height="60">
      </a>
    </div>

    <button id="menu-toggle" class="menu-toggle" aria-label="Toggle menu">☰</button>

    <nav class="main-nav">
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/releases">Releases</a>
        <a href="/artists">Artists</a>
        <a href="/news/" class="active">News</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </div>

      <div class="social-icons">
        <a href="https://www.instagram.com/oysterdalerecords/" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram"><i class="fab fa-instagram"></i></a>
        <a href="https://www.tiktok.com/@oysterdalerecords" target="_blank" rel="noopener" aria-label="TikTok" title="TikTok"><i class="fab fa-tiktok"></i></a>
        <a href="https://www.youtube.com/@OysterdaleRecords" target="_blank" rel="noopener" aria-label="YouTube" title="YouTube"><i class="fab fa-youtube"></i></a>
        <a href="https://open.spotify.com/user/312r3ae6wsblyvtxnq6p5d7am" target="_blank" rel="noopener" aria-label="Spotify" title="Spotify"><i class="fab fa-spotify"></i></a>
        <a href="https://www.twitch.tv/oysterdalerecords" target="_blank" rel="noopener" aria-label="Twitch" title="Twitch"><i class="fab fa-twitch"></i></a>
        <a href="https://soundcloud.com/oysterdale-records" target="_blank" rel="noopener" aria-label="SoundCloud" title="SoundCloud"><i class="fab fa-soundcloud"></i></a>
        <a href="https://www.mixcloud.com/OysterdaleRecords/" target="_blank" rel="noopener" aria-label="Mixcloud" title="Mixcloud"><i class="fab fa-mixcloud"></i></a>
      </div>
    </nav>
  </header>

  <main class="news-post">
    <article>
      <header class="post-header">
        <div class="post-meta">
          <time datetime="${post.date}">${formatDate(post.date)}</time>
          <span class="category">${post.category}</span>
        </div>
        <h1 class="post-title">${post.title}</h1>
        <p class="post-author">by ${post.author}</p>
        ${post.tags.length ? `<div class="post-tags">${post.tags.map(t => `<span class="tag">${t}</span>`).join(" ")}</div>` : ""}
      </header>

      ${imageUrl ? `<figure class="post-image"><img src="${post.image}" alt="${post.title}"></figure>` : ""}

      <div class="post-content">
        ${markdownToHTML(post.body)}
      </div>

      <footer class="post-footer">
        <a href="/news/" class="back-link">← Back to all news</a>
      </footer>
    </article>
  </main>

  ${NEWSLETTER_SECTION}

  <footer>
    <div class="footer-logo">
      <a href="/" aria-label="Home">
        <img src="/.netlify/images?url=/uploads/OysterdaleRecords_white_logo.png&w=260&h=260&fit=contain&fm=webp&q=74" alt="Oysterdale Records Logo" class="footer-logo-img" width="260" height="260" loading="lazy">
      </a>
    </div>

    <p>© ${new Date().getFullYear()} Oysterdale Records. All rights reserved.</p>
    <p><a href="/privacy">Privacy Policy</a></p>
  </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(pageDir, "index.html"), html, "utf8");
  console.log("Generated news post:", `/news/${post.slug}/`);
}

// Generate news index page
function generateNewsIndex(posts) {
  ensureDir(NEWS_BUILD_DIR);

  const recentPosts = posts.slice(0, 10); // Show 10 most recent
  const featuredPost = recentPosts[0]; // First post is featured
  const listPosts = recentPosts.slice(1); // Rest go in list

  // Featured post HTML
  const featuredHTML = featuredPost ? `
    <section class="news-hero">
      <a href="/news/${featuredPost.slug}/" class="news-hero-link">
        <figure class="news-hero-figure">
          ${featuredPost.image ? `<img src="${featuredPost.image}" alt="${featuredPost.title}" class="news-hero-image" loading="eager">` : ""}
          <figcaption>
            <div class="news-hero-meta">
              <time datetime="${featuredPost.date}">${formatDate(featuredPost.date)}</time>
              <span class="category">${featuredPost.category}</span>
            </div>
            <h2>${featuredPost.title}</h2>
            <p>${featuredPost.excerpt}</p>
          </figcaption>
        </figure>
      </a>
    </section>
  ` : "";

  // List posts HTML (clean, no cards)
  const cardsHTML = listPosts.map(post => `
    <article class="news-card">
      <a href="/news/${post.slug}/" class="news-card-link">
        <figure class="news-card-figure">
          ${post.image ? `<img src="${post.image}" alt="${post.title}" class="news-card-image" loading="lazy">` : ""}
          <figcaption>
            <div class="news-card-meta">
              <time datetime="${post.date}">${formatDate(post.date)}</time>
              <span class="category">${post.category}</span>
            </div>
            <h3>${post.title}</h3>
            <p>${post.excerpt}</p>
          </figcaption>
        </figure>
      </a>
    </article>
  `).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>News | Oysterdale Records</title>
  <meta name="description" content="Latest news, weekly house briefs, and updates from Oysterdale Records - a Norwegian house and disco label.">
  <link rel="canonical" href="${siteUrl}/news/">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${siteUrl}/news/">
  <meta property="og:title" content="News | Oysterdale Records">
  <meta property="og:description" content="Latest news, weekly house briefs, and updates from Oysterdale Records.">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="News | Oysterdale Records">
  <meta name="twitter:description" content="Latest news, weekly house briefs, and updates from Oysterdale Records.">

  <link rel="alternate" type="application/rss+xml" title="Oysterdale Records News" href="/news/rss.xml">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/styles-news-page.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="/scripts/menu.js?v=3" defer></script>
</head>
<body>
  <header class="site-header">
    <div class="logo-title">
      <a href="/" aria-label="Home">
        <img src="/.netlify/images?url=/images/oysterdale-logo.png&w=220&h=60&fit=contain&fm=webp&q=74" alt="Oysterdale Records Logo" class="logo-img" width="220" height="60">
      </a>
    </div>

    <button id="menu-toggle" class="menu-toggle" aria-label="Toggle menu">☰</button>

    <nav class="main-nav">
      <div class="nav-links">
        <a href="/">Home</a>
        <a href="/releases">Releases</a>
        <a href="/artists">Artists</a>
        <a href="/news/" class="active">News</a>
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
      </div>

      <div class="social-icons">
        <a href="https://www.instagram.com/oysterdalerecords/" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram"><i class="fab fa-instagram"></i></a>
        <a href="https://www.tiktok.com/@oysterdalerecords" target="_blank" rel="noopener" aria-label="TikTok" title="TikTok"><i class="fab fa-tiktok"></i></a>
        <a href="https://www.youtube.com/@OysterdaleRecords" target="_blank" rel="noopener" aria-label="YouTube" title="YouTube"><i class="fab fa-youtube"></i></a>
        <a href="https://open.spotify.com/user/312r3ae6wsblyvtxnq6p5d7am" target="_blank" rel="noopener" aria-label="Spotify" title="Spotify"><i class="fab fa-spotify"></i></a>
        <a href="https://www.twitch.tv/oysterdalerecords" target="_blank" rel="noopener" aria-label="Twitch" title="Twitch"><i class="fab fa-twitch"></i></a>
        <a href="https://soundcloud.com/oysterdale-records" target="_blank" rel="noopener" aria-label="SoundCloud" title="SoundCloud"><i class="fab fa-soundcloud"></i></a>
        <a href="https://www.mixcloud.com/OysterdaleRecords/" target="_blank" rel="noopener" aria-label="Mixcloud" title="Mixcloud"><i class="fab fa-mixcloud"></i></a>
      </div>
    </nav>
  </header>

  <main class="news-index">
    <header class="page-header">
      <h1>News</h1>
      <p class="subtitle">Weekly pearls from the house and disco scene</p>
    </header>

    <div class="news-grid">
      ${featuredHTML}

      <div class="news-scroll-outer">
      <div class="news-scroll-container-wrapper">
        <h2 class="news-section-title" style="color:#fff">More News</h2>
        <button class="scroll-btn scroll-left" aria-label="Scroll left" style="background:transparent;border:none;color:#fff">&#8249;</button>
        <div class="news-scroll-container">
          ${cardsHTML}
        </div>
        <button class="scroll-btn scroll-right" aria-label="Scroll right">&#8250;</button>
      </div>
      </div>
    </div>

    ${posts.length > 10 ? `<p class="archive-link"><a href="/news/archive/">View all ${posts.length} posts →</a></p>` : ""}
  </main>

  ${NEWSLETTER_SECTION}

  <footer>
    <div class="footer-logo">
      <a href="/" aria-label="Home">
        <img src="/.netlify/images?url=/uploads/OysterdaleRecords_white_logo.png&w=260&h=260&fit=contain&fm=webp&q=74" alt="Oysterdale Records Logo" class="footer-logo-img" width="260" height="260" loading="lazy">
      </a>
    </div>

    <p>© ${new Date().getFullYear()} Oysterdale Records. All rights reserved.</p>
    <p><a href="/privacy">Privacy Policy</a></p>
  </footer>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      const container = document.querySelector(".news-scroll-container");
      const leftBtn = document.querySelector(".scroll-left");
      const rightBtn = document.querySelector(".scroll-right");
      if (container && leftBtn && rightBtn) {
        leftBtn.addEventListener("click", function() {
          container.scrollBy({ left: -container.clientWidth * 0.8, behavior: "smooth" });
        });
        rightBtn.addEventListener("click", function() {
          container.scrollBy({ left: container.clientWidth * 0.8, behavior: "smooth" });
        });
      }
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(NEWS_BUILD_DIR, "index.html"), html, "utf8");
  console.log("Generated news index:", "/news/");
}

// Generate RSS feed
function generateRSS(posts) {
  const recentPosts = posts.slice(0, 20); // RSS shows 20 most recent

  const items = recentPosts.map(post => {
    const postUrl = `${siteUrl}/news/${post.slug}/`;
    const date = new Date(post.date).toUTCString();

    return `
    <item>
      <title>${post.title}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${date}</pubDate>
      <author>${post.author}</author>
      <category>${post.category}</category>
      ${post.tags.map(t => `<category>${t}</category>`).join("\n      ")}
      <description><![CDATA[
        ${post.excerpt}
        ${post.image ? `<img src="${toAbsolute(post.image)}" alt="${post.title}">` : ""}
      ]]></description>
    </item>`;
  }).join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Oysterdale Records News</title>
    <link>${siteUrl}/news/</link>
    <description>Weekly pearls from the house and disco scene - news, releases, and updates from Oysterdale Records.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/news/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/uploads/logo.png</url>
      <title>Oysterdale Records</title>
      <link>${siteUrl}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  fs.writeFileSync(path.join(NEWS_BUILD_DIR, "rss.xml"), rss, "utf8");
  console.log("Generated RSS feed:", "/news/rss.xml");
}

// Update header navigation in all HTML files to include News link
function updateNavigation() {
  const htmlFiles = [
    "index.html", "about.html", "releases.html",
    "artists.html", "contact.html", "privacy.html"
  ];

  htmlFiles.forEach(file => {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) return;

    let html = fs.readFileSync(filePath, "utf8");

    // Check if News link already exists
    if (html.includes('href="/news/"')) {
      console.log("News link already exists in:", file);
      return;
    }

    // Add News link to navigation (after Artists, before About)
    html = html.replace(
      /<li><a href="\/artists.html">Artists<\/a><\/li>/,
      `<li><a href="/artists.html">Artists</a></li>\n        <li><a href="/news/">News</a></li>`
    );

    fs.writeFileSync(filePath, html, "utf8");
    console.log("Added News link to:", file);
  });
}

// Original SEO injection function (preserved)
function injectSEO() {
  const PAGES = [
    { name: "index",   html: "index.html",   seo: "content/seo/index.json",   url: "/" },
    { name: "about",   html: "about.html",   seo: "content/seo/about.json",   url: "/about.html" },
    { name: "releases",html: "releases.html",seo: "content/seo/releases.json",url: "/releases.html" },
    { name: "artists", html: "artists.html", seo: "content/seo/artists.json", url: "/artists.html" },
    { name: "contact", html: "contact.html", seo: "content/seo/contact.json", url: "/contact.html" }
  ];

  function removeAll(dom, selector) {
    dom.window.document.head.querySelectorAll(selector).forEach(n => n.remove());
  }

  function injectForPage(page) {
    const htmlPath = path.join(ROOT, page.html);
    const seoPath  = path.join(ROOT, page.seo);

    if (!fs.existsSync(htmlPath)) {
      console.warn("Skip (no HTML):", page.html);
      return;
    }
    const seo = readJSON(seoPath);
    if (!seo) {
      console.warn("Skip (no SEO JSON):", page.seo);
      return;
    }

    const source = fs.readFileSync(htmlPath, "utf8");
    const dom = new JSDOM(source);
    const { document } = dom.window;

    const title       = (seo.meta_title || seo.og_title || "Oysterdale Records").toString();
    const description = (seo.meta_description || seo.og_description || "").toString();
    const keywordsArr = Array.isArray(seo.keywords) ? seo.keywords : (seo.keywords ? [seo.keywords] : []);
    const keywords    = keywordsArr.filter(Boolean).join(", ");
    const ogTitle     = (seo.og_title || title).toString();
    const ogDesc      = (seo.og_description || description).toString();
    const ogImage     = toAbsolute(seo.og_image || "");
    const pageAbsUrl  = siteUrl + (page.url || "/");

    removeAll(dom, 'meta[name="description"], meta[name="keywords"], link[rel="canonical"]');
    removeAll(dom, 'meta[property^="og:"], meta[name^="twitter:"]');

    if (document.head.querySelector("title")) {
      document.head.querySelector("title").textContent = title;
    } else {
      const t = document.createElement("title");
      t.textContent = title;
      document.head.appendChild(t);
    }

    if (description) {
      const m = document.createElement("meta");
      m.setAttribute("name", "description");
      m.setAttribute("content", description);
      document.head.appendChild(m);
    }

    if (keywords) {
      const m = document.createElement("meta");
      m.setAttribute("name", "keywords");
      m.setAttribute("content", keywords);
      document.head.appendChild(m);
    }

    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", pageAbsUrl);
    document.head.appendChild(link);

    const ogPairs = [
      ["og:type", "website"],
      ["og:url", pageAbsUrl],
      ["og:title", ogTitle],
      ["og:description", ogDesc]
    ];

    ogPairs.forEach(([prop, content]) => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", prop);
      meta.setAttribute("content", content);
      document.head.appendChild(meta);
    });

    if (ogImage) {
      const metaImg = document.createElement("meta");
      metaImg.setAttribute("property", "og:image");
      metaImg.setAttribute("content", ogImage);
      document.head.appendChild(metaImg);
    }

    const twPairs = [
      ["twitter:card", "summary"],
      ["twitter:title", ogTitle],
      ["twitter:description", ogDesc]
    ];

    twPairs.forEach(([name, content]) => {
      const meta = document.createElement("meta");
      meta.setAttribute("name", name);
      meta.setAttribute("content", content);
      document.head.appendChild(meta);
    });

    if (ogImage) {
      const metaTwImg = document.createElement("meta");
      metaTwImg.setAttribute("name", "twitter:image");
      metaTwImg.setAttribute("content", ogImage);
      document.head.appendChild(metaTwImg);
    }

    fs.writeFileSync(htmlPath, dom.serialize(), "utf8");
    console.log("Injected SEO into:", page.html);
  }

  PAGES.forEach(injectForPage);
}

// Main build function
function build() {
  console.log("\n=== Oysterdale Records Build ===\n");
  
  // Step 0: Generate release pages + releases.json
  console.log("Step 0: Generating release pages...");
  const releaseScript = path.join(__dirname, "scripts", "generate-release-pages.js");
  if (fs.existsSync(releaseScript)) {
    require(releaseScript);
    console.log("✓ Release pages generated");
  } else {
    console.log("⚠ Release script not found, skipping");
  }

  // Step 1: Generate news pages
  console.log("\nStep 1: Generating news pages...");
  const posts = getNewsPosts();
  posts.forEach(generateNewsPostPage);
  generateNewsIndex(posts);
  generateRSS(posts);

  // Step 2: Update navigation
  console.log("\nStep 2: Updating navigation...");
  updateNavigation();

  // Step 3: Inject SEO
  console.log("\nStep 3: Injecting SEO metadata...");
  injectSEO();

  console.log("\n=== Build Complete ===");
  console.log(`Generated ${posts.length} news post(s)`);
  console.log("News index: /news/");
  console.log("RSS feed: /news/rss.xml");
}

// Run build
build();