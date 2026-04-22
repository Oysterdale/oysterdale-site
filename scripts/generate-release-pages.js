#!/usr/bin/env node
/**
 * Generate static release pages from markdown frontmatter
 * Run: node scripts/generate-release-pages.js
 */

const fs = require('fs');
const path = require('path');

const RELEASES_DIR = path.join(__dirname, '..', 'releases');
const TEMPLATE_PATH = path.join(__dirname, '..', 'releases', 'release-template.html');

function parseFrontmatter(md) {
  const parts = md.split('---');
  if (parts.length < 3) return { data: {}, content: md };

  const yaml = parts[1];
  const content = parts.slice(2).join('---').trim();
  const data = {};
  const lines = yaml.split(/\r?\n/);

  let listKey = null;
  let inLinks = false;
  let inCredits = false;

  for (const line of lines) {
    if (!line.trim()) {
      listKey = null;
      continue;
    }

    // Links section
    if (/^links\s*:\s*$/.test(line.trim())) {
      inLinks = true;
      data.links = {};
      continue;
    }

    if (inLinks) {
      if (!line.startsWith(' ')) {
        inLinks = false;
      } else {
        const m = line.trim().match(/^([^:]+):\s*(.*)$/);
        if (m) data.links[m[1].trim()] = m[2].replace(/^["']|["']$/g, '');
        continue;
      }
    }

    // Credits section
    if (/^credits\s*:\s*$/.test(line.trim())) {
      inCredits = true;
      data.credits = {};
      continue;
    }

    if (inCredits) {
      if (!line.startsWith(' ')) {
        inCredits = false;
      } else {
        const listStart = line.match(/^\s+(\w+):\s*$/);
        if (listStart) {
          listKey = listStart[1];
          data.credits[listKey] = [];
          continue;
        }
        if (listKey && line.trim().startsWith('-')) {
          data.credits[listKey].push(line.replace(/^\s*-\s*/, '').trim());
          continue;
        }
      }
    }

    const listStart = line.match(/^([A-Za-z0-9_]+):\s*$/);
    if (listStart) {
      listKey = listStart[1];
      data[listKey] = [];
      continue;
    }

    if (listKey && line.trim().startsWith('-')) {
      data[listKey].push(line.replace(/^\s*-\s*/, '').trim());
      continue;
    }

    const field = line.match(/^([^:]+):\s*(.*)$/);
    if (field) {
      data[field[1].trim()] = field[2].replace(/^["']|["']$/g, '');
    }
  }

  // Handle artists
  if (data.artists) {
    if (Array.isArray(data.artists)) {
      data.artists = data.artists.map(a =>
        typeof a === 'string' ? a : (a.existing || a.custom || '')
      ).filter(Boolean);
    } else {
      data.artists = [String(data.artists).trim()];
    }
  }

  return { data, content };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateCreditsHtml(credits) {
  if (!credits || Object.keys(credits).length === 0) return '';

  const labelMap = {
    producer: 'Producer',
    vocals: 'Vocals',
    mixing: 'Mixing',
    mastering: 'Mastering',
    remix: 'Remix',
    remixer: 'Remix',
    composer: 'Composer',
    lyrics: 'Lyrics',
    additional_production: 'Additional Production',
    co_producer: 'Co-Producer',
    original_producer: 'Original Producer'
  };

  const items = Object.entries(credits)
    .filter(([_, values]) => values && values.length > 0)
    .map(([key, values]) => {
      const label = labelMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const value = values.join(', ');
      return `<li><strong>${label}</strong>${value}</li>`;
    })
    .join('\n');

  if (!items) return '';

  return `<div class="credits"><h3>Credits</h3><ul class="credits-list">\n${items}\n</ul></div>`;
}

function generateLinksHtml(links) {
  if (!links) return '';

  const platformIcons = {
    spotify_url: ['fa-brands fa-spotify', 'Spotify'],
    apple_music_url: ['fa-brands fa-apple', 'Apple Music'],
    traxsource_url: ['fa-solid fa-record-vinyl', 'Traxsource'],
    beatport_url: ['fa-solid fa-record-vinyl', 'Beatport'],
    youtube_url: ['fa-brands fa-youtube', 'YouTube'],
    tidal_url: ['fa-solid fa-wave-square', 'Tidal'],
    deezer_url: ['fa-solid fa-headphones', 'Deezer'],
    soundcloud_url: ['fa-brands fa-soundcloud', 'SoundCloud'],
    bandcamp_url: ['fa-brands fa-bandcamp', 'Bandcamp']
  };

  const linksHtml = Object.entries(links)
    .filter(([_, url]) => url)
    .map(([key, url]) => {
      const [icon, label] = platformIcons[key] || ['fa-solid fa-link', key.replace(/_url$/, '')];
      return `<a href="${url}" target="_blank" rel="noopener"><i class="${icon}"></i> ${label}</a>`;
    })
    .join('\n');

  if (!linksHtml) return '';

  return `<div class="platform-section"><h3>Listen / Buy</h3><div class="platform-links">\n${linksHtml}\n</div></div>`;
}

function generateArtistsHtml(artists) {
  if (!artists || artists.length === 0) return '';

  return artists.map(a => {
    const slug = a.toLowerCase().replace(/\s+/g, '-');
    return `<a href="/artists/${slug}/">${a}</a>`;
  }).join(', ');
}

function generatePage(mdFile) {
  const md = fs.readFileSync(mdFile, 'utf-8');
  const { data, content } = parseFrontmatter(md);

  const slug = path.basename(mdFile, '.md');
  const outputDir = path.join(RELEASES_DIR, slug);
  const outputPath = path.join(outputDir, 'index.html');

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Read template
  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  // Replace placeholders
  const title = data.title || slug;
  const artists = data.artists || [];
  const date = formatDate(data.date);
  const cover = data.cover || data.image || '';
  const catalog = data.catalog || '';

  // Build HTML
  const artistsHtml = generateArtistsHtml(artists);
  const creditsHtml = generateCreditsHtml(data.credits);
  const linksHtml = generateLinksHtml(data.links);

  // Convert markdown description to HTML
  function markdownToHtml(text) {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Convert *italic* to <em>
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Convert [link](url) to <a href="url">link</a>
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return text;
  }

  const descriptionHtml = content
    .split('\n\n')
    .map(p => `<p>${markdownToHtml(p.replace(/\n/g, '<br>'))}</p>`)
    .join('\n');

  // Replace in template - handle both {{var}} and {{ var }} formats
  template = template
    .replace(/\{\{\s*title\s*\}\}/gi, title.toUpperCase())
    .replace(/\{\{\s*artists\s*\}\}/gi, artistsHtml)
    .replace(/\{\{\s*date\s*\}\}/gi, date)
    .replace(/\{\{\s*cover\s*\}\}/gi, cover)
    .replace(/\{\{\s*catalog\s*\}\}/gi, catalog)
    .replace(/\{\{\s*description\s*\}\}/gi, descriptionHtml)
    .replace(/\{\{\s*credits\s*\}\}/gi, creditsHtml)
    .replace(/\{\{\s*links\s*\}\}/gi, linksHtml)
    .replace(/\{\{\s*slug\s*\}\}/gi, slug);

  fs.writeFileSync(outputPath, template);
  console.log(`✓ Generated: releases/${slug}/index.html`);

  // Return data for releases.json
  return {
    slug,
    title: data.title || slug,
    artists: data.artists || [],
    date: data.date || '',
    cover: data.cover || data.image || '',
    catalog: data.catalog || ''
  };
}

function generateReleasesJson(allReleases) {
  const outputPath = path.join(__dirname, '..', 'releases.json');
  // Sort by date descending
  allReleases.sort((a, b) => {
    const dateA = a.date ? new Date(a.date) : new Date(0);
    const dateB = b.date ? new Date(b.date) : new Date(0);
    return dateB - dateA;
  });
  fs.writeFileSync(outputPath, JSON.stringify(allReleases, null, 2));
  console.log(`✓ Generated: releases.json (${allReleases.length} releases)`);
}

function main() {
  // Check if template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('Error: release-template.html not found!');
    console.error('Expected at:', TEMPLATE_PATH);
    process.exit(1);
  }

  // Find all markdown files
  const files = fs.readdirSync(RELEASES_DIR)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(RELEASES_DIR, f));

  console.log(`Found ${files.length} releases to generate\n`);

  const allReleases = [];
  for (const file of files) {
    const releaseData = generatePage(file);
    if (releaseData) allReleases.push(releaseData);
  }

  // Generate releases.json for static loading
  generateReleasesJson(allReleases);

  console.log('\n✓ Done!');
}

main();
