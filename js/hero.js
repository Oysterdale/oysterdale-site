(function () {
  const img = document.getElementById("home-hero");
  if (!img) return;

  const fallbackSrc = img.getAttribute("data-fallback") || img.getAttribute("src");

  function buildCdnUrl(path, w) {
    if (path.startsWith("/.netlify/images")) {
      const u = new URL(path, window.location.origin);
      u.searchParams.set("w", String(w));
      return u.pathname + "?" + u.searchParams.toString();
    }
    return `/.netlify/images?url=${encodeURIComponent(path)}&w=${w}`;
  }

  function setResponsiveImage(path) {
    const widths = [480, 800, 1200, 1600];
    img.src    = buildCdnUrl(path, 1200);
    img.srcset = widths.map(w => `${buildCdnUrl(path, w)} ${w}w`).join(", ");
    img.sizes  = "100vw";
  }

  fetch("data/home.json", { cache: "no-store" })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(cfg => {
      const url = (cfg && cfg.hero_image) ? String(cfg.hero_image).trim() : "";
      setResponsiveImage(url || fallbackSrc);
    })
    .catch(() => {
      setResponsiveImage(fallbackSrc);
    });
})();
