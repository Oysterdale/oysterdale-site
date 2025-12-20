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

    const btnEnabled =
      !!item?.button?.enabled && clean(item?.button?.label) && clean(item?.button?.href);

    const imgEnabled = !!item?.image?.enabled && clean(item?.image?.src);

    if (!btnEnabled && !imgEnabled) {
      target.innerHTML = "";
      return;
    }

    const parts = [];

    if (btnEnabled) {
      const href = clean(item.button.href);
      const label = clean(item.button.label);
      const newTab = !!item.button.new_tab;

      parts.push(`
        <a class="heading-extra-btn"
           href="${href}"
           ${newTab ? `target="_blank" rel="noopener"` : ``}>
          ${label}
        </a>
      `);
    }

    if (imgEnabled) {
      const srcRaw = clean(item.image.src);
      const alt = clean(item.image.alt) || "Image";
      const img = `<img class="heading-extra-img" src="${cdn(srcRaw, 320) || srcRaw}" alt="${alt}" loading="lazy" decoding="async">`;

      const href = clean(item.image.href);
      const newTab = !!item.image.new_tab;

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

    // Backwards compatible defaults (if you ever used old flat keys)
    const legacyEnabled =
      typeof cfg?.heading_marquee_enabled === "boolean" ? cfg.heading_marquee_enabled : true;

    const legacySpeedRaw = Number(cfg?.heading_marquee_speed ?? 14);
    const legacySpeed = Number.isFinite(legacySpeedRaw) ? clamp(legacySpeedRaw, 6, 60) : 14;

    return { map, legacyEnabled, legacySpeed };
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
      const extraSlot = id ? document.querySelector(`[data-heading-extra="${id}"]`) : null;
      if (extraSlot) renderExtras(extraSlot, entry || {});

      // manual override via HTML attribute
      const manual = clean(el.getAttribute("data-marquee")).toLowerCase();
      if (manual === "off") {
        el.textContent = text;
        el.classList.remove("is-marquee-on");
        return;
      }

      // NEW nested structure (from config.yml):
      // entry.marquee.enabled / entry.marquee.speed
      // (fallback to old flat keys and global legacy defaults)
      const enabled =
        typeof entry?.marquee?.enabled === "boolean"
          ? !!entry.marquee.enabled
          : typeof entry?.marquee_enabled === "boolean"
          ? !!entry.marquee_enabled
          : legacyEnabled;

      const speedRaw =
        entry?.marquee?.speed != null && entry.marquee.speed !== ""
          ? Number(entry.marquee.speed)
          : entry?.marquee_speed != null && entry.marquee_speed !== ""
          ? Number(entry.marquee_speed)
          : legacySpeed;

      const speed = Number.isFinite(speedRaw) ? clamp(speedRaw, 6, 60) : legacySpeed;

      // If disabled: plain text
      if (!enabled) {
        el.setAttribute("data-marquee", "off");
        el.textContent = text;
        el.classList.remove("is-marquee-on");
        return;
      }

      // Avoid double init
      if (el.dataset.marqueeInit === "1") return;
      el.dataset.marqueeInit = "1";

      el.style.setProperty("--heading-marquee-duration", `${speed}s`);
      el.setAttribute("aria-label", text);

      // Build repeating track
      // (We ALWAYS animate when enabled – even for short text – as a visual effect.)
      const repeat = 10;
      const chunks = [];
      for (let i = 0; i < repeat; i++) chunks.push(`<span class="marquee-item">${text}</span>`);

      el.innerHTML = `
        <span class="marquee-clip" aria-hidden="true">
          <span class="marquee-track">
            ${chunks.join(`<span class="marquee-sep" aria-hidden="true"></span>`)}
          </span>
        </span>
      `;

      el.classList.add("is-marquee-on");
      el.setAttribute("data-marquee", "on");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetch(HOME_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => initHeadings(cfg))
      .catch(() => initHeadings({}));
  });
})();
