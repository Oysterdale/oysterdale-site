// Artist loader - loads artist data dynamically from markdown files
// Uses raw GitHub URLs to avoid API rate limits

const OWNER = "Oysterdale";
const REPO = "oysterdale-site";
const BRANCH = "main";

// Parse YAML frontmatter with support for multi-line values
function parseFrontmatter(md) {
  const parts = md.split(/^---\s*$/m);
  if (parts.length < 3) return { data: {}, content: '' };
  
  const yaml = parts[1].trim();
  const data = {};
  
  const lines = yaml.split(/\r?\n/);
  let currentKey = null;
  let currentValue = [];
  let inBlock = false;
  let blockIndent = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for block scalar start (> or | with optional modifiers like |-, >+, etc.)
    const blockMatch = line.match(/^(\w+):\s*([>|](?:[-+]?))\s*$/);
    if (blockMatch) {
      if (currentKey) {
        data[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = blockMatch[1];
      currentValue = [];
      inBlock = true;
      blockIndent = null; // Will be determined by first content line
      continue;
    }
    
    // Check for simple field (key: value)
    const fieldMatch = line.match(/^(\w+):\s*(.*)$/);
    
    // If we're in a block and encounter a new field at root level (no indent), end the block
    if (inBlock && fieldMatch) {
      const indent = line.match(/^(\s*)/)[1].length;
      // If this line has no indent (or less than block indent), it's a new field
      if (indent === 0 || (blockIndent !== null && indent < blockIndent)) {
        data[currentKey] = currentValue.join('\n').trim();
        currentKey = fieldMatch[1];
        currentValue = [fieldMatch[2].trim().replace(/^["']|["']$/g, '')];
        inBlock = false;
        blockIndent = null;
        continue;
      }
    }
    
    // Regular field (not in block)
    if (fieldMatch && !inBlock) {
      if (currentKey) {
        data[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = fieldMatch[1];
      currentValue = [fieldMatch[2].trim().replace(/^["']|["']$/g, '')];
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
    
    // Handle block content
    if (inBlock) {
      // Determine block indent from first non-empty line
      if (blockIndent === null && line.trim().length > 0) {
        blockIndent = line.match(/^(\s*)/)[1].length;
      }
      
      // Add line to block value
      if (line.trim().length === 0) {
        currentValue.push('');
      } else if (blockIndent !== null) {
        // Remove the base indent
        const lineIndent = line.match(/^(\s*)/)[1].length;
        if (lineIndent >= blockIndent) {
          currentValue.push(line.substring(blockIndent));
        } else {
          // Less indent than expected - still add it
          currentValue.push(line.trim());
        }
      } else {
        currentValue.push(line);
      }
    }
  }
  
  // Save last key
  if (currentKey) {
    data[currentKey] = currentValue.join('\n').trim();
  }
  
  return { data, content: parts.slice(2).join('---').trim() };
}

// Load all releases for cross-referencing
async function loadReleases() {
  try {
    // Use local releases.json (avoids GitHub API rate limits)
    const response = await fetch('/releases.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('releases.json not found');
    const releases = await response.json();
    
    return releases.map(r => ({
      data: {
        title: r.title,
        artists: r.artists || [],
        cover: r.cover,
        date: r.date,
        catalog: r.catalog
      },
      slug: r.slug
    }));
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
    tidal: { icon: 'img', img: '/images/platforms/tidal.svg', label: 'Tidal' },
    traxsource: { icon: 'img', img: '/images/platforms/traxsource.svg', label: 'Traxsource' },
    beatport: { icon: 'img', img: '/images/platforms/beatport.svg', label: 'Beatport' }
  };
  
  for (const [key, config] of Object.entries(linkMap)) {
    if (data[key]) {
      links.push({ url: data[key], ...config });
    }
  }
  
  const linksHtml = links.length > 0 
    ? links.map(l => {
        const iconHtml = l.icon === 'img'
          ? `<img src="${l.img}" alt="${l.label}" style="width:24px;height:24px;filter:brightness(0) invert(1);">`
          : `<i class="${l.icon}"></i>`;
        return `
        <a href="${l.url}" target="_blank" rel="noopener">
          ${iconHtml} ${l.label}
        </a>
      `;
      }).join('')
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
  
  // Format bio with paragraphs - split on blank lines
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
    // Try to load artist markdown directly using common patterns
    const slugLower = artistSlug.toLowerCase();
    const slugNormalized = slugLower.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Remove accents
    
    const possibleFiles = [
      `${artistSlug}.md`,
      `${slugLower}.md`,
      `${slugNormalized}.md`,
      `map-name-${slugNormalized}-role-vocalist-image-uploads-okplus_portrett_square_top_1200x1200-jpg.md`
    ];
    
    let md = null;
    let foundFile = null;
    
    for (const filename of possibleFiles) {
      try {
        const url = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/artists/${filename}`;
        const response = await fetch(url);
        if (response.ok) {
          md = await response.text();
          foundFile = filename;
          break;
        }
      } catch (e) {
        // Continue to next file
      }
    }
    
    if (!md) {
      container.innerHTML = '<p>Artist not found.</p>';
      return;
    }
    
    const { data } = parseFrontmatter(md);
    console.log('Loaded artist:', data.name);
    console.log('Bio length:', data.bio?.length);
    console.log('Bio:', data.bio?.substring(0, 100));
    
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
