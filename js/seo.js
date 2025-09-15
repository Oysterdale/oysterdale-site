/* Oysterdale Records – SEO injector (v2)
 * Static HTML friendly (Netlify). No templating. No body mutations.
 * - Fetches per-page JSON (data-seo or derived from URL)
 * - Injects <title>, <meta name="description">, <meta name="keywords">
 *   and Open Graph tags into <head> only.
 * - Logs clear errors/warnings to console; never writes to body.
 */

(function () {
  "use strict";

  /** ---------- utilities ---------- **/
  function logError(...a) { console.error("[seo.js]", ...a); }
  function logWarn (...a) { console.warn ("[seo.js]", ...a); }

  // create/update a <meta> selected by CSS selector (e.g. meta[name="description"])
  function setOrCreateMeta(selector, attrs) {
    let el = document.head.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      // ensure selector key is present first
      const firstKey = Object.keys(attrs)[0];
      el.setAttribute(firstKey, attrs[firstKey]);
      document.head.appendChild(el);
    }
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function setNameMeta(name, content) {
    if (!content) return;
    setOrCreateMeta(`meta[name="${name}"]`, { name, content });
  }

  function setPropMeta(property, content) {
    if (!content) return;
    setOrCreateMeta(`meta[property="${property}"]`, { property, content });
  }

  function absolutize(url) {
    if (!url) return url;
    try { return new URL(url, window.location.origin).toString(); }
    catch { return url; }
  }

  function normalizeKeywords(kw) {
    if (!kw) return null;
    if (Array.isArray(kw)) return kw.filter(Boolean).join(", ");
    if (typeof kw === "string") return kw.trim();
    return null;
  }

  function deriveSeoJsonFromPath() {
    // Fallback hvis data-seo mangler
    // /           -> /content/seo/index.json
    // /about.html -> /content/seo/about.json
    // /artists/   -> /content/seo/artists.json
    let path = window.location.pathname;
    if (path === "/" || path === "") return "/content/seo/index.json";
    if (path.startsWith("/")) path = path.slice(1);
    if (path.endsWith(".html")) path = path.replace(/\.html$/i, "");
    if (path.endsWith("/")) path = path.slice(0, -1);
    const slug = path || "index";
    return `/content/seo/${slug}.json`;
  }

  // prevent double-run on hot reloads etc.
  if (document.documentElement.hasAttribute("data-seo-applied")) {
    return;
  }
  document.documentElement.setAttribute("data-seo-applied", "1");

  /** ---------- main ---------- **/
  async function applySEOFrom(seoUrl) {
    let data;
    try {
      const res = await fetch(seoUrl, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 404) logError("SEO JSON not found (404):", seoUrl);
        else logError(`Failed to load SEO JSON (${res.status}):`, seoUrl);
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

    // title
    if (typeof data.meta_title === "string" && data.meta_title.trim()) {
      document.title = data.meta_title.trim();
    } else {
      logWarn("meta_title missing in SEO JSON.");
    }

    // description
    if (typeof data.meta_description === "string" && data.meta_description.trim()) {
      setNameMeta("description", data.meta_description.trim());
    } else {
      logWarn("meta_description missing in SEO JSON.");
    }

    // keywords (string or array)
    const kw = normalizeKeywords(data.keywords);
    if (kw) setNameMeta("keywords", kw);
    else logWarn("keywords missing/empty in SEO JSON.");

    // Open Graph
    const pageUrl = window.location.href.split("#")[0];
    setPropMeta("og:type", "website");
    setPropMeta("og:url", pageUrl);

    if (data.og_title && data.og_title.trim()) {
      setPropMeta("og:title", data.og_title.trim());
    } else if (data.meta_title && data.meta_title.trim()) {
      setPropMeta("og:title", data.meta_title.trim());
      logWarn("og_title missing – fell back to meta_title.");
    } else {
      logWarn("og_title and meta_title both missing.");
    }

    if (data.og_description && data.og_description.trim()) {
      setPropMeta("og:description", data.og_description.trim());
    } else if (data.meta_description && data.meta_description.trim()) {
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
    // aldri skriv til body – kun les fra currentScript og injiser i head
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
