(function () {
  const a = document.getElementById("home-hero-a");
  const b = document.getElementById("home-hero-b");
  const ph = document.getElementById("hero-ph");
  const wrap = document.getElementById("home-hero-wrap");
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
    a.style.transitionDuration = dur + "ms";
    b.style.transitionDuration = dur + "ms";
    if (wrap) wrap.style.setProperty("--hero-fade", dur + "ms");
  }

  function setImage(imgEl, path) {
    const p = String(path || "").trim();
    if (!p) return;
    imgEl.onload = null;
    imgEl.onerror = null;
    imgEl.setAttribute("fetchpriority", "high");
    imgEl.removeAttribute("loading");
    imgEl.src = p;
    imgEl.srcset = "";
    imgEl.onload = hidePlaceholder;
    imgEl.onerror = function() { console.warn("[hero] failed:", p); };
  }

  function setHeroImages(cfg) {
    const slides = cfg.hero_images || [];
    if (!slides.length) return;
    const dur = toInt(cfg.hero_fade_ms, 1000);
    setFadeDuration(dur);
    let idx = 0;
    let showingA = true;

    function showNext() {
      const s = slides[idx];
      const imgEl = showingA ? a : b;
      const other = showingA ? b : a;
      setImage(imgEl, s.image || "");
      imgEl.classList.add("active");
      other.classList.remove("active");
      showingA = !showingA;
      idx = (idx + 1) % slides.length;
    }

    showNext();
    const interval = toInt(cfg.hero_interval_seconds, 8) * 1000;
    setInterval(showNext, Math.max(2000, interval));
  }

  async function init() {
    try {
      const res = await fetch("/data/home.json", { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      const cfg = await res.json();
      setHeroImages(cfg);
    } catch (e) {
      console.error("[hero]", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
