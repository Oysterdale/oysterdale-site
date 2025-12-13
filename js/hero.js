(function () {
  const a = document.getElementById("home-hero-a");
  const b = document.getElementById("home-hero-b");
  const ph = document.getElementById("hero-ph");

  // Hvis du fortsatt har gammel HTML (id="home-hero"), gjør ingenting
  // (men hos deg skal index ha home-hero-a + home-hero-b).
  if (!a || !b) return;

  function toInt(v, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function buildCdnUrl(path, w) {
    const fm = "webp";
    const q = "55";
    const fit = "cover";

    if (!path) return "";

    // already a CDN URL? refresh params safely
    if (String(path).startsWith("/.netlify/images")) {
      const u = new URL(path, window.location.origin);
      u.searchParams.set("w", String(w));
      u.searchParams.set("fm", fm);
      u.searchParams.set("q", q);
      u.searchParams.set("fit", fit);
      return u.pathname + "?" + u.searchParams.toString();
    }

    return `/.netlify/images?url=${encodeURIComponent(path)}&w=${w}&fm=${fm}&q=${q}&fit=${fit}`;
  }

  function makeSrcSet(path) {
    const widths = [360, 414, 428, 480, 640, 750, 828, 1024, 1200, 1280, 1366, 1600];
    return widths.map(w => `${buildCdnUrl(path, w)} ${w}w`).join(", ");
  }

  function setResponsiveImage(imgEl, path, fallbackOriginal) {
    const p = String(path || "").trim();
    const original = p.startsWith("/.netlify/images") ? (fallbackOriginal || p) : (fallbackOriginal || p);

    // If empty -> just use fallback
    const finalPath = p || (fallbackOriginal || "");
    if (!finalPath) return;

    // CDN src/srcset
    imgEl.src = buildCdnUrl(finalPath, 1600);
    imgEl.srcset = makeSrcSet(finalPath);
    imgEl.sizes = "100vw";
    imgEl.setAttribute("fetchpriority", "high");
    imgEl.removeAttribute("loading");

    // HARD FALLBACK: if CDN transient fails, drop to original
    imgEl.onerror = function onCdnError() {
      imgEl.onerror = null;
      imgEl.srcset = "";
      imgEl.sizes = "";
      imgEl.src = original || finalPath;
    };
  }

  function hidePlaceholder() {
    if (ph) ph.style.display = "none";
  }

  function setFadeDuration(ms) {
    const dur = Math.max(100, toInt(ms, 800));
    a.style.transitionDuration = `${dur}ms`;
    b.style.transitionDuration = `${dur}ms`;
  }

  function normalizeImages(cfg) {
    // Ny: hero_images: [{ image: "/uploads/..." }, ...]
    if (Array.isArray(cfg?.hero_images) && cfg.hero_images.length) {
      return cfg.hero_images
        .map(x => (x && typeof x === "object" ? x.image : x))
        .filter(Boolean)
        .map(x => String(x).trim())
        .filter(Boolean);
    }
    // Gammel fallback (hvis du fortsatt har hero_image)
    if (cfg?.hero_image) return [String(cfg.hero_image).trim()].filter(Boolean);
    return [];
  }

  function markActive(active, inactive) {
    inactive.classList.remove("is-active");
    active.classList.add("is-active");
  }

  // Load config
  fetch("/data/home.json", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : {}))
    .then(cfg => {
      const images = normalizeImages(cfg);

      // Hvis admin ikke har lagt inn bilder enda -> ikke gjør noe
      if (!images.length) return;

      const intervalSeconds = Math.max(2, toInt(cfg?.hero_interval_seconds, 7));
      const fadeMs = toInt(cfg?.hero_fade_ms, 800);
      setFadeDuration(fadeMs);

      // Sett første bilde på A og vis det
      setResponsiveImage(a, images[0], images[0]);
      a.addEventListener("load", hidePlaceholder, { once: true });
      markActive(a, b);

      // Hvis bare 1 bilde -> ferdig
      if (images.length === 1) return;

      // Preload neste på B
      let index
