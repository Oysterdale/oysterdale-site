(function () {
  const HOME_JSON = "/data/home.json";

  function clamp(n, min, max) {
    const num = Number(n);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function clean(v) {
    return String(v ?? "").trim();
  }

  function cdn(url, w) {
    const u = clean(url);
    if (!u) return "";
    return `/.netlify/images?url=${encodeURIComponent(u)}&w=${w}&fm=webp&q=80&fit=contain`;
  }

  /**
   * Normaliserer heading-config slik at vi kan støtte både:
   * - NY struktur: marquee/button/image som object
   * - LEGACY: marquee_enabled, marquee_speed, button_enabled, ...
   *
   * Viktig: Hvis item.button === null, tolker vi det som "intensjonelt av",
   * og ignorerer alle legacy button_* felter.
   */
  function normalizeHeading(item) {
    const id = clean(item?.id);
    const text = clean(item?.text);

    // --- Marquee: prefer new object, else legacy, else null ---
    const marqueeObj = item && typeof item.marquee === "object" ? item.marquee : null;
    const marqueeEnabled =
      marqueeObj && typeof marqueeObj.enabled === "boolean"
        ? !!marqueeObj.enabled
        : typeof item?.marquee_enabled === "boolean"
        ? !!item.marquee_enabled
        : null; // betyr "bruk global default"

    const marqueeSpeedRaw =
      marqueeObj && marqueeObj.speed != null && marqueeObj.speed !== ""
        ? marqueeObj.speed
        : item?.marquee_speed != null && item.marquee_speed !== ""
        ? item.marquee_speed
        : null;

    // --- Button: object, null (hard off), legacy fallback ---
    let buttonEnabled = false;
    let buttonLabel = "";
    let buttonHref = "";
    let buttonNewTab = false;

    const buttonObj = item && typeof item.button === "object" ? item.button : null;

    if (buttonObj) {
      buttonEnabled = !!buttonObj.enabled;
      buttonLabel = clean(buttonObj.label);
      buttonHref = clean(buttonObj.href);
      buttonNewTab = !!buttonObj.new_tab;
    } else if (item && Object.prototype.hasOwnProperty.call(item, "button") && item.button === null) {
      // HARD OFF
      buttonEnabled = false;
    } else {
      // legacy fallback
      buttonEnabled = !!item?.button_enabled;
      buttonLabel = clean(item?.button_label);
      buttonHref = clean(item?.button_href);
      buttonNewTab = !!item?.button_new_tab;
    }

    // --- Image: prefer new object, else legacy ---
    let imageEnabled = false;
    let imageSrc = "";
    let imageAlt = "";
    let imageHref = "";
    let imageNewTab = false;

    const imageObj = item && typeof item.image === "object" ? item.image : null;

    if (imageObj) {
      imageEnabled = !!imageObj.enabled;
      imageSrc = clean(imageObj.src);
      imageAlt = clean(imageObj.alt);
      imageHref = clean(imageObj.href);
      imageNewTab = !!imageObj.new_tab;
    } else {
      imageEnabled = !!item?.image_enabled;
      imageSrc = clean(item?.image_src);
      imageAlt = clean(item?.image_alt);
      imageHref = clean(item?.image_href);
      imageNewTab = !!item?.image_new_tab;
    }

    return {
      id,
      text,
      marquee: {
        enabled: marqueeEnabled, // kan være null => global default
        speed: marqueeSpeedRaw,  // kan være null => global/default
      },
      button: {
        enabled: buttonEnabled,
        label: buttonLabel,
        href: buttonHref,
        new_tab: buttonNewTab,
      },
      image: {
        enabled: imageEnabled,
        src: imageSrc,
        alt: imageAlt,
        href: imageHref,
        new_tab: imageNewTab,
      },
      // for kompatibilitet / debugging om ønskelig
      _raw: item,
    };
  }

  function renderExtras(target, heading) {
    if (!target) return;

    const btnEnabled =
      !!heading?.button?.enabled && clean(heading?.button?.label) && clean(heading?.button?.href);

    const imgEnabled = !!heading?.image?.enabled && clean(heading?.image?.src);

    if (!btnEnabled && !imgEnabled) {
      target.innerHTML = "";
      return;
    }

    const parts = [];

    if (btnEnabled) {
      const href = clean(heading.button.href);
      const label = clean(heading.button.label);
      const newTab = !!heading.button.new_tab;

      parts.push(`
        <a class="heading-extra-btn"
           href="${href}"
           ${newTab ? `target="_blank" rel="noopener"` : ``}>
          ${label}
        </a>
      `);
    }

    if (imgEnabled) {
      const srcRaw = clean(heading.image.src);
      const alt = clean(heading.image.alt) || "Image";
      const src = cdn(srcRaw, 320) || srcRaw;

      const img = `<img class="heading-extra-img" src="${src}" alt="${alt}" loading="lazy" decoding="async">`;

      const href = clean(heading.image.href);
      const newTab = !!heading.image.new_tab;

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
      const norm = normalizeHeading(h);
      if (!norm.id) return;
      map.set(norm.id, norm);
    });

    // Global legacy defaults
    const legacyEnabled =
      typeof cfg?.heading_marquee_enabled === "boolean" ? cfg.heading_marquee_enabled : true;

    const legacySpeedRaw = Number(cfg?.heading_marquee_speed ?? 14);
    const legacySpeed = Number.isFinite(legacySpeedRaw) ? clamp(legacySpeedRaw, 6, 80) : 14;

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
      if (extraSlot && entry) renderExtras(extraSlot, entry);
      if (extraSlot && !entry) extraSlot.innerHTML = "";

      // manual override via HTML attribute
      const manual = clean(el.getAttribute("data-marquee")).toLowerCase();
      if (manual === "off") {
        el.textContent = text;
        el.classList.remove("is-marquee-on");
        return;
      }

      // Determine marquee enabled:
      // 1) entry.marquee.enabled (if boolean)
      // 2) legacy per-heading (already normalized -> entry.marquee.enabled could be null)
      // 3) global legacy defaults
      const enabled =
        typeof entry?.marquee?.enabled === "boolean" ? entry.marquee.enabled : legacyEnabled;

      // Determine speed (seconds per loop):
      const speedRaw =
        entry?.marquee?.speed != null && entry.marquee.speed !== ""
          ? Number(entry.marquee.speed)
          : legacySpeed;

      const speed = Number.isFinite(speedRaw) ? clamp(speedRaw, 6, 80) : legacySpeed;

      // If disabled: plain text
      if (!enabled) {
        el.setAttribute("data-marquee", "off");
        el.textContent = text;
        el.classList.remove("is-marquee-on");
        el.dataset.marqueeInit = "0";
        return;
      }

      // Avoid double init
      if (el.dataset.marqueeInit === "1") {
        // men oppdater speed og label (hvis admin endrer)
        el.style.setProperty("--heading-marquee-duration", `${speed}s`);
        el.setAttribute("aria-label", text);
        return;
      }
      el.dataset.marqueeInit = "1";

      el.style.setProperty("--heading-marquee-duration", `${speed}s`);
      el.setAttribute("aria-label", text);

      // Build repeating track
      // Vi animerer ALLTID når enabled (kul effekt) – også for korte ord.
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
