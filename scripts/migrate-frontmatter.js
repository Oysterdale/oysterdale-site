// scripts/migrate-frontmatter.js
// Kjør: node scripts/migrate-frontmatter.js
// npm i js-yaml (en gang)

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const RELEASES_DIR = path.join(ROOT, 'releases');
const ARTISTS_DIR  = path.join(ROOT, 'artists');

function readFM(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw, raw };
  const [, y, body] = m;
  let data = {};
  try { data = yaml.load(y) || {}; } catch (e) {
    console.error(`YAML-feil i ${filePath}:`, e.message);
  }
  return { data, body, raw };
}
function writeFM(filePath, data, body) {
  const y = yaml.dump(data, { noRefs: true, lineWidth: 1000 });
  fs.writeFileSync(filePath, `---\n${y}---\n${body.replace(/^\n/, '')}`, 'utf8');
}
const get = (o,k)=> (k.split('.').reduce((a,p)=> (a&&a[p]!==undefined)?a[p]:undefined,o));

function migrateRelease(d) {
  const out = { ...d };

  // sikre cover + image
  const img = out.cover || out.image;
  if (img) { out.cover = img; out.image = img; } // sørg for begge

  // backfill artist/featured fra eventuell artists-array (hvis den finnes)
  if (!out.artist && Array.isArray(out.artists) && out.artists.length) {
    out.artist = out.artists[0]?.name || out.artists[0] || out.artist;
  }
  if (!out.featured && Array.isArray(out.artists) && out.artists.length > 1) {
    // grov heuristikk: alt etter første samles som "featured"
    out.featured = out.artists.slice(1).map(a => a.name || a).join(', ');
  }

  // backfill flate link-felter fra links-objekt (hvis de mangler)
  const m = (name, keys) => {
    if (!out[name]) {
      const val = keys.map(k => get(out,k)).find(Boolean);
      if (val) out[name] = val;
    }
  };
  m('spotify',        ['links.spotify','spotify']);
  m('traxsource',     ['links.traxsource','traxsource']);
  m('beatport',       ['links.beatport','beatport']);
  m('apple_music',    ['links.apple','apple_music','itunes']);
  m('deezer',         ['links.deezer','deezer']);
  m('amazon_music',   ['links.amazon','amazon_music']);
  m('youtube_music',  ['links.youtube_music','youtube_music']);
  m('tidal',          ['links.tidal','tidal']);
  m('itunes',         ['itunes']);     // behold hvis brukt
  m('bandcamp',       ['bandcamp']);   // behold hvis brukt

  return out;
}

function migrateArtist(d) {
  const out = { ...d };

  // backfill name/title
  if (!out.name && out.title) out.name = out.title;
  if (!out.title && out.name) out.title = out.name;

  // backfill image/photo
  const pic = out.photo || out.image;
  if (pic) { out.photo = pic; out.image = pic; }

  // backfill flate sosiale lenker fra socials-array (hvis mangler)
  if (Array.isArray(out.socials)) {
    const pick = label =>
      out.socials.find(s => (s.platform||'').toLowerCase() === label)?.url;
    if (!out.instagram)  out.instagram  = pick('instagram')  || out.instagram;
    if (!out.spotify)    out.spotify    = pick('spotify')    || out.spotify;
    if (!out.youtube)    out.youtube    = pick('youtube')    || out.youtube;
    if (!out.soundcloud) out.soundcloud = pick('soundcloud') || out.soundcloud;
    if (!out.website)    out.website    = pick('website')    || out.website;
    if (!out.mixcloud)   out.mixcloud   = pick('mixcloud')   || out.mixcloud;
    if (!out.bandcamp)   out.bandcamp   = pick('bandcamp')   || out.bandcamp;
  }

  return out;
}

function migrateDir(dir, kind) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const full = path.join(dir, f);
    const { data, body } = readFM(full);
    const migrated = kind === 'release' ? migrateRelease(data) : migrateArtist(data);
    writeFM(full, migrated, body);
    console.log('Migrert:', path.relative(ROOT, full));
  }
}

migrateDir(RELEASES_DIR, 'release');
migrateDir(ARTISTS_DIR,  'artist');
console.log('Ferdig.');
