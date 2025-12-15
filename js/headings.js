(function () {
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }
  function toInt(v, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  function str(v) {
    return String(v ?? "").trim();
  }

  // Bygger marquee inni en <h2 class="scroll-title">
  function applyMarquee(el, text, enabled, speedSeconds) {
    // Hvis disabled: plain tekst
    if (!enabled) {
      el.classList.remove("is-marquee-on");
      el.setAttribute("data-marquee", "off");
      el.textContent = text;
      return;
    }

    const speed = clamp(toInt(speedSeconds, 14), 6, 60);
    el.style.setProperty("--heading-marquee-duration", `${speed}s`);

    // Ikke init 2 ganger
    if (el.dataset.marqueeInit === "1" && el.dataset.marqueeText === text) {
      // Oppdater bare speed
      el.classList.add("is-marquee-on");
      el.removeAttribute("data-marquee");
      return;
    }

    el.dataset.marqueeInit = "1";
    el.dataset.marqueeText = text;

    // Accessibility
    el.setAttribute("aria-label", text);

    // Bygg track
    const repeat = 10;
    const items = Array.from({ length: repeat }, () => `<span class="marquee-item">${text}</span>`).join(
      `<span class="marquee-sep" aria-hidden="true"></span>`
    );

    el.innerHTML = `
      <span class="marquee-clip" aria-hidden="true">
        <span class="marquee-track">
          ${items}
          ${items}
        </span>
      </span>
    `;

    // Animate
    el.classList.add("is-marquee-on");
    el.removeAttribute("data-marquee");
  }

  // Renderer ekstra innhold under heading (knapp + bilde)
  function renderExtras(id, cfg) {
    const target = document.querySelector(`[data-heading-extra="${id}"]`);
    if (!target) return;

    target.innerHTML = "";

    const buttonEnabled = !!cfg?.button_enabled;
    const buttonLabel = str(cfg?.button_label);
    const buttonHref = str(cfg?.button_href);
    const buttonNewTab = !!cfg?.button_new_tab;

    const imageSrc = str(cfg?.image_src);
    const imageAlt = str(cfg?.image_alt) || "";
    const imageHref = str(cfg?.image_href);

    // Knapp
    if (buttonEnabled && buttonLabel && buttonHref) {
      const a = document.createElement("a");
      a.className = "heading-extra-btn";
      a.textContent = buttonLabel;
      a.href = buttonHref;
      if (buttonNewTab) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      target.appendChild(a);
    }

    // Bilde (valgfritt)
    if (imageSrc) {
      const img = document.createElement("img");
      img.className = "heading-extra-img";
      img.src = imageSrc;
      img.alt = imageAlt;
      img.loading = "lazy";
      img.decoding = "async";

      if (imageHref) {
        const link = document.createElement("a");
        link.href = imageHref;
        link.appendChild(img);
        target.appendChild(link);
      } else {
        target.appendChild(img);
      }
    }

    // Hvis ingenting ble rendret, la container være tom
  }

  function getHeadingConfigMap(homeCfg) {
    const map = new Map();

    // NY struktur: homeCfg.headings[]
    const headings = Array.isArray(homeCfg?.headings) ? homeCfg.headings : [];
    headings.forEach((h) => {
      const id = str(h?.id);
      if (!id) return;
      map.set(id, h);
    });

    // Defaults
    const defaultEnabled =
      typeof homeCfg?.heading_marquee_enabled === "boolean" ? homeCfg.heading_marquee_enabled : true;

    const defaultSpeed = clamp(toInt(homeCfg?.heading_marquee_speed, 14), 6, 60);

    return { map, defaultEnabled, defaultSpeed };
  }

  function init(homeCfg) {
    const { map, defaultEnabled, defaultSpeed } = getHeadingConfigMap(homeCfg || {});

    // Finn alle headings i DOM
    const headings = document.querySelectorAll(".scroll-title");
    if (!headings.length) return;

    headings.forEach((el) => {
      // ID bestemmes av id-attributt på h2
      const id = str(el.id);
      if (!id) return;

      const cfg = map.get(id) || {};
      const text = str(cfg?.text) || str(el.textContent) || "";

      // Per-heading overrides
      const enabled =
        typeof cfg?.marquee_enabled === "boolean" ? cfg.marquee_enabled : defaultEnabled;

      const speed =
        cfg?.marquee_speed != null && cfg?.marquee_speed !== ""
          ? cfg.marquee_speed
          : defaultSpeed;

      // Oppdater tekst + marquee
      applyMarquee(el, text, enabled, speed);

      // Extras under heading
      renderExtras(id, cfg);
    });
  }

  // Kjør
  fetch("/data/home.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((cfg) => init(cfg))
    .catch(() => init({}));
})();
