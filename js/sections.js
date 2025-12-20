(function () {
  const HOME_JSON = "/data/home.json";

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function clean(v) {
    return String(v ?? "").trim();
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseSpotifyInput(input) {
    if (!input) return { src: "", height: null };
    const s = String(input).trim();

    // If iframe pasted
    if (/<\s*iframe/i.test(s)) {
      const src =
        (s.match(/src\s*=\s*"(.*?)"/i) || s.match(/src\s*=\s*'(.*?)'/i))?.[1] || "";
      const h = (s.match(/height\s*=\s*"(.*?)"/i) || s.match(/height\s*=\s*'(.*?)'/i))?.[1];
      const height = h ? parseInt(h, 10) : null;
      return { src, height };
    }

    // If open.spotify URL
    const re =
      /^https?:\/\/open\.spotify\.com\/(playlist|album|track|show|episode)\/([A-Za-z0-9]+)(\?.*)?$/;
    const mm = s.match(re);
    if (mm) {
      return {
        src: `https://open.spotify.com/embed/${mm[1]}/${mm[2]}?utm_source=generator`,
        height: null,
      };
    }

    // Otherwise assume it's already an embed src
    return { src: s, height: null };
  }

  function applyMarquee(el, text, enabled, speedSeconds) {
    if (!el) return;
    const t = clean(text);
    if (!t) return;

    // If disabled: plain text
    if (!enabled) {
      el.setAttribute("data-marquee", "off");
      el.textContent = t;
      el.classList.remove("is-marquee-on");
      return;
    }

    // Avoid double init
    if (el.dataset.marqueeInit === "1") return;
    el.dataset.marqueeInit = "1";

    const speed = clamp(Number(speedSeconds || 22), 6, 120);

    el.style.setProperty("--heading-marquee-duration", `${speed}s`);
    el.setAttribute("aria-label", t);

    // Repeat enough times so it ALWAYS looks like a continuous scroll,
    // also for long words.
    const repeat = 10;
    const chunks = [];
    for (let i = 0; i < repeat; i++) {
      chunks.push(`<span class="marquee-item">${esc(t)}</span>`);
    }

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

  function renderHeadingHTML(headingText, marqueeObj, idx) {
    const h = clean(headingText);
    if (!h) return "";

    const enabled = typeof marqueeObj?.enabled === "boolean" ? !!marqueeObj.enabled : false;
    const speedRaw = marqueeObj?.speed != null && marqueeObj?.speed !== "" ? Number(marqueeObj.speed) : 22;
    const speed = Number.isFinite(speedRaw) ? clamp(speedRaw, 6, 120) : 22;

    // We generate an id so we can apply marquee after injecting HTML
    const id = `section-heading-${idx}`;

    return `
      <h2 id="${id}" class="scroll-title">${esc(h)}</h2>
      <div class="heading-extra" data-section-extra="${id}"></div>
    `.trim();
  }

  function renderLinks(list) {
    const items = Array.isArray(list) ? list : [];
    if (!items.length) return "";

    const btns = items
      .map((l) => {
        const label = clean(l?.label);
        const href = clean(l?.href);
        const newTab = !!l?.new_tab;
        if (!label || !href) return "";
        return `
          <a class="heading-extra-btn" href="${esc(href)}" ${
            newTab ? `target="_blank" rel="noopener"` : ``
          }>${esc(label)}</a>
        `;
      })
      .filter(Boolean)
      .join("");

    if (!btns) return "";
    return `<div class="heading-extra">${btns}</div>`;
  }

  function renderText(bodyMd) {
    const md = clean(bodyMd);
    if (!md) return "";
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(md);
    }
    // fallback (no marked): basic escape
    return `<p>${esc(md)}</p>`;
  }

  function renderSpotify(list) {
    const items = Array.isArray(list) ? list : [];
    if (!items.length) return "";

    const cards = items
      .map((p) => {
        const title = clean(p?.title);
        const raw = clean(p?.embed);
        if (!raw) return "";

        const { src, height: hFromIframe } = parseSpotifyInput(raw);
        if (!src) return "";

        // default sizes (match your CSS)
        const height = Number.isFinite(hFromIframe) ? hFromIframe : null;
        const compact = (height && height <= 180) ? " compact" : "";

        return `
          <div class="spotify-card${compact}">
            <iframe
              src="${esc(src)}"
              title="${esc(title ? `Spotify – ${title}` : "Spotify")}"
              ${height ? `height="${height}"` : ""}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"></iframe>
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    if (!cards) return "";
    return `<div class="spotify-grid">${cards}</div>`;
  }

  function renderSections(container, cfg) {
    if (!container) return;

    const sections = Array.isArray(cfg?.sections) ? cfg.sections : [];
    if (!sections.length) {
      container.innerHTML = "";
      return;
    }

    const html = sections
      .map((s, idx) => {
        const type = clean(s?.type).toLowerCase();
        const heading = clean(s?.heading);
        const marquee = s?.marquee || null;

        // We wrap each section for spacing consistency
        let out = `<section class="home-section" data-section-type="${esc(type)}">`;

        // Optional heading
        if (heading) {
          out += renderHeadingHTML(heading, marquee, idx);
        }

        if (type === "heading") {
          // only heading (visual separator)
        } else if (type === "text") {
          out += `<div class="home-section-body">${renderText(s?.body)}</div>`;
        } else if (type === "links") {
          out += renderLinks(s?.links);
        } else if (type === "spotify") {
          out += renderSpotify(s?.spotify_playlists);
        } else if (type === "html") {
          // advanced: raw html
          out += `<div class="home-section-body">${clean(s?.html)}</div>`;
        } else {
          // unknown type: ignore safely
        }

        out += `</section>`;
        return out;
      })
      .join("\n");

    container.innerHTML = html;

    // After injecting: apply marquee on any generated headings
    sections.forEach((s, idx) => {
      const heading = clean(s?.heading);
      if (!heading) return;

      const el = document.getElementById(`section-heading-${idx}`);
      const marquee = s?.marquee || {};
      const enabled = typeof marquee?.enabled === "boolean" ? !!marquee.enabled : false;
      const speedRaw =
        marquee?.speed != null && marquee?.speed !== "" ? Number(marquee.speed) : 22;
      const speed = Number.isFinite(speedRaw) ? clamp(speedRaw, 6, 120) : 22;

      applyMarquee(el, heading, enabled, speed);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("home-sections");
    if (!container) return;

    fetch(HOME_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => renderSections(container, cfg || {}))
      .catch(() => renderSections(container, {}));
  });
})();
