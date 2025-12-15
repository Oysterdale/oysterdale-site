(function () {
  const HOME_JSON = "/data/home.json";

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function clean(v) {
    return String(v ?? "").trim();
  }

  function cdn(url, w) {
    const u = clean(url);
    if (!u) return "";
    // safe: do not encode full URL twice if already encoded — Netlify handles raw paths ok
    return `/.netlify/images?url=${encodeURIComponent(u)}&w=${w}&fm=webp&q=80&fit=contain`;
  }

  function renderExtras(target, item) {
    if (!target) return;

    const btnEnabled = !!item.button_enabled && clean(item.button_label) && clean(item.button_href);
    const imgEnabled = !!item.image_enabled && clean(item.image_src);

    if (!btnEnabled && !imgEnabled) {
      target.innerHTML = "";
      return;
    }

    const parts = [];

    if (btnEnabled) {
      const href = clean(item.button_href);
      const label = clean(item.button_label);
      const newTab = !!item.button_new_tab;

      parts.push(`
        <a class="heading-extra-btn"
           href="${href}"
           ${newTab ? `target="_blank" rel="noopener"` : ``}>
          ${label}
        </a>
      `);
    }

    if (imgEnabled) {
      const srcRaw = clean(item.image_src);
      const alt = clean(item.image_alt) || "Image";
      const img = `<img class="heading-extra-img" src="${cdn(srcRaw, 320) || srcRaw}" alt="${alt}" loading="lazy" decoding="async">`;

      const href = clean(item.image_href);
      const newTab = !!item.image_new_tab;

      if (href) {
        parts.push(`
          <a href="${href}" ${newTab ? `target="_blank" rel="noopener"` : ``}>
            ${img}
          </a>
        `);
      } else {
        parts.push(img);
      }
    }

    target.innerHTML = parts.join("");
  }

  function buildConfigMap(cfg) {
    const map = new Map();

    const list = Array.isArray(cfg?.headings) ? cfg.headings : [];
    list.forEach((h) => {
      const id = clean(h?.id);
      if (!id) return;
      map.set(id, h);
    });

    const legacyEnabled =
      typeof cfg?.heading_marquee_enabled === "boolean" ? cfg.heading_marquee_enabled : true;

    const legacySpeedRaw = Number(cfg?.heading_marquee_speed ?? 14);
    const legacySpeed = Number.isFinite(legacySpeedRaw) ? clamp(legacySpeedRaw, 6, 60) : 14;

    return { map, legacyEnabled, legacySpeed };
  }

  function measureNeedsMarquee(el) {
    const clip = el.querySelector(".marquee-clip");
    const track = el.querySelector(".marquee-track");
    if (!clip || !track) return false;
    return track.scrollWidth > clip.clientWidth * 1.05;
  }

  function initHeadings(cfg) {
    const { map, legacyEnabled, legacySpeed } = buildConfigMap(cfg || {});

    document.querySelectorAll(".scroll-title").forEach((el) => {
      const id = clean(el.id);
      const entry = id ? map.get(id) : null;

      // text from admin (fallback to existing HTML)
      const text = clean(entry?.text) || clean(el.textContent);
      if (!text) return;

      // extras (button/image under heading)
      const extraSlot = document.querySelector(`[data-heading-extra="${id}"]`);
      if (entry && extraSlot) renderExtras(extraSlot, entry);

      // manual override via HTML
      const manual = clean(el.getAttribute("data-marquee")).toLowerCase();
      if (manual === "off") {
        el.textContent = text;
        return;
      }

      const enabled =
        entry && typeof entry.marquee_enabled === "boolean"
          ? !!entry.marquee_enabled
          : legacyEnabled;

      const speedRaw =
        entry && entry.marquee_speed != null && entry.marquee_speed !== ""
          ? Number(entry.marquee_speed)
          : legacySpeed;

      const speed = Number.isFinite(speedRaw) ? clamp(speedRaw, 6, 60) : legacySpeed;

      // If disabled: plain text
      if (!enabled) {
        el.setAttribute("data-marquee", "off");
        el.textContent = text;
        return;
      }

      // Avoid double init
      if (el.dataset.marqueeInit === "1") return;
      el.dataset.marqueeInit = "1";

      el.style.setProperty("--heading-marquee-duration", `${speed}s`);
      el.setAttribute("aria-label", text);

      // Build repeating track
      const repeat = 6;
      const chunks = [];
      for (let i = 0; i < repeat; i++) chunks.push(`<span class="marquee-item">${text}</span>`);

      el.innerHTML = `
        <span class="marquee-clip" aria-hidden="true">
          <span class="marquee-track">
            ${chunks.join(`<span class="marquee-sep" aria-hidden="true"></span>`)}
            ${chunks.join(`<span class="marquee-sep" aria-hidden="true"></span>`)}
          </span>
        </span>
      `;

      if (measureNeedsMarquee(el)) {
        el.classList.add("is-marquee-on");
      } else {
        el.setAttribute("data-marquee", "off");
        el.textContent = text;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetch(HOME_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => initHeadings(cfg))
      .catch(() => initHeadings({}));
  });
})();
