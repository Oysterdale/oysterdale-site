(function () {
  const img = document.getElementById("home-hero");
  if (!img) return;

  const fallbackSrc = img.getAttribute("data-fallback") || img.getAttribute("src");

  // Bygg Netlify Image CDN-URL med ønsket bredde + format/kompresjon
  function buildCdnUrl(path, w) {
    const fm = "webp";   // moderne format
    const q  = "55";     // kompresjon (0-100). 55 gir lav filstørrelse, fortsatt god kvalitet
    const fit = "cover"; // matcher CSS object-fit: cover

    // Hvis path allerede peker på Netlify Image CDN, oppdater parametere
    if (path.startsWith("/.netlify/images")) {
      const u = new URL(path, window.location.origin);
      u.searchParams.set("w", String(w));
      u.searchParams.set("fm", fm);
      u.searchParams.set("q", q);
      u.searchParams.set("fit", fit);
      return u.pathname + "?" + u.searchParams.toString();
    }

    // Ellers pakk originalsti (kan være /uploads/… eller full https-URL)
    return `/.netlify/images?url=${encodeURIComponent(path)}&w=${w}&fm=${fm}&q=${q}&fit=${fit}`;
  }

  // Sett responsivt bilde (src + srcset + sizes)
  function setResponsiveImage(path) {
    const widths = [360, 414, 428, 480, 640, 750, 828, 1024, 1200, 1280, 1366];

    // Sett default til 1200 for balansert desktop
    img.src    = buildCdnUrl(path, 1200);
    img.srcset = widths.map(w => `${buildCdnUrl(path, w)} ${w}w`).join(", ");
    img.sizes  = "100vw";

    // Bedre LCP for hero
    img.setAttribute("fetchpriority", "high");
    img.removeAttribute("loading"); // hero skal ikke lazy-loades
  }

  // Hent hero-bilde fra admin (data/home.json). Fallback brukes hvis tomt/feil.
  fetch("data/home.json", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : Promise.reject()))
    .then(cfg => {
      const url = (cfg && cfg.hero_image) ? String(cfg.hero_image).trim() : "";
      setResponsiveImage(url || fallbackSrc);
    })
    .catch(() => {
      setResponsiveImage(fallbackSrc);
    });
})();
