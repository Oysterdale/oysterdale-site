(function () {
  const HOME_JSON = "/data/home.json";

  function clean(v) {
    return String(v ?? "").trim();
  }

  function el(tag, attrs = {}, html = "") {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v == null) return;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, String(v));
    });
    if (html) node.innerHTML = html;
    return node;
  }

  function parseSpotifyInput(input) {
    if (!input) return { src: "", height: null };
    const s = String(input).trim();

    if (/<\s*iframe/i.test(s)) {
      const src =
        (s.match(/src\s*=\s*"(.*?)"/i) || s.match(/src\s*=\s*'(.*?)'/i))?.[1] || "";
      const h =
        (s.match(/height\s*=\s*"(.*?)"/i) || s.match(/height\s*=\s*'(.*?)'/i))?.[1];
      const height = h ? parseInt(h, 10) : null;
      return { src, height };
    }

    const re =
      /^https?:\/\/open\.spotify\.com\/(playlist|album|track|show|episode)\/([A-Za-z0-9]+)(\?.*)?$/;
    const mm = s.match(re);
    if (mm) {
      return {
        src: `https://open.spotify.com/embed/${mm[1]}/${mm[2]}?utm_source=generator`,
        height: null,
      };
    }

    return { src: s, height: null };
  }

  function renderCustomSpotifySection(sectionItem) {
    const wrap = el("section", { class: "home-section spotify-custom" });
    const headingText = clean(sectionItem.heading);
    const headingId = clean(sectionItem.heading_id);

    if (headingText) {
      const h2 = el("h2", {
        class: "scroll-title",
        id: headingId || "",
      });
      h2.textContent = headingText;
      wrap.appendChild(h2);

      const extra = el("div", {
        class: "heading-extra",
        "data-heading-extra": headingId || "",
      });
      if (headingId) wrap.appendChild(extra);
    }

    const grid = el("div", { class: "spotify-grid" });

    const list = Array.isArray(sectionItem.spotify_playlists)
      ? sectionItem.spotify_playlists
      : [];

    list.forEach((p) => {
      const title = clean(p?.title);
      const raw = clean(p?.embed);
      const size = clean(p?.size).toLowerCase();
      const heightProp = p?.height != null ? parseInt(p.height, 10) : null;

      const { src, height: heightFromIframe } = parseSpotifyInput(raw);
      const height = heightProp || heightFromIframe || null;

      const compact =
        size === "compact" || (height && Number.isFinite(height) && height <= 180);

      const card = el("div", { class: `spotify-card${compact ? " compact" : ""}` });

      const iframe = el("iframe", {
        src,
        title: title ? `Spotify – ${title}` : "Spotify",
        loading: "lazy",
        allow:
          "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
      });

      if (height) iframe.setAttribute("height", String(height));
      card.appendChild(iframe);
      grid.appendChild(card);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  function renderLinksSection(sectionItem) {
    const wrap = el("section", { class: "home-section links" });

    const headingText = clean(sectionItem.heading);
    const headingId = clean(sectionItem.heading_id);

    if (headingText) {
      const h2 = el("h2", { class: "scroll-title", id: headingId || "" });
      h2.textContent = headingText;
      wrap.appendChild(h2);

      if (headingId) {
        wrap.appendChild(
          el("div", { class: "heading-extra", "data-heading-extra": headingId })
        );
      }
    }

    const list = Array.isArray(sectionItem.links) ? sectionItem.links : [];
    const row = el("div", { class: "heading-extra" });

    list.forEach((lnk) => {
      const label = clean(lnk?.label);
      const href = clean(lnk?.href);
      const newTab = !!lnk?.new_tab;
      if (!label || !href) return;

      const a = el("a", { class: "heading-extra-btn", href });
      a.textContent = label;
      if (newTab) a.setAttribute("target", "_blank");
      if (newTab) a.setAttribute("rel", "noopener");
      row.appendChild(a);
    });

    wrap.appendChild(row);
    return wrap;
  }

  function renderHeadingSection(sectionItem) {
    const wrap = el("section", { class: "home-section heading" });
    const text = clean(sectionItem.heading);
    if (!text) return wrap;

    const headingId = clean(sectionItem.heading_id);

    const h2 = el("h2", { class: "scroll-title", id: headingId || "" });
    h2.textContent = text;
    wrap.appendChild(h2);

    if (headingId) {
      wrap.appendChild(el("div", { class: "heading-extra", "data-heading-extra": headingId }));
    }

    return wrap;
  }

  function renderTextSection(sectionItem) {
    const wrap = el("section", { class: "home-section text" });

    const headingText = clean(sectionItem.heading);
    const headingId = clean(sectionItem.heading_id);

    if (headingText) {
      const h2 = el("h2", { class: "scroll-title", id: headingId || "" });
      h2.textContent = headingText;
      wrap.appendChild(h2);

      if (headingId) {
        wrap.appendChild(
          el("div", { class: "heading-extra", "data-heading-extra": headingId })
        );
      }
    }

    const body = clean(sectionItem.body);
    if (body) {
      // marked finnes allerede på siden
      try {
        wrap.appendChild(el("div", { class: "home-section-body", html: window.marked ? window.marked.parse(body) : body }));
      } catch (e) {
        wrap.appendChild(el("div", { class: "home-section-body" }, body));
      }
    }

    return wrap;
  }

  function renderHtmlSection(sectionItem) {
    const wrap = el("section", { class: "home-section html" });
    const html = String(sectionItem.html ?? "");
    wrap.innerHTML = html;
    return wrap;
  }

  function moveExistingBlock(selector, target) {
    const node = document.querySelector(selector);
    if (!node) return false;
    target.appendChild(node); // flytt (ikke klon)
    return true;
  }

  function build(cfg) {
    const host = document.getElementById("home-sections");
    if (!host) return;

    // Hvis ingen sections er definert: behold HTML-rekkefølge (gjør ingenting)
    const sections = Array.isArray(cfg?.sections) ? cfg.sections : null;
    if (!sections || !sections.length) return;

    // Nullstill host og bygg på nytt
    host.innerHTML = "";

    sections.forEach((s) => {
      const type = clean(s?.type);

      if (type === "latest_release") {
        // Flytt eksisterende “Latest Release”-blokk inn hit
        moveExistingBlock("section.latest-wrap", host);
        return;
      }

      if (type === "playlists") {
        // Flytt eksisterende “Playlists”-blokk inn hit
        moveExistingBlock("section#spotify-section", host);
        return;
      }

      if (type === "heading") {
        host.appendChild(renderHeadingSection(s));
        return;
      }

      if (type === "text") {
        host.appendChild(renderTextSection(s));
        return;
      }

      if (type === "links") {
        host.appendChild(renderLinksSection(s));
        return;
      }

      if (type === "spotify") {
        host.appendChild(renderCustomSpotifySection(s));
        return;
      }

      if (type === "html") {
        host.appendChild(renderHtmlSection(s));
        return;
      }
    });

    // Etter at vi har flyttet / laget nye headings: trigger heading-script på nytt
    // (headings.js lytter også på eventet)
    document.dispatchEvent(new CustomEvent("oysterdale:headings:refresh"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetch(HOME_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => build(cfg))
      .catch(() => build({}));
  });
})();
