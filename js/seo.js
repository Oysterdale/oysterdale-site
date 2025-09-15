/* Oysterdale Records – SEO injector
 * Reads per-page JSON (e.g. /content/seo/index.json) and injects <meta> tags into <head>.
 * Works on static HTML (Netlify), no templating. Never writes to <body>.
 */

(function () {
  /** Utilities **/
  function logError(...args) { console.error("[seo.js]", ...args); }
  function logWarn(...args)  { console.warn("[seo.js]", ...args); }

  function setOrCreateMetaBySelector(selector, attrs) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      // Ensure selector stays valid by setting the key used in the selector first
      const firstKey = Object.keys(attrs)[0];
      el.setAttribute(firstKey, attrs[firstKey]);
      document.head.appendChild(el);
    }
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function setNameMeta(name, content) {
    if (!content) return;
    setOrCreateMetaBySelector(`meta[name="${name}"]`, { name, content });
  }

  function setPropMeta(property, content) {
    if (!content) return;
    setOrCreateMetaBySelector(`meta[property="${property}"]`, { property, content });
  }

  function absolutize(url) {
    try { return new URL(url, window.location.origin).toString(); }
    catch { return url; } // If it's already absolute or invalid, just return as-is
  }

  function deriveSeoJsonFromPath() {
    // Fallback if data-seo attr is missing:
    // Map /, /index.html => /content/seo/index.json
    // Map /about.html    => /content/seo/about.json
    // Map /artists/      => /content/seo/artists.json  (treat trailing slash as a "page" name)
    let path = window.location.pathname;

    if (path === "/" || path === "") return "/content/seo/index.json";

    // Remove leading slash
    if (path.startsWith("/")) path = path.slice(1);

    // If ends with .html -> trim extension
    if (path.endsWith(".html")) path = path.replace(/\.html$/i, "");

    // If ends with slash -> trim it
    if (path.endsWith("/")) path = path.slice(0, -1);

    // If still empty, use index
    const slug = path || "index";
    return `/content/seo/${slug}.json`;
  }

  function normalizeKeywords(kw) {
    if (!kw) return null;
    if (Array.isArray(kw)) return kw.filter(Boolean).join(", ");
    if (typeof kw === "string") return kw.trim();
    return null;
  }

  /** Main application **/
  async function applySEOFrom(seoUrl) {
    let data;
    try {
      const res = await fetch(seoUrl, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) {
          logError(`SEO JSON not found (404): ${seoUrl}`);
        } else {
          logError(`Failed to load SEO JSON (${res.status}): ${seoUrl}`);
        }
        return;
      }
      data = await res.json();
    } catch (e) {
      logError("Error fetching/parsing SEO JSON:", e);
      return;
    }

    if (!data || typeof data !== "object") {
      logError("SEO JSON is empty or invalid:", data);
      return;
    }

    // Title
    if (typeof data.meta_title === "string" && data.meta_title.trim()) {
      document.title = data.meta_title.trim();
    } else {
      logWarn("meta_title missing in SEO JSON.");
    }

    // Description
    if (typeof data.meta_description === "string" && data.meta_description.trim()) {
      setNameMeta("description", data.meta_description.trim());
    } else {
      logWarn("meta_description missing in SEO JSON.");
    }

    // Keywords
    const kw = normalizeKeywords(data.keywords);
    if (kw) {
      setNameMeta("keywords", kw);
    } else {
      logWarn("keywords missing/empty in SEO JSON.");
    }

    // Open Graph
    const pageUrl = window.location.href.split("#")[0];
    setPropMeta("og:type", "website");
    setPropMeta("og:url", pageUrl);

    if (data.og_title && data.og_title.trim()) {
      setPropMeta("og:title", data.og_title.trim());
    } else if (data.meta_title && data.meta_title.trim()) {
      // Fallback to meta_title if og_title is missing
      setPropMeta("og:title", data.meta_title.trim());
      logWarn("og_title missing – fell back to meta_title.");
    } else {
      logWarn("og_title and meta_title both missing.");
    }

    if (data.og_description && data.og_description.trim()) {
      setPropMeta("og:description", data.og_description.trim());
    } else if (data.meta_description && data.meta_description.trim()) {
      // Fallback to meta_description if og_description is missing
      setPropMeta("og:description", data.meta_description.trim());
      logWarn("og_description missing – fell back to meta_description.");
    } else {
      logWarn("og_description and meta_description both missing.");
    }

    if (data.og_image && typeof data.og_image === "string" && data.og_image.trim()) {
      setPropMeta("og:image", absolutize(data.og_image.trim()));
    } else {
      logWarn("og_image missing in SEO JSON.");
    }
  }

  function init() {
    // Read data-seo attribute from the script tag if present; otherwise derive from URL.
    const self = document.currentScript;
    let seoUrl = (self && self.dataset && self.dataset.seo) ? self.dataset.seo : null;
    if (!seoUrl) seoUrl = deriveSeoJsonFromPath();
    applySEOFrom(seoUrl);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
