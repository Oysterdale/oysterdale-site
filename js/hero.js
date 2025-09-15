(function () {
  const img = document.getElementById("home-hero");
  if (!img) return;

  const fallbackSrc = img.getAttribute("data-fallback") || img.getAttribute("src");

  // Hjelpefunksjon for å lage en Netlify Image CDN URL
  function buildCdnUrl(path, width) {
    return `/.netlify/images?url=${encodeURIComponent(path)}&width=${width}`;
  }

  // Sett src og srcset på et bilde
  function setResponsiveImage(path) {
    const widths = [480, 800, 1200, 1600];
    img.src = buildCdnUrl(path, 1200); // standard
    img.srcset = widths.map(w => `${buildCdnUrl(path, w)} ${w}w`).join(", ");
    img.sizes = "100vw";
  }

  fetch("data/home.json", { cache: "no-store" })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(cfg => {
      const url = (cfg && cfg.hero_image) ? String(cfg.hero_image).trim() : "";
      if (url) {
        setResponsiveImage(url);
      } else {
        setResponsiveImage(fallbackSrc);
      }
    })
    .catch(() => {
      setResponsiveImage(fallbackSrc);
    });
})();
