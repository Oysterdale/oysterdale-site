(function () {
  const img = document.getElementById("home-hero");
  if (!img) return;

  const fallbackSrc = img.getAttribute("data-fallback") || img.getAttribute("src");

  function buildCdnUrl(path, w) {
    const fm = "webp";
    const q  = "55";
    const fit = "cover";

    // already a CDN URL? refresh params safely
    if (path.startsWith("/.netlify/images")) {
      const u = new URL(path, window.location.origin);
      u.searchParams.set("w", String(w));
      u.searchParams.set("fm", fm);
      u.searchParams.set("q", q);
      u.searchParams.set("fit", fit);
      return u.pathname + "?" + u.searchParams.toString();
    }
    // IMPORTANT: always encode the original path
    return `/.netlify/images?url=${encodeURIComponent(path)}&w=${w}&fm=${fm}&q=${q}&fit=${fit}`;
  }

  function setResponsiveImage(path) {
    const widths = [360, 414, 428, 480, 640, 750, 828, 1024, 1200, 1280, 1366];

    // optimistic CDN src/srcset
    img.src    = buildCdnUrl(path, 1200);
    img.srcset = widths.map(w => `${buildCdnUrl(path, w)} ${w}w`).join(", ");
    img.sizes  = "100vw";
    img.setAttribute("fetchpriority", "high");
    img.removeAttribute("loading");

    // HARD FALLBACK: if the first load fails (eg. PSI transient 404), drop to original asset
    const original = path.startsWith("/.netlify/images")
      ? fallbackSrc
      : path;

    img.onerror = function onCdnError() {
      // prevent loop
      img.onerror = null;
      img.srcset = "";
      img.sizes = "";
      img.src = original;
    };
  }

  // Load config and choose URL (admin -> data/home.json). Use fallback if empty.
  fetch("data/home.json", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(cfg => {
      const url = (cfg && cfg.hero_image) ? String(cfg.hero_image).trim() : "";
      setResponsiveImage(url || fallbackSrc);
    })
    .catch(() => setResponsiveImage(fallbackSrc));
})();
