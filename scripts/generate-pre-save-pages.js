#!/usr/bin/env node
/**
 * Generate static Spotify pre-save landing pages from markdown frontmatter.
 * Pages are built into pre-save/{slug}/index.html and are excluded from
 * navigation, release listings, search and the sitemap (noindex meta tag).
 *
 * Run: node scripts/generate-pre-save-pages.js
 */

const fs = require('fs');
const path = require('path');

const PRE_SAVES_DIR = path.join(__dirname, '..', 'pre-saves');
const OUTPUT_ROOT = path.join(__dirname, '..', 'pre-save');
const TEMPLATE_PATH = path.join(__dirname, '..', 'pre-save', 'pre-save-template.html');
const SETTINGS_PATH = path.join(__dirname, '..', 'content', 'pre-save-settings.md');
const JSON_OUTPUT = path.join(__dirname, '..', 'pre-saves.json');
const SITE_URL = 'https://oysterdalerecords.com';

// ---------- Frontmatter parsing (flat scalar fields only) ----------

function parseFrontmatter(md) {
  const parts = md.split('---');
  if (parts.length < 3) return { data: {}, content: md };

  const yaml = parts[1];
  const content = parts.slice(2).join('---').trim();
  const data = {};

  for (const line of yaml.split(/\r?\n/)) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if (val === 'null' || val === '~') val = null;
    else if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else val = val.replace(/^["']|["']$/g, '');
    data[key] = val;
  }
  return { data, content };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SPOTIFY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.4-.7.5-1 .3-2.9-1.8-6.5-2.2-10.7-1.2-.4.1-.8-.2-.9-.6-.1-.4.2-.8.6-.9 4.6-1 8.5-.6 11.7 1.4.3.2.4.7.3 1zm1.5-3.3c-.3.4-.8.6-1.3.3-3.3-2-8.3-2.6-12.2-1.4-.5.1-1-.1-1.2-.6-.1-.5.1-1 .6-1.2 4.5-1.4 10-.7 13.8 1.6.4.3.6.9.3 1.3zm.1-3.4C15.3 8.3 9 8 5.4 9.2c-.6.2-1.2-.1-1.4-.7-.2-.6.1-1.2.7-1.4 4.2-1.3 11.2-1 15.6 1.5.5.3.7 1 .4 1.5-.3.5-1 .7-1.5.4z"/></svg>';

function buildPixelSnippet(pixelId) {
  if (!pixelId) return { snippet: '', id: '' };
  const id = String(pixelId).replace(/[^0-9]/g, '');
  if (!id) return { snippet: '', id: '' };
  const snippet = `
  <div class="consent-bar" id="consent-bar" role="dialog" aria-label="Cookie consent">
    <p>We use cookies to measure how our ads perform (Meta Pixel). Accept marketing cookies?</p>
    <div class="consent-actions">
      <button class="accept" id="consent-accept" type="button">Accept</button>
      <button id="consent-reject" type="button">Reject</button>
    </div>
  </div>
  <script>
  (function () {
    var PIXEL_ID = '${id}';
    var bar = document.getElementById('consent-bar');
    var choice = localStorage.getItem('oy_consent_marketing');
    if (choice === 'yes') { loadPixel(); } else { bar.style.display = 'block'; }
    document.getElementById('consent-accept').addEventListener('click', function () {
      localStorage.setItem('oy_consent_marketing', 'yes'); bar.style.display = 'none'; loadPixel();
    });
    document.getElementById('consent-reject').addEventListener('click', function () {
      localStorage.setItem('oy_consent_marketing', 'no'); bar.style.display = 'none';
    });
    function loadPixel() {
      if (window.fbq) return;
      var n = window.fbq = function () { n.queue.push(arguments); }; n.queue = [];
      var s = document.createElement('script'); s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
      fbq('init', PIXEL_ID); fbq('track', 'PageView');
    }
  })();
  <\/script>`;
  return { snippet, id };
}

function generatePage(mdFile, settings) {
  const md = fs.readFileSync(mdFile, 'utf-8');
  const { data } = parseFrontmatter(md);

  const isPublished = data.published === true || data.published === 'true';
  if (!isPublished) return null; // drafts never reach the website

  const slug = path.basename(mdFile, '.md');
  const title = (data.title || slug).trim();
  const artists = (data.artists || '').trim();
  const cover = (data.cover || '').trim();
  const releaseDate = (data.release_date || '').trim();
  const timezone = (data.timezone || settings.default_timezone || 'Europe/Oslo').trim();
  const presaveUrl = (data.presave_url || '').trim();
  const releaseSlug = (data.release_slug || '').trim();
  const spotifyUrl = (data.spotify_url || '').trim();
  const keepPreSave = data.keep_pre_save === true || data.keep_pre_save === 'true';

  // Safety gate: never publish an incomplete or broken pre-save page.
  const problems = [];
  if (!presaveUrl) problems.push('missing pre-save link');
  else if (!/^https?:\/\//i.test(presaveUrl)) problems.push('pre-save link must start with http:// or https://');
  if (!releaseDate) problems.push('missing Spotify release date');
  if (!releaseSlug) problems.push('missing public release page slug');
  if (!cover) problems.push('missing cover artwork');
  if (problems.length) {
    console.warn(`\u26a0 Skipped pre-save/${slug}/ (${title}) — ${problems.join('; ')}`);
    console.warn('  Fix the fields in Sveltia CMS and save again. The page stays OFFLINE until complete.\n');
    return null;
  }

  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const pageTitle = artists ? `${title} — ${artists}` : title;
  const metaDescription = `Pre-save "${title}"${artists ? ` by ${artists}` : ''} on Spotify. Out ${formatDate(releaseDate)} on Oysterdale Records.`;

  const coverImg = cover
    ? `<img class="cover" src="${escapeHtml(cover)}" alt="${escapeHtml(title)} cover artwork" onerror="this.style.display='none'">`
    : '';

  const presaveButton = presaveUrl
    ? `<a class="presave-btn" id="presave-btn" href="${escapeHtml(presaveUrl)}" target="_blank" rel="noopener nofollow">${SPOTIFY_ICON}<span>Pre-save on Spotify</span></a>`
    : `<p class="note" style="display:block">Pre-save link coming soon.</p>`;

  const secondary = (spotifyUrl && presaveUrl)
    ? `<a class="secondary" href="${escapeHtml(spotifyUrl)}" target="_blank" rel="noopener">Listen on Spotify</a>`
    : '';

  const configJson = JSON.stringify({
    release_date: releaseDate,
    timezone: timezone,
    release_slug: releaseSlug,
    keep_pre_save: keepPreSave,
    meta_pixel_id: settings.meta_pixel_id || ''
  }).replace(/<\//g, '<\\/');

  const ogImage = cover.startsWith('http') ? cover : SITE_URL + cover;

  template = template
    .replace(/\{\{\s*page_title\s*\}\}/gi, escapeHtml(pageTitle))
    .replace(/\{\{\s*meta_description\s*\}\}/gi, escapeHtml(metaDescription))
    .replace(/\{\{\s*slug\s*\}\}/gi, slug)
    .replace(/\{\{\s*og_image\s*\}\}/gi, escapeHtml(ogImage))
    .replace(/\{\{\s*cover_img\s*\}\}/gi, coverImg)
    .replace(/\{\{\s*title\s*\}\}/gi, escapeHtml(title))
    .replace(/\{\{\s*artists\s*\}\}/gi, escapeHtml(artists))
    .replace(/\{\{\s*release_date_display\s*\}\}/gi, escapeHtml(formatDate(releaseDate)))
    .replace(/\{\{\s*presave_button\s*\}\}/gi, presaveButton + secondary)
    .replace(/\{\{\s*missing_notice_display\s*\}\}/gi, 'none')
    .replace(/\{\{\s*pixel_snippet\s*\}\}/gi, buildPixelSnippet(settings.meta_pixel_id).snippet)
    .replace(/\{\{\s*config_json\s*\}\}/gi, configJson);

  const outputDir = path.join(OUTPUT_ROOT, slug);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), template);
  console.log(`✓ Generated: pre-save/${slug}/index.html`);

  return {
    slug,
    title,
    artists,
    cover,
    release_date: releaseDate,
    timezone,
    release_slug: releaseSlug,
    keep_pre_save: keepPreSave
  };
}

function loadSettings() {
  const defaults = { meta_pixel_id: '', default_timezone: 'Europe/Oslo' };
  if (!fs.existsSync(SETTINGS_PATH)) return defaults;
  const { data } = parseFrontmatter(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  return {
    meta_pixel_id: (data.meta_pixel_id || '').trim(),
    default_timezone: (data.default_timezone || 'Europe/Oslo').trim()
  };
}

function cleanupStalePages(publishedSlugs) {
  if (!fs.existsSync(OUTPUT_ROOT)) return;
  for (const entry of fs.readdirSync(OUTPUT_ROOT)) {
    const dir = path.join(OUTPUT_ROOT, entry);
    if (!fs.statSync(dir).isDirectory()) continue; // keeps pre-save-template.html at root
    if (!publishedSlugs.has(entry)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✗ Removed stale page: pre-save/${entry}/`);
    }
  }
}

function main() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('Error: pre-save-template.html not found at', TEMPLATE_PATH);
    process.exit(1);
  }

  const settings = loadSettings();
  fs.mkdirSync(PRE_SAVES_DIR, { recursive: true });

  const files = fs.readdirSync(PRE_SAVES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(PRE_SAVES_DIR, f));

  console.log(`Found ${files.length} pre-save entr${files.length === 1 ? 'y' : 'ies'}\n`);

  const published = [];
  for (const file of files) {
    const entry = generatePage(file, settings);
    if (entry) published.push(entry);
  }

  cleanupStalePages(new Set(published.map(e => e.slug)));

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(published, null, 2));
  console.log(`\n✓ Generated: pre-saves.json (${published.length} published, ${files.length - published.length} draft(s) hidden)`);
  console.log('✓ Done!');
}

main();
