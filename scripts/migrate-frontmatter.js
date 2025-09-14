// scripts/migrate-frontmatter.js
// Kjør: node scripts/migrate-frontmatter.js
// Krever: Node 18+ og js-yaml (npm i js-yaml)

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const RELEASES_DIR = path.join(ROOT, 'releases');
const ARTISTS_DIR  = path.join(ROOT, 'artists');

// Les frontmatter (--- ... ---) trygt
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

// Hent første definerte verdi fra en liste med nøkler (støtter hyphen keys)
const getFirst = (obj, keys) => {
  for (const k of keys) {
    if (k.includes('.')) {
      // støtte nested som links.spotify
      const parts = k.split('.');
      let cur = obj;
      for (const p of parts) cur = cur && cur[p] !== undefined ? cur[p] : undefined;
      if (cur) return cur;
    } else if (obj[k]) {
      return obj[k];
    }
  }
  return undefined;
};

// ---------------- Releases: migrer til cover, artists[], links.* ----------------
function migrateRelease(data) {
  const out = { ...data };

  // Tittel og dato lar vi være hvis de finnes
  // Bilde: sett begge (cover + image) for å ikke bryte frontend
  const img = getFirst(out, ['cover', 'image']);
  if (img) {
    out.cover = img;
    out.image = img; // behold legacy
  }

  // Artists: støtt string, array av strings, eller allerede [{name}]
  let artists = out.artists;
  if (typeof artists === 'string') artists = [artists];
  if (!artists) {
    const one = getFirst(out, ['artist', 'artist_name', 'artist-name', 'map-name']);
    if (one) artists = [one];
  }
  if (Array.isArray(artists)) {
    out.artists = artists.map(a =>
      typeof a === 'string' ? { name: a } :
      (a && typeof a === 'object' && a.name ? a : { name: String(a ?? '') })
    );
  }

  // Links: samle fra mange mulige feltnavn
  const links = {
    spotify:   getFirst(out, ['links.spotify','spotify_link','spotify-url','spotifyUrl','spotify']),
    apple:     getFirst(out, ['links.apple','apple_music','itunes','apple-music','apple']),
    beatport:  getFirst(out, ['links.beatport','beatport_link','beatport-url','beatport']),
    traxsource:getFirst(out, ['links.traxsource','traxsource_link','traxsource-url','traxsource']),
    youtube:   getFirst(out, ['links.youtube','youtube_link','youtube-url','youtube']),
  };
  if (Object.values(links).some(Boolean)) {
    out.links = { ...(out.links || {}), ...links };
    // Viktig: IKKE slett legacy nøkler nå (frontend holdes uendret)
  }

  return out;
}

// ---------------- Artists: migrer til title, photo, socials[] ----------------
function migrateArtist(data) {
  const out = { ...data };

  // Navn -> title (støtt mange gamle nøkkelnavn)
  const title = getFirst(out, ['title', 'name', 'map-name', 'artist', 'artist_name', 'artist-name']);
  if (title) out.title = title;

  // Bilde: sett begge (photo + image) for å ikke bryte frontend
  const pic = getFirst(out, ['photo', 'image']);
  if (pic) {
    out.photo = pic;
    out.image = pic; // behold legacy
  }

  // Socials: bygg liste fra flate felter (og behold flate felter for frontend)
  const socials = [];
  const add = (platform, keys) => {
    const url = getFirst(out, keys);
    if (url) socials.push({ platform, url });
  };
  add('Instagram',  ['instagram', 'instagram_url', 'insta']);
  add('Spotify',    ['spotify', 'spotify_url']);
  add('YouTube',    ['youtube', 'youtube_url', 'yt']);
  add('SoundCloud', ['soundcloud', 'soundcloud_url', 'sc']);
  add('Website',    ['website', 'site', 'url']);
  add('Facebook',   ['facebook', 'facebook_url', 'fb']);
  add('X',          ['x', 'twitter', 'twitter_url']); // hvis aktuelt

  if (socials.length) out.socials = socials;

  return out;
}

// ---------------- Hovedløp ----------------
function migrateDir(dir, kind) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const f of files) {
    const full = path.join(dir, f);
    const { data, body } = readFM(full);
    const migrated = kind === 'release' ? migrateRelease(data) : migrateArtist(data);
    writeFM(full, migrated, body);
    console.log(`Migrert: ${path.relative(ROOT, full)}`);
  }
}

migrateDir(RELEASES_DIR, 'release');
migrateDir(ARTISTS_DIR,  'artist');
console.log('Ferdig.');
