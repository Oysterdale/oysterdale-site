(function () {
  const img = document.getElementById("home-hero");
  if (!img) return;

  const fallbackSrc = img.getAttribute("data-fallback") || img.getAttribute("src");

  fetch("data/home.json", { cache: "no-store" })
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(cfg => {
      const url = (cfg && cfg.hero_image) ? String(cfg.hero_image).trim() : "";
      img.src = url || fallbackSrc;
    })
    .catch(() => {
      img.src = fallbackSrc;
    });
})();
