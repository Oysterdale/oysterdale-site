(function () {
  const a = document.getElementById("home-hero-a");
  const b = document.getElementById("home-hero-b");
  const ph = document.getElementById("hero-ph");
  if (!a || !b) return;

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
  }

  // Netlify image CDN (trygt): IKKE encode hele pathen (Netlify liker ofte raw /uploads/..)
  function cdn(path, w) {
    if (!path) return "";
    const fm = "webp";
    const q = "70";
    const fit = "cover";

    // Ikke encode hele path - send den raw
    return `/.netlify/images?url=${path}&w=${w}&fm=${fm}&q=${q}&fit=${fit}`;
  }

  function srcset(path) {
    const widths = [360, 480, 640, 750, 828, 1024, 1200, 1366, 1600];
    return widths.map(w => `${cdn(path, w)} ${w}w`).join(", ");
  }

  // Setter bildet så robust som mulig:
  // 1) Sett direkte /uploads/... (garantert hvis filen finnes)
  // 2) Når direkte er “ok”, bytt over til cdn for optimalisering (valgfritt)
  function setImageRobust(imgEl, path) {
    const p = String(path || "").trim();
    if (!p) return;

    // Start med direkte fil (minst sjanse for feil)
    imgEl.src = p;
    imgEl.srcset = "";
    imgEl.sizes = "";
    imgEl.setAttribute("fetchpriority", "high");
    imgEl.removeAttribute("loading");

    // Når direkte er lastet: sett cdn src/srcset (kun om du vil)
    imgEl.addEventListener("load", () => {
      // Hvis direkte src allerede er en cdn, gjør ingenting
      if (imgEl.src.includes("/.netlify/images")) return;

      // Switch til CDN
      imgEl.src = cdn(p, 1600);
      imgEl.srcset = srcset(p);
      imgEl.sizes = "100vw";

      // Hvis CDN feiler: gå tilbake til direkte fil
      imgEl.onerror = () => {
        imgEl.onerror = null;
        imgEl.srcset = "";
        imgEl.sizes = "";
        imgEl.src = p;
      };
    }, { once: true });

    // Hvis direkte fil feiler: ingen poeng å prøve CDN – da finnes ikke filen
    imgEl.onerror = () => {
      imgEl.onerror = null;
      // blir stående med broken image -> da er filen ikke publisert på /uploads/...
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

  fetch("/data/home.json", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : {}))
    .then(cfg => {
      const images = normalizeImages(cfg);
      if (!images.length) return;

      const intervalSeconds = Math.max(2, toInt(cfg?.hero_interval_seconds, 7));
      const fadeMs = toInt(cfg?.hero_fade_ms, 800);
      setFadeDuration(fadeMs);

      // Første bilde
      setImageRobust(a, images[0]);
      a.addEventListener("load", hidePlaceholder, { once: true });
      markActive(a, b);

      if (images.length === 1) return;

      let index = 0;
      let showingA = true;

      // Preload neste på B
      setImageRobust(b, images[1]);

      setInterval(() => {
        const next = (index + 1) % images.length;
        const nextUrl = images[next];

        const active = showingA ? a : b;
        const inactive = showingA ? b : a;

        setImageRobust(inactive, nextUrl);

        const doSwap = () => {
          markActive(inactive, active);
          showingA = !showingA;
          index = next;
        };

        inactive.addEventListener("load", doSwap, { once: true });
        if (inactive.complete) Promise.resolve().then(doSwap);

      }, intervalSeconds * 1000);
    })
    .catch(() => {});
})();
