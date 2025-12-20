(function () {
  const HOME_JSON = "/data/home.json";

  function clean(v) {
    return String(v ?? "").trim();
  }

  function escapeHtml(s) {
    return clean(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseSpotifyInput(input) {
    if (!input) return { src: "", height: null };
    const s = String(input).trim();

    // Accept full iframe code pasted in admin
    if (/<\s*iframe/i.test(s)) {
      const src =
        (s.match(/src\s*=\s*"(.*?)"/i) || s.match(/src\s*=\s*'(.*?)'/i))?.[1] || "";
      const h =
        (s.match(/height\s*=\s*"(.*?)"/i) || s.match(/height\s*=\s*'(.*?)'/i))?.[1];
      const height = h ? parseInt(h, 10) : null;
      return { src, height };
    }

    // Convert common Spotify links to embed links
    // playlist/album/track/show/episode supported
    const re =
      /^https?:\/\/open\.spotify\.com\/(playlist|album|track|show|episode)\/([A-Za-z0-9]+)(\?.*)?$/;
    const mm = s.match(re);
    if (mm) {
      return {
        src: `https://open.spotify.com/embed/${mm[1]}/${mm[2]}?utm_source=generator`,
        height: null,
      };
    }

    // Sometimes people paste "spotify:playlist:ID" (URI)
    const uri = /^spotify:(playlist|album|track|show|episode):([A-Za-z0-9]+)$/i;
    const um = s.match(uri);
    if (um) {
      return {
        src: `https://open.spotify.com/embed/${um[1].toLowerCase()}/${um[2]}?utm_source=generator`,
        height: null,
      };
    }

    // If it's already an embed URL, keep it
    if (/^https?:\/\/open\.spotify\.com\/embed\//i.test(s)) {
      return { src: s, height: null };
    }

    // Unknown format -> treat as raw (may still work, but likely not)
    return { src: s, height: null };
  }

  function findHeadingTextById(cfg, headingId) {
    const id = clean(headingId);
    const list = Array.isArray(cfg?.headings) ? cfg.headings : [];
    const found = list.find((h) => clean(h?.id) === id);
    return clean(found?.text);
  }

  function renderHeadingWithExtras(headingId) {
    // We already have headings.js handling the actual <h2> elements on the page,
    // including extras in [data-heading-extra="..."] slots.
    // In sections-mode we just output the h2 + an extra slot with the right id.
    const id = clean(headingId);
    if (!id) return "";
    return `
      <h2 id="${escapeHtml(id)}" class="scroll-title">${escapeHtml(id)}</h2>
      <div class="heading-extra" data-heading-extra="${escapeHtml(id)}"></div>
    `;
  }

  function renderSpotifySection(cfg, sec) {
    const playlists = Array.isArray(sec?.spotify_playlists) ? sec.spotify_playlists : [];
    if (!playlists.length) {
      return `
        <section class="spotify-wrap">
          ${sec?.heading_id ? renderHeadingWithExtras(sec.heading_id) : ""}
          <p style="opacity:.75;margin:0;">No playlists added yet.</p>
        </section>
      `;
    }

    const cards = playlists
      .map((p) => {
        const title = clean(p?.title);
        const raw = clean(p?.embed);
        const { src, height } = parseSpotifyInput(raw);

        if (!src) {
          return `
            <div class="spotify-card">
              <div style="padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:12px;">
                <strong>${escapeHtml(title || "Spotify")}</strong>
                <div style="opacity:.75;margin-top:6px;">
                  Missing/invalid embed URL.
                </div>
              </div>
            </div>
          `;
        }

        return `
          <div class="spotify-card">
            <iframe
              src="${escapeHtml(src)}"
              title="${escapeHtml(title ? `Spotify – ${title}` : "Spotify")}"
              ${height ? `height="${height}"` : ""}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy">
            </iframe>
          </div>
        `;
      })
      .join("");

    return `
      <section class="spotify-wrap">
        ${sec?.heading_id ? renderHeadingWithExtras(sec.heading_id) : ""}
        <div class="spotify-grid">${cards}</div>
      </section>
    `;
  }

  function renderLatestReleaseSection(sec) {
    // We reuse the existing "Latest Release" renderer that already updates #latest-release.
    // Here we only output the same markup as in index.html so the existing script works.
    const headingId = clean(sec?.heading_id) || "heading-latest-release";
    return `
      <section class="latest-wrap">
        <h2 id="${escapeHtml(headingId)}" class="scroll-title">LATEST RELEASE</h2>
        <div class="heading-extra" data-heading-extra="${escapeHtml(headingId)}"></div>
        <div id="latest-release">
          <div class="skeleton" style="height:300px;border-radius:10px;"></div>
        </div>
      </section>
    `;
  }

  function renderTextSection(sec) {
    const heading = clean(sec?.heading);
    const body = clean(sec?.body);

    return `
      <section class="home-text">
        ${heading ? `<h2 class="scroll-title" data-marquee="off">${escapeHtml(heading)}</h2>` : ""}
        ${body ? `<div class="home-text-body">${window.marked ? window.marked.parse(body) : `<p>${escapeHtml(body)}</p>`}</div>` : ""}
      </section>
    `;
  }

  function renderLinksSection(sec) {
    const heading = clean(sec?.heading);
    const links = Array.isArray(sec?.links) ? sec.links : [];

    const items = links
      .map((l) => {
        const label = clean(l?.label);
        const href = clean(l?.href);
        const newTab = !!l?.new_tab;
        if (!label || !href) return "";
        return `
          <a class="heading-extra-btn"
             href="${escapeHtml(href)}"
             ${newTab ? `target="_blank" rel="noopener"` : ""}>
            ${escapeHtml(label)}
          </a>
        `;
      })
      .filter(Boolean)
      .join("");

    return `
      <section class="home-links">
        ${heading ? `<h2 class="scroll-title" data-marquee="off">${escapeHtml(heading)}</h2>` : ""}
        <div class="heading-extra">${items || ""}</div>
      </section>
    `;
  }

  function renderHtmlSection(sec) {
    const heading = clean(sec?.heading);
    const html = clean(sec?.html);
    return `
      <section class="home-html">
        ${heading ? `<h2 class="scroll-title" data-marquee="off">${escapeHtml(heading)}</h2>` : ""}
        ${html}
      </section>
    `;
  }

  function renderSections(cfg) {
    const container = document.getElementById("home-sections");
    if (!container) return;

    const sections = Array.isArray(cfg?.sections) ? cfg.sections : [];
    if (!sections.length) return;

    // Hide the old hardcoded sections (to avoid duplicates)
    const oldLatest = document.querySelector("main .latest-wrap");
    const oldSpotify = document.getElementById("spotify-section");
    if (oldLatest) oldLatest.style.display = "none";
    if (oldSpotify) oldSpotify.style.display = "none";

    const html = sections
      .map((sec) => {
        const type = clean(sec?.type);

        if (type === "spotify") return renderSpotifySection(cfg, sec);
        if (type === "latest_release") return renderLatestReleaseSection(sec);
        if (type === "text") return renderTextSection(sec);
        if (type === "links") return renderLinksSection(sec);
        if (type === "html") return renderHtmlSection(sec);

        // "heading" type optional (just a heading + extras)
        if (type === "heading") {
          const heading = clean(sec?.heading);
          return `
            <section class="home-heading">
              ${heading ? `<h2 class="scroll-title" data-marquee="off">${escapeHtml(heading)}</h2>` : ""}
            </section>
          `;
        }

        return "";
      })
      .filter(Boolean)
      .join("");

    container.innerHTML = html;

    // After we inject new headings/extras slots, headings.js will run on DOMContentLoaded.
    // But sections.js is also defer, so order matters. If headings already ran, we retrigger it by
    // dispatching a custom event it can listen to (optional) — BUT easiest is just to call
    // headings init by reloading the page once after deploy.
  }

  document.addEventListener("DOMContentLoaded", () => {
    fetch(HOME_JSON, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((cfg) => renderSections(cfg))
      .catch(() => {});
  });
})();
