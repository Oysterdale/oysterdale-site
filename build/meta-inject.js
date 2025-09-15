/* Inject SEO from content/seo/*.json into the <head> of each HTML page.
 * Works on Netlify build. Does not touch layout/body.
 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Map pages -> their HTML and SEO JSON
const PAGES = [
  { name: "index",   html: "index.html",   seo: "content/seo/index.json",   url: "/" },
  { name: "about",   html: "about.html",   seo: "content/seo/about.json",   url: "/about.html" },
  { name: "releases",html: "releases.html",seo: "content/seo/releases.json",url: "/releases.html" },
  { name: "artists", html: "artists.html", seo: "content/seo/artists.json", url: "/artists.html" },
  { name: "contact", html: "contact.html", seo: "content/seo/contact.json", url: "/contact.html" }
];

const ROOT = process.cwd();
const cfgPath = path.join(ROOT, "site.config.json");
const siteCfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, "utf8")) : {};
const siteUrl = (siteCfg.siteUrl || "").replace(/\/$/, "");

function readJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.error("Invalid JSON:", p, e.message); return null; }
}

function toAbsolute(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (!siteUrl) return url; // fallback if siteUrl missing
  if (url.startsWith("/")) return siteUrl + url;
  return siteUrl + "/" + url;
}

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

  // Values
  const title       = (seo.meta_title || seo.og_title || "Oysterdale Records").toString();
  const description = (seo.meta_description || seo.og_description || "").toString();
  const keywordsArr = Array.isArray(seo.keywords) ? seo.keywords : (seo.keywords ? [seo.keywords] : []);
  const keywords    = keywordsArr.filter(Boolean).join(", ");
  const ogTitle     = (seo.og_title || title).toString();
  const ogDesc      = (seo.og_description || description).toString();
  const ogImage     = toAbsolute(seo.og_image || "");
  const pageAbsUrl  = siteUrl ? (siteUrl + (page.url || "/")) : (page.url || "/");

  // Clean previous SEO
  removeAll(dom, 'meta[name="description"], meta[name="keywords"], link[rel="canonical"]');
  removeAll(dom, 'meta[property^="og:"], meta[name^="twitter:"]');

  // <title>
  if (document.head.querySelector("title")) {
    document.head.querySelector("title").textContent = title;
  } else {
    const t = document.createElement("title");
    t.textContent = title;
    document.head.appendChild(t);
  }

  // Description
  if (description) {
    const m = document.createElement("meta");
    m.setAttribute("name", "description");
    m.setAttribute("content", description);
    document.head.appendChild(m);
  }

  // Keywords
  if (keywords) {
    const m = document.createElement("meta");
    m.setAttribute("name", "keywords");
    m.setAttribute("content", keywords);
    document.head.appendChild(m);
  }

  // Canonical
  if (siteUrl) {
    const link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", pageAbsUrl);
    document.head.appendChild(link);
  }

  // Open Graph
  const ogPairs = [
    ["og:type", "website"],
    ["og:url", pageAbsUrl],
    ["og:title", ogTitle],
    ["og:description", ogDesc]
  ];
  if (ogImage) {
    ogPairs.push(["og:image", ogImage]);
    ogPairs.push(["og:image:width", "1200"]);
    ogPairs.push(["og:image:height", "630"]);
  }
  ogPairs.forEach(([prop, val]) => {
    const m = document.createElement("meta");
    m.setAttribute("property", prop);
    m.setAttribute("content", val);
    document.head.appendChild(m);
  });

  // Twitter
  const twPairs = [
    ["twitter:card", ogImage ? "summary_large_image" : "summary"],
    ["twitter:title", ogTitle],
    ["twitter:description", ogDesc]
  ];
  if (ogImage) twPairs.push(["twitter:image", ogImage]);
  twPairs.forEach(([name, val]) => {
    const m = document.createElement("meta");
    m.setAttribute("name", name);
    m.setAttribute("content", val);
    document.head.appendChild(m);
  });

  fs.writeFileSync(htmlPath, dom.serialize(), "utf8");
  console.log("Injected SEO into:", page.html);
}

(function main() {
  PAGES.forEach(injectForPage);
  console.log("SEO injection complete.");
})();
