(function () {
  const HOME_JSON = "/data/home.json";

  // GitHub releases-folder (for "Latest release")
  const OWNER = "Oysterdale";
  const REPO = "oysterdale-site";
  const DIR = "releases";

  function clean(v) {
    return String(v ?? "").trim();
  }

  function escapeHtml(s) {
    return clean(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function cdn(url, w) {
    const u = clean(url);
    if (!u) return "";
    return `/.netlify/images?url=${encodeURIComponent(u)}&w=${w}&fm=webp&q=80&fit=cover`;
  }

  function niceDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d)
      ? iso
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

    const re = /^https?:\/\/open\.spotify\.com\/(playlist|album|track|show|episode)\/([A-Za-z0-9]+)(\?.*)?$/;
    const mm = s.match(re);
    if (mm) {
      return {
        src: `https://open.spotify.com/embed/${mm[1]}/${mm[2]}?utm_source=generator`,
        height: null,
      };
    }

    return { src: s, height: null };
  }

  function parseFM(md) {
    const m = md.match(/^\s*---\s*[\r\n]+([\s\S]*?)\s*---\s*/);
    const data = {};
    if (!m) return data;

    const yaml = m[1].replace(/\t/g, " ");
    const lines = yaml.split(/\r?\n/);
    let key = null,
      currentItem = null;

    lines.forEach((line) => {
      if (!line.trim()) return;

      const top = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (top && !line.startsWith(" ")) {
        key = top[1];
        const val = top[2].trim();
        data[key] = val === "" ? data[key] ?? null : val.replace(/^"(.*)"$/, "$1");
        currentItem = null;
        return;
      }

      const li = key && line.match(/^\s{2}-\s*(.*)$/);
      if (li) {
        if (!Array.isArray(data[key])) data[key] = [];
        const rest = li[1];
        const kv = rest.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
        if (kv) {
          currentItem = {};
          currentItem[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1");
          data[key].push(currentItem);
        } else {
          data[key].push(rest.replace(/^"(.*)"$/, "$1"));
          currentItem = null;
        }
        return;
      }

      const child = currentItem && line.match(/^\s{4}([A-Za-z0-9_]+):\s*(.*)$/);
      if (child) {
        currentItem[child[1]] = child[2].replace(/^"(.*)"$/, "$1");
      }
    });

    return data;
  }

  function artistsToString(artists) {
    if (Array.isArray(artists)) {
      const names = artists
        .map((a) => (typeof a === "string" ? a : (a && (a.artist || a.name)) || ""))
        .filter(Boolean);
      return names.join(" | ");
    }
    return clean(artists);
  }

  async function fetchLatestRelease() {
    const list = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${DIR}`,
      { cache: "no-store" }
    ).then((r) => r.json());

    const files = Array.isArray(list) ? list.filter((f) => f.name.endsWith(".md")) : [];
    const entries = await Promise.all(
      files.map(async (f) => {
        const md = await fetch(f.download_url, { cache: "no-store" }).then((r) => r.text());
        const fm = parseFM(md);
        return { data: fm, date: new Date(fm.date || 0) };
      })
    );

    entries.sort((a, b) => b.date - a.date);
    return entries[0]?.data || null;
  }

  function renderHeadingBlock(headingId, fallbackText) {
    const id = clean(headingId);
    const text = clean(fallbackText);

    // headings.js vil senere bytte tekst + marquee + button/image basert på home.json.headings
    // derfor må vi bare sørge for at elementene finnes med riktig id + .scroll-title
    if (!id && !text) return "";

    const safeId = id || "";
    const safeText = escapeHtml(text || "SECTION");

    return `
      <h2 ${safeId ? `id="${escapeHtml(safeId)}"` : ""} class="scroll-title">${safeText}</h2>
      ${safeId ? `<div class="heading-extra" data-heading-extra="${escapeHtml(safeId)}"></div>` : ``}
    `;
  }

  function renderSectionText(md) {
    const raw = clean(md);
    if (!raw) return "";
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(raw);
    }
    // fallback: basic
    return `<p>${escapeHtml(raw)}</p>`;
  }

  async function renderLatestInto(slotEl) {
    if (!slotEl) return;
    slotEl.innerHTML = `<div class="skeleton" style="height:300px;border-radius:10px;"></div>`;

    try {
      const data = await fetchLatestRelease();
      if (!data) return;

      const artistStr = artistsToString(data.artists || data.artist);
      const title = clean(data.title);
      const cover = clean(data.cover);
      const date = clean(data.date);

      slotEl.innerHTML = `
        <div class="release latest">
          <div class="release-header">
            ${artistStr ? `<h2 class="release-artist">${escapeHtml(artistStr)}</h2>` : ``}
            ${title ? `<h3 class="release-title">${escapeHtml(title)}</h3>` : ``}
          </div>
          ${
            cover
              ? `<a href="/releases.html"><img src="${escapeHtml(cover)}" class="release-cover" alt="${escapeHtml(title || "Release")} cover" loading="lazy" decoding="async"></a>`
              : ``
          }
          ${date ? `<p class="release-date">Release date: ${escapeHtml(niceDate(date))}</p>` : ``}
        </div>
      `;
    } catch (e) {
      // silent
    }
  }

  function renderSpotifyGrid(items) {
    const playlists = Array.isArray(items) ? items : [];
    if (!playlists.length) return "";

    const cards = playlists
      .map((p) => {
        const isString = typeof p === "string";
        const title = !isString ? clean(p.title) : "";
        const raw = isString ? p : clean(p.embed);
        const hProp = !isString && p.height ? parseInt(p.height, 10) : null;

        const { src, height: hFromIframe } = parseSpotifyInput(raw);
        const height = hProp || hFromIframe || null;

        if (!src) return "";

        return `
          <div class="spotify-card">
            <iframe
              src="${escapeHtml(src)}"
              title="${escapeHtml(title ? `Spotify – ${title}` : "Spotify")}"
              ${height ? `height="${height}"` : ``}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"></iframe>
          </div>
        `;
      })
      .join("");

    return `<div class="spotify-grid">${cards}</div>`;
  }

  function buildSectionHTML(section) {
    const type = clean(section?.type);

    // Wrapper
    let html = `<section class="home-section home-section-${escapeHtml(type || "unknown")}">`;

    if (type === "latest_release") {
      const headingId = clean(section?.heading_id) || "heading-latest-release";
      html += renderHeadingBlock(headingId, "LATEST RELEASE");
      html += `<div class="latest-wrap"><div class="latest-release-slot" data-latest-release-slot="1"></div></div>`;
      html += `</section>`;
      return html;
    }

    if (type === "spotify") {
      const headingId = clean(section?.heading_id) || "heading-playlists";
      html += renderHeadingBlock(headingId, "PLAYLISTS");
      html += renderSpotifyGrid(section?.spotify_playlists);
      html += `</section>`;
      return html;
    }

    if (type === "heading") {
      const h = clean(section?.heading);
      if (h) html += `<h2 class="scroll-title" data-marquee="off">${escapeHtml(h)}</h2>`;
      html += `</section>`;
      return html;
    }

    if (type === "text") {
      const h = clean(section?.heading);
      if (h) html += `<h2 class="scroll-title" data-marquee="off">${escapeHtml(h)}</h2>`;
      html += `<div class="home-section-body">${renderSectionText(section?.body)}</div>`;
      html += `</section>`;
      return html;
    }

    if (type === "links") {
      const h = clean(section?.heading);
      if (h) html += `<h2 class="scroll-title" data-marquee="off">${escapeHtml(h)}</h2>`;

      const links = Array.isArray(section?.links) ? section.links : [];
      const buttons = links
        .map((l) => {
          const label = clean(l?.label);
          const href = clean(l?.href);
          const newTab = !!l?.new_tab;
          if (!label || !href) return "";
          return `
            <a class="heading-extra-btn"
               href="${escapeHtml(href)}"
               ${newTab ? `target="_blank" rel="noopener"` : ``}>
              ${escapeHtml(label)}
            </a>
          `;
        })
        .join("");

      html += `<div class="heading-extra">${buttons}</div>`;
      html += `</section>`;
      return html;
    }

    if (type === "html") {
      const h = clean(section?.heading);
      if (h) html += `<h2 class="scroll-title" data-marquee="off">${escapeHtml(h)}</h2>`;
      html += `<div class="home-section-html">${section?.html || ""}</div>`;
      html += `</section>`;
      return html;
    }

    // fallback
    html += `</section>`;
    return html;
  }

  function init(cfg) {
    const wrap = document.getElementById("home-sections");
    if (!wrap) return;

    const sections = Array.isArray(cfg?.sections) ? cfg.sections : [];
    if (!sections.length) {
      wrap.innerHTML = "";
      return;
    }

    wrap.innerHTML = sections.map(buildSectionHTML).join("");

    // Fill latest release slot(s)
    wrap.querySelectorAll("[data-latest-release-slot='1']").forEach((slot) => {
      renderLatestInto(slot);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetch(HOME_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => init(cfg))
      .catch(() => init({}));
  });
})();
