// Artist loader - loads artist data dynamically from markdown files
// This file is included by all artist pages

const OWNER = "Oysterdale";
const REPO = "oysterdale-site";

// Parse YAML frontmatter with support for multi-line values
function parseFrontmatter(md) {
  const parts = md.split(/^---\s*$/m);
  if (parts.length < 3) return { data: {}, content: '' };
  
  const yaml = parts[1].trim();
  const content = parts.slice(2).join('---').trim();
  const data = {};
  
  const lines = yaml.split(/\r?\n/);
  let currentKey = null;
  let currentValue = [];
  let inBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for block scalar start (> or | with optional modifiers)
    const blockMatch = line.match(/^(\w+):\s*([>|](?:[-+]?))\s*$/);
    if (blockMatch) {
      if (currentKey) {
        data[currentKey] = currentValue.join('\n');
      }
      currentKey = blockMatch[1];
      currentValue = [];
      inBlock = true;
      continue;
    }
    
    // Check for simple field
    const fieldMatch = line.match(/^(\w+):\s*(.*)$/);
    if (fieldMatch && !inBlock) {
      if (currentKey) {
        data[currentKey] = currentValue.join('\n');
      }
      currentKey = fieldMatch[1];
      currentValue = [fieldMatch[2].trim().replace(/^["']|["']$/g, '')];
      inBlock = false;
      continue;
    }
    
    // Check for list item
    const listMatch = line.match(/^\s+-\s+(.*)$/);
    if (listMatch) {
      if (currentKey) {
        if (!Array.isArray(data[currentKey])) {
          data[currentKey] = data[currentKey] ? [data[currentKey]] : [];
        }
        data[currentKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
      }
      continue;
    }
    
    // Continue block value
    if (inBlock && line.trim() === '' && currentValue.length > 0) {
      // Empty line in block - add it
      currentValue.push('');
      continue;
    }
    
    if (inBlock) {
      currentValue.push(line);
    }
  }
  
  // Save last key
  if (currentKey) {
    // Trim trailing whitespace for block values
    data[currentKey] = currentValue.join('\n').trim();
  }
  
  return { data, content };
}

// Load all releases for cross-referencing
async function loadReleases() {
  try {
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/releases`);
    const files = await r.json();
    
    const releases = await Promise.all(
      files
        .filter(f => f.name.endsWith('.md'))
        .map(async f => {
          const md = await fetch(f.download_url).then(r => r.text());
          const { data } = parseFrontmatter(md);
          return { data, slug: f.name.replace('.md', '') };
        })
    );
    
    return releases;
  } catch (e) {
    console.error('Error loading releases:', e);
    return [];
  }
}

// Find artist releases
function findArtistReleases(artistName, releases) {
  if (!artistName || !releases) return [];
  
  const nameLower = artistName.toLowerCase();
  return releases.filter(r => {
    const artists = r.data.artists || [];
    return artists.some(a => {
      const aLower = a.toLowerCase();
      return aLower === nameLower || 
             aLower.includes(nameLower) || 
             nameLower.includes(aLower);
    });
  });
}

// Render artist page
function renderArtist(data, releases) {
  const container = document.getElementById('artist-content');
  if (!container) return;
  
  // Build social links
  const links = [];
  const linkMap = {
    spotify: { icon: 'fa-brands fa-spotify', label: 'Spotify' },
    soundcloud: { icon: 'fa-brands fa-soundcloud', label: 'SoundCloud' },
    instagram: { icon: 'fa-brands fa-instagram', label: 'Instagram' },
    website: { icon: 'fa-solid fa-globe', label: 'Website' },
    mixcloud: { icon: 'fa-brands fa-mixcloud', label: 'Mixcloud' },
    bandcamp: { icon: 'fa-brands fa-bandcamp', label: 'Bandcamp' },
    apple_music: { icon: 'fa-brands fa-apple', label: 'Apple Music' },
    youtube: { icon: 'fa-brands fa-youtube', label: 'YouTube' },
    tidal: { icon: 'fa-solid fa-music', label: 'Tidal' },
    traxsource: { icon: 'fa-solid fa-record-vinyl', label: 'Traxsource' },
    beatport: { icon: 'fa-solid fa-headphones', label: 'Beatport' }
  };
  
  for (const [key, config] of Object.entries(linkMap)) {
    if (data[key]) {
      links.push({ url: data[key], ...config });
    }
  }
  
  const linksHtml = links.length > 0 
    ? links.map(l => `
        <a href="${l.url}" target="_blank" rel="noopener">
          <i class="${l.icon}"></i> ${l.label}
        </a>
      `).join('')
    : '';
  
  // Build releases section
  const artistReleases = findArtistReleases(data.name, releases);
  const releasesHtml = artistReleases.length > 0 
    ? artistReleases.map(r => `
        <div class="release">
          <a href="/releases/${r.slug}/">
            <img src="${r.data.cover || r.data.image}" alt="${r.data.title}" class="release-cover" loading="lazy">
            <h3>${r.data.title}</h3>
            <p>${r.data.artists?.join(' | ')}</p>
          </a>
        </div>
      `).join('')
    : '<p>No releases yet.</p>';
  
  // Format bio with paragraphs
  const bioHtml = data.bio 
    ? data.bio.split(/\n\n+/).map(p => `<p>${p.trim()}</p>`).join('')
    : '';
  
  container.innerHTML = `
    <div class="artist-hero">
      <img src="${data.photo || data.image || '/images/artist-placeholder.jpg'}" alt="${data.name}" class="artist-photo">
      <div class="artist-info">
        <h1>${data.name}</h1>
        <span class="artist-role">${data.role}</span>
        ${bioHtml ? `<div class="artist-bio-full">${bioHtml}</div>` : ''}
        <div class="artist-links">
          ${linksHtml}
        </div>
      </div>
    </div>
    
    <div class="artist-releases">
      <h2>Releases on Oysterdale</h2>
      <div class="releases-grid">
        ${releasesHtml}
      </div>
    </div>
  `;
  
  // Update page title
  document.title = `${data.name} – Oysterdale Records`;
}

// Main load function
async function loadArtist() {
  const container = document.getElementById('artist-content');
  if (!container) return;
  
  // Get artist slug from URL
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const artistSlug = pathParts[pathParts.length - 1];
  
  if (!artistSlug) {
    container.innerHTML = '<p>Artist not found.</p>';
    return;
  }
  
  try {
    // Load artist list from GitHub
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/artists`);
    const files = await r.json();
    
    // Find matching file
    const artistFile = files.find(f => {
      const name = f.name.toLowerCase().replace('.md', '');
      return name.includes(artistSlug.toLowerCase()) || 
             artistSlug.toLowerCase().includes(name);
    });
    
    if (!artistFile) {
      container.innerHTML = '<p>Artist not found.</p>';
      return;
    }
    
    // Load artist markdown
    const md = await fetch(artistFile.download_url).then(r => r.text());
    const { data } = parseFrontmatter(md);
    
    // Load releases for cross-referencing
    const releases = await loadReleases();
    
    // Render
    renderArtist(data, releases);
    
  } catch (e) {
    console.error('Error loading artist:', e);
    container.innerHTML = '<p>Error loading artist. Please try again later.</p>';
  }
}

// Auto-load when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadArtist);
} else {
  loadArtist();
}
