(function () {
  const a = document.getElementById("home-hero-a");
  const b = document.getElementById("home-hero-b");
  const ph = document.getElementById("hero-ph");
  const wrap = document.getElementById("home-hero-wrap");
  if (!a || !b) return;

  const WIDTHS = [360, 480, 640, 750, 828, 1024, 1200, 1366, 1600];

  function toInt(v, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function hidePlaceholder() {
    if (ph) ph.style.display = "none";
  }

  function setFadeDuration(ms) {
    const dur = Math.max(100, toInt(ms, 800));
    a.style.transitionDuration = `${dur}ms`;
    b.style.transitionDuration = `${dur}ms`;
    if (wrap) wrap.style.setProperty("--hero-fade", `${dur}ms`);
  }

  // CDN uten "fit=cover" (for å unngå ekstra cropping i transformen)
  function cdn(path, w) {
    if (!path) return "";
    const fm = "webp";
    const q = "70";
    const url = encodeURIComponent(path); // tryggest
    return `/.netlify/images?url=${url}&w=${w}&fm=${fm}&q=${q}`;
  }

  function makeSrcset(path) {
    return WIDTHS.map(w => `${cdn(path, w)} ${w}w`).join(", ");
  }

  // Setter bilde på et <img> med CDN først, fallback til original path ved feil
  function setImage(imgEl, path) {
    const p = String(path || "").trim();
    if (!p) return;

    // Reset event handlers (viktig når vi rebruker samme <img>)
    imgEl.onload = null;
    imgEl.onerror = null;

    imgEl.setAttribute("fetchpriority", "high");
    imgEl.removeAttribute("loading");

    const cdnSrc = cdn(p, 1600);

    imgEl.src = cdnSrc;
    imgEl.srcset = makeSrcset(p);
    imgEl.sizes = "100vw";

    imgEl.onerror = () => {
      // fallback til original fil
      imgEl.onerror = null;
      imgEl.srcset = "";
      imgEl.sizes = "";
      imgEl.src = p;
    };
  }

  function normalizeImages(cfg) {
    if (Array.isArray(cfg?.hero_images) && cfg.hero_images.length) {
      return cfg.hero_images
        .map(x => (x && typeof x === "object" ? x.image : x))
        .filter(Boolean)
        .map(x => String(x).trim())
        .filter(Boolean);
    }
    if (cfg?.hero_image) return [String(cfg.hero_image).trim()].filter(Boolean);
    return [];
  }

  function markActive(active, inactive) {
    inactive.classList.remove("is-active");
    active.classList.add("is-active");
  }

  // Preload: laster opp neste bilde i bakgrunnen (med samme CDN+fallback logikk)
  function preload(path) {
    return new Promise(resolve => {
      const p = String(path || "").trim();
      if (!p) return resolve();

      const tmp = new Image();
      tmp.decoding = "async";

      tmp.onload = () => resolve();
      tmp.onerror = () => {
        // prøv original hvis CDN feilet
        const tmp2 = new Image();
        tmp2.onload = () => resolve();
        tmp2.onerror = () => resolve();
        tmp2.src = p;
      };

      tmp.src = cdn(p, 1600);
      tmp.srcset = makeSrcset(p);
      tmp.sizes = "100vw";
    });
  }

  fetch("/data/home.json", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : {}))
    .then(async cfg => {
      const images = normalizeImages(cfg);
      if (!images.length) return;

      const intervalSeconds = Math.max(2, toInt(cfg?.hero_interval_seconds, 7));
      const fadeMs = toInt(cfg?.hero_fade_ms, 800);
      setFadeDuration(fadeMs);

      // Start: sett første bilde på A
      setImage(a, images[0]);
      markActive(a, b);

      // Når A er lastet første gang => fjern placeholder
      a.addEventListener("load", hidePlaceholder, { once: true });

      if (images.length === 1) return;

      let index = 0;
      let showingA = true;

      // preload neste (så slipper du “zoom/blink” pga sen last)
      await preload(images[1]);
      setImage(b, images[1]);

      setInterval(async () => {
        const next = (index + 1) % images.length;
        const nextUrl = images[next];

        const active = showingA ? a : b;
        const inactive = showingA ? b : a;

        // preload neste før vi setter det på inactive
        await preload(nextUrl);
        setImage(inactive, nextUrl);

        // swap når inactive faktisk er klar
        const doSwap = () => {
          markActive(inactive, active);
          showingA = !showingA;
          index = next;
        };

        if (inactive.complete && inactive.naturalWidth > 0) {
          doSwap();
        } else {
          inactive.addEventListener("load", doSwap, { once: true });
        }
      }, intervalSeconds * 1000);
    })
    .catch(() => {});
})();
