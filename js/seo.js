(function () {
  function setOrCreateMeta(selector, attrs) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      // apply first attr to decide selector type
      const firstKey = Object.keys(attrs)[0];
      el.setAttribute(firstKey, attrs[firstKey]);
      document.head.appendChild(el);
    }
    // set remaining/other attrs
    Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }

  function absolutize(url) {
    try { return new URL(url, window.location.origin).toString(); }
    catch { return url; }
  }

  function applySEO(seo) {
    // Title (fallback til eksisterende <title> hvis tom)
    if (seo.meta_title && typeof seo.meta_title === 'string') {
      document.title = seo.meta_title;
    }

    // Description
    if (seo.meta_description) {
      setOrCreateMeta('meta[name="description"]', {
        name: 'description',
        content: seo.meta_description
      });
    }

    // Keywords (tar både array og string)
    if (seo.keywords && (Array.isArray(seo.keywords) || typeof seo.keywords === 'string')) {
      const kw = Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords;
      setOrCreateMeta('meta[name="keywords"]', { name: 'keywords', content: kw });
    }

    // Open Graph
    const pageUrl = window.location.href.split('#')[0];
    setOrCreateMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setOrCreateMeta('meta[property="og:url"]', { property: 'og:url', content: pageUrl });

    if (seo.og_title) {
      setOrCreateMeta('meta[property="og:title"]', { property: 'og:title', content: seo.og_title });
    } else if (seo.meta_title) {
      setOrCreateMeta('meta[property="og:title"]', { property: 'og:title', content: seo.meta_title });
    }

    if (seo.og_description) {
      setOrCreateMeta('meta[property="og:description"]', { property: 'og:description', content: seo.og_description });
    } else if (seo.meta_description) {
      setOrCreateMeta('meta[property="og:description"]', { property: 'og:description', content: seo.meta_description });
    }

    if (seo.og_image) {
      setOrCreateMeta('meta[property="og:image"]', {
        property: 'og:image',
        content: absolutize(seo.og_image)
      });
    }
  }

  async function init() {
    const self = document.currentScript;
    const seoUrl = self && self.dataset && self.dataset.seo ? self.dataset.seo : null;
    if (!seoUrl) return;

    try {
      const res = await fetch(seoUrl, { cache: 'no-store' });
      if (!res.ok) return;
      const seo = await res.json();
      applySEO(seo || {});
    } catch (e) {
      // Stilletiende fail – skal ikke påvirke siden
      // console.warn('SEO JSON not applied:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
