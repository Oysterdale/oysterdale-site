(function () {
  // Finn alle seksjoner som kan få “home headings”
  // Du kan bruke én eller flere på samme side.
  // 1) Legg inn <div class="home-headings" data-home-headings></div> der du vil ha dem
  // 2) Hvis du vil styre per-seksjon: data-heading-id="latest-release" osv (valgfritt)

  function toInt(v, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  }

  function safeStr(v) {
    return String(v ?? "").trim();
  }

  function setMarqueeSpeedSeconds(container, secondsPerLoop) {
    const s = Math.max(6, toInt(secondsPerLoop, 14));
    container.style.setProperty("--marquee-seconds", `${s}s`);
  }

  function buildItem(item) {
    const text = safeStr(item?.text);
    if (!text) return null;

    const row = document.createElement("div");
    row.className = "home-heading-row";

    const h = document.createElement("div");
    h.className = "home-heading-text";
    h.textContent = text;

    row.appendChild(h);

    const btnEnabled = !!item?.button_enabled;
    const btnLabel = safeStr(item?.button_label);
    const btnHref = safeStr(item?.button_href);

    if (btnEnabled && btnLabel && btnHref) {
      const a = document.createElement("a");
      a.className = "home-heading-btn";
      a.textContent = btnLabel;
      a.href = btnHref;

      const newTab = !!item?.button_new_tab;
      if (newTab) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }

      row.appendChild(a);
    }

    return row;
  }

  function renderInto(container, cfg) {
    const items = Array.isArray(cfg?.heading_items) ? cfg.heading_items : [];
    container.innerHTML = "";

    // ingenting å vise
    if (!items.length) return;

    // wrapper: brukes til marquee (scroll)
    const outer = document.createElement("div");
    outer.className = "home-headings-outer";

    const inner = document.createElement("div");
    inner.className = "home-headings-inner";

    // Lag “content”-blokk
    const content = document.createElement("div");
    content.className = "home-headings-content";

    items.forEach((it) => {
      const row = buildItem(it);
      if (row) content.appendChild(row);
    });

    inner.appendChild(content);

    const enabled = cfg?.heading_marquee_enabled !== false;

    if (enabled) {
      // Dupliser content for sømløs loop
      const clone = content.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      inner.appendChild(clone);

      outer.classList.add("is-marquee");
      setMarqueeSpeedSeconds(outer, cfg?.heading_marquee_speed);
    } else {
      outer.classList.add("is-static");
    }

    outer.appendChild(inner);
    container.appendChild(outer);
  }

  // Kjør
  const targets = document.querySelectorAll("[data-home-headings]");
  if (!targets.length) return;

  fetch("/data/home.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : {}))
    .then((cfg) => {
      targets.forEach((t) => renderInto(t, cfg));
    })
    .catch(() => {});
})();
