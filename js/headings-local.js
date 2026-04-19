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
    return url;
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

    // Legacy global defaults
    const legacyEnabled =
      typeof cfg?.heading_marquee_enabled === "boolean" ? cfg.heading_marquee_enabled : true;

    const legacySpeedRaw = Number(cfg?.heading_marquee_speed ?? 22);
    const legacySpeed = Number.isFinite(legacySpeedRaw) ? clamp(legacySpeedRaw, 6, 60) : 22;

    return { map, legacyEnabled, legacySpeed };
  }

  function applyToHeading(el, entry, legacyEnabled, legacySpeed) {
    if (!el) return;

    const id = clean(el.id);

    // tekst: fra cfg eller fra HTML
    const text = clean(entry?.text) || clean(el.textContent);
    if (!text) return;

    // extras under heading
    const extraSlot = id ? document.querySelector(`[data-heading-extra="${id}"]`) : null;
    if (extraSlot) renderExtras(extraSlot, entry || {});

    // manual override via HTML attribute
    const manual = clean(el.getAttribute("data-marquee")).toLowerCase();
    if (manual === "off") {
      el.textContent = text;
      el.classList.remove("is-marquee-on");
      return;
    }

    // Enabled + speed (nested first, fallback to older flat keys, then legacy)
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

    if (!enabled) {
      el.setAttribute("data-marquee", "off");
      el.textContent = text;
      el.classList.remove("is-marquee-on");
      return;
    }

    // Re-init hver gang for å være trygg (siden sections.js kan flytte rundt)
    el.dataset.marqueeInit = "1";
    el.style.setProperty("--heading-marquee-duration", `${speed}s`);
    el.setAttribute("aria-label", text);

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
  }

  function initHeadings(cfg) {
    const { map, legacyEnabled, legacySpeed } = buildConfigMap(cfg || {});

    document.querySelectorAll(".scroll-title").forEach((el) => {
      const id = clean(el.id);
      const entry = id ? map.get(id) : null;
      applyToHeading(el, entry, legacyEnabled, legacySpeed);
    });
  }

  function fetchAndInit() {
    fetch(HOME_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => initHeadings(cfg))
      .catch(() => initHeadings({}));
  }

  document.addEventListener("DOMContentLoaded", fetchAndInit);

  // Når sections.js er ferdig og flytter/lager headings, kjører vi på nytt
  document.addEventListener("oysterdale:headings:refresh", fetchAndInit);
})();
