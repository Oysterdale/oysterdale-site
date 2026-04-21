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
  let blockIndent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for block scalar start (> or | with optional modifiers)
    const blockMatch = line.match(/^(\w+):\s*([>|](?:[-+]?))\s*$/);
    if (blockMatch) {
      if (currentKey) {
        data[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = blockMatch[1];
      currentValue = [];
      inBlock = true;
      blockIndent = 0;
      continue;
    }
    
    // Check for simple field
    const fieldMatch = line.match(/^(\w+):\s*(.*)$/);
    if (fieldMatch && !inBlock) {
      if (currentKey) {
        data[currentKey] = currentValue.join('\n').trim();
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
    
    // Handle block content
    if (inBlock) {
      // If we encounter a new field at root level (no indent), block is done
      if (fieldMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
        data[currentKey] = currentValue.join('\n').trim();
        currentKey = fieldMatch[1];
        currentValue = [fieldMatch[2].trim().replace(/^["']|["']$/g, '')];
        inBlock = false;
        continue;
      }
      
      // Set block indent on first non-empty line
      if (blockIndent === 0 && line.trim().length > 0) {
        blockIndent = line.match(/^(\s*)/)[1].length;
      }
      
      // Add line to block (remove base indent)
      if (line.trim().length === 0) {
        currentValue.push('');
      } else {
        currentValue.push(line.substring(Math.min(blockIndent, line.match(/^(\s*)/)[1].length)));
      }
    }
  }
  
  // Save last key
  if (currentKey) {
    data[currentKey] = currentValue.join('\n').trim();
  }
  
  return { data, content };
}

// Load all releases for cross-referencing
async function loadReleases() {
  try {
    // Use raw GitHub URL instead of API to avoid rate limits
    const releasesIndexUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/releases/index.json`;
    
    try {
      const indexResponse = await fetch(releasesIndexUrl);
      if (indexResponse.ok) {
        const releaseFiles = await indexResponse.json();
        
        const releases = await Promise.all(
          releaseFiles
            .filter(f => f.endsWith('.md'))
            .map(async filename => {
              const md = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/releases/${filename}`).then(r => r.text());
              const { data } = parseFrontmatter(md);
              return { data, slug: filename.replace('.md', '') };
            })
        );
        
        return releases;
      }
    } catch (e) {
      console.log('No releases index, trying fallback...');
    }
    
    // Fallback: try common release files
    const commonReleases = [
      'get-on-up.md', 'dont-hold-me-back.md', 'get-on-up-remixes.md',
      'get-on-up-extended.md', 'ill-be-gone.md', 'ill-be-gone-extended.md',
      'get-on-up-dub.md', 'get-on-up-minijack-remix.md'
    ];
    
    const releases = await Promise.all(
      commonReleases.map(async filename => {
        try {
          const md = await fetch(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/releases/${filename}`).then(r => {
            if (!r.ok) return null;
            return r.text();
          });
          if (!md) return null;
          const { data } = parseFrontmatter(md);
          return { data, slug: filename.replace('.md', '') };
        } catch (e) {
          return null;
        }
      })
    );
    
    return releases.filter(r => r !== null);
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
    
    // If not found, try API as fallback
    if (!md) {
      try {
        const r = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/artists`);
        const files = await r.json();
        
        const artistFile = files.find(f => {
          if (!f.name.endsWith('.md')) return false;
          const name = f.name.toLowerCase().replace('.md', '');
          const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const normalizedSlug = artistSlug.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return normalizedName.includes(normalizedSlug) || 
                 normalizedSlug.includes(normalizedName);
        });
        
        if (artistFile) {
          const mdUrl = artistFile.download_url || 
            `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/artists/${artistFile.name}`;
          md = await fetch(mdUrl).then(r => r.text());
        }
      } catch (e) {
        console.error('API fallback failed:', e);
      }
    }
    
    if (!md) {
      container.innerHTML = '<p>Artist not found.</p>';
      return;
    }
    
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
