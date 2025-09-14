// scripts/migrate-frontmatter.js
// Kjør med: node scripts/migrate-frontmatter.js
// Krever Node 18+

const fs = require('fs');
const path = require('path');

const RELEASES_DIR = path.join(process.cwd(), 'releases');
const ARTISTS_DIR  = path.join(process.cwd(), 'artists');

function parseFrontmatter(md) {
  if (!md.startsWith('---')) return { data: {}, body: md };
  const end = md.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: md };
  const yaml = md.slice(3, end + 1).replace(/^\n/, '').replace(/\n$/, '');
  const body = md.slice(end + 4);
  const data = {};
  yaml.split('\n').forEach(line => {
    const m = line.match(/^(\w[\w_]*):\s*(.*)$/);
    if (!m) return;
    let [, key, val] = m;
    val = val.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    data[key] = val;
  });
  return { data, body };
}

function stringifyFrontmatter(data, body) {
  const lines = [];
  const simpleKeys = [];
  const objectKeys = [];

  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) || typeof v === 'object') objectKeys.push([k, v]);
    else simpleKeys.push([k, v]);
  }

  simpleKeys.forEach(([k, v]) => {
    lines.push(`${k}: ${String(v)}`);
  });

  objectKeys.forEach(([k, v]) => {
    lines.push(`${k}:`);
    if (Array.isArray(v)) {
      v.forEach(item => {
        if (typeof item === 'object') {
          lines.push(`  -`);
          for (const [ik, iv] of Object.entries(item)) {
            if (iv !== undefined && iv !== '') lines.push(`    ${ik}: ${String(iv)}`);
          }
        } else {
          lines.push(`  - ${String(item)}`);
        }
      });
    } else {
      for (const [ik, iv] of Object.entries(v)) {
        if (iv !== undefined && iv !== '') lines.push(`  ${ik}: ${String(iv)}`);
      }
    }
  });

  return `---\n${lines.join('\n')}\n---\n${body.replace(/^\n/, '')}`;
}

function migrateReleaseData(data) {
  const out = { ...data };

  // image -> cover
  if (!out.cover && out.image) out.cover = out.image;
  delete out.image;

  // artist (string) -> artists: [{name: ...}]
  if (!out.artists && out.artist) {
    out.artists = [{ name: out.artist }];
    delete out.artist;
  }

  // links fra gamle felter
  const links = {
    spotify: out.spotify_link || out.spotify || '',
    apple: out.apple_music || out.itunes || out.apple || '',
    beatport: out.beatport_link || out.beatport || '',
    traxsource: out.traxsource_link || out.traxsource || '',
    youtube: out.youtube_link || out.youtube || '',
  };
  ['spotify_link','spotify','apple_music','itunes','apple','beatport_link','beatport','traxsource_link','traxsource','youtube_link','youtube']
    .forEach(k => delete out[k]);
  if (Object.values(links).some(Boolean)) out.links = links;

  return out;
}

function migrateArtistData(data) {
  const out = { ...data };

  // image -> photo
  if (!out.photo && out.image) out.photo = out.image;
  delete out.image;

  // lag socials fra flat struktur
  const socials = [];
  if (out.instagram)  socials.push({ platform: 'Instagram', url: out.instagram });
  if (out.spotify)    socials.push({ platform: 'Spotify',   url: out.spotify });
  if (out.youtube)    socials.push({ platform: 'YouTube',   url: out.youtube });
  if (out.soundcloud) socials.push({ platform: 'SoundCloud',url: out.soundcloud });
  if (out.website)    socials.push({ platform: 'Website',   url: out.website });
  ['instagram','spotify','youtube','soundcloud','website'].forEach(k => delete out[k]);
  if (socials.length) out.socials = socials;

  return out;
}

function migrateDir(dir, kind) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full, 'utf8');
    const { data, body } = parseFrontmatter(raw);
    let migrated;
    if (kind === 'release') migrated = migrateReleaseData(data);
    else if (kind === 'artist') migrated = migrateArtistData(data);
    else migrated = data;
    const out = stringifyFrontmatter(migrated, body);
    fs.writeFileSync(full, out, 'utf8');
    console.log(`Migrert: ${path.relative(process.cwd(), full)}`);
  }
}

migrateDir(RELEASES_DIR, 'release');
migrateDir(ARTISTS_DIR,  'artist');
console.log('Ferdig.');
