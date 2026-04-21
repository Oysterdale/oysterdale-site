const fs = require('fs');
const path = require('path');

const ARTISTS_DIR = path.join(__dirname, '..', 'artists');

function generateTemplate(data) {
  const name = data.name || '';
  const nameLower = (data.name || '').toLowerCase();
  const bio = data.bio || '';
  const photo = data.photo || data.image || '';
  
  // Generate links
  const links = [];
  if(data.spotify && data.spotify.trim() && data.spotify.trim() !== "''") links.push({url: data.spotify.trim(), icon: 'fa-brands fa-spotify', label: 'Spotify'});
  if(data.soundcloud && data.soundcloud.trim() && data.soundcloud.trim() !== "''") links.push({url: data.soundcloud.trim(), icon: 'fa-brands fa-soundcloud', label: 'SoundCloud'});
  if(data.instagram && data.instagram.trim() && data.instagram.trim() !== "''") links.push({url: data.instagram.trim(), icon: 'fa-brands fa-instagram', label: 'Instagram'});
  if(data.website && data.website.trim() && data.website.trim() !== "''") links.push({url: data.website.trim(), icon: 'fa-solid fa-globe', label: 'Website'});
  if(data.mixcloud && data.mixcloud.trim() && data.mixcloud.trim() !== "''") links.push({url: data.mixcloud.trim(), icon: 'fa-brands fa-mixcloud', label: 'Mixcloud'});
  if(data.bandcamp && data.bandcamp.trim() && data.bandcamp.trim() !== "''") links.push({url: data.bandcamp.trim(), icon: 'fa-brands fa-bandcamp', label: 'Bandcamp'});
  if(data.traxsource && data.traxsource.trim() && data.traxsource.trim() !== "''") links.push({url: data.traxsource.trim(), icon: 'fa-solid fa-music', label: 'Traxsource'});
  if(data.beatport && data.beatport.trim() && data.beatport.trim() !== "''") links.push({url: data.beatport.trim(), icon: 'fa-solid fa-record-vinyl', label: 'Beatport'});
  if(data.apple_music && data.apple_music.trim() && data.apple_music.trim() !== "''") links.push({url: data.apple_music.trim(), icon: 'fa-brands fa-apple', label: 'Apple Music'});
  if(data.youtube && data.youtube.trim() && data.youtube.trim() !== "''") links.push({url: data.youtube.trim(), icon: 'fa-brands fa-youtube', label: 'YouTube'});
  if(data.tidal && data.tidal.trim() && data.tidal.trim() !== "''") links.push({url: data.tidal.trim(), icon: 'fa-solid fa-wave-square', label: 'Tidal'});
  
  const linksHtml = links.map(l => `
    <a href="${l.url}" target="_blank" rel="noopener">
      <i class="${l.icon}"></i> ${l.label}
    </a>
  `).join('');
  
  // Generate contact buttons - ONLY show if explicitly configured
  const contactEmail = (data.contact_email || '').trim().replace(/^["']|["']$/g, '');
  const bookingEmail = (data.booking_email || '').trim().replace(/^["']|["']$/g, '');
  
  let contactButtons = [];
  if(bookingEmail && bookingEmail !== "''"){
    contactButtons.push(`<a href="mailto:${bookingEmail}?subject=Booking%20Inquiry%20-%20${encodeURIComponent(name)}" class="secondary"><i class="fa-solid fa-calendar"></i> Book ${name.split(' ')[0]}</a>`);
  }
  if(contactEmail && contactEmail !== "''"){
    contactButtons.push(`<a href="mailto:${contactEmail}?subject=Inquiry%20about%20${encodeURIComponent(name)}"><i class="fa-solid fa-envelope"></i> Contact</a>`);
  }
  
  const contactHtml = contactButtons.length > 0 ? `
    <div class="artist-contact">
      ${contactButtons.join('')}
    </div>
  ` : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | Oysterdale Records</title>
  <meta name="description" content="${bio.substring(0, 160).replace(/"/g, '&quot;')}">
  <link rel="stylesheet" href="/styles.css?v=2">
  <link rel="stylesheet" href="/styles-news.css">
  <link rel="icon" href="/images/favicon.png" type="image/png">
  <link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" as="style" crossorigin="" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin=""></noscript>
  <style>
    /* Force white text */
    body {
      background: linear-gradient(135deg, #050505 0%, #0a0a1a 50%, #0d1117 100%) !important;
      background-attachment: fixed !important;
      color: #fff !important;
      min-height: 100vh;
    }
    a {
      color: #fff !important;
    }
    /* Offset for fixed header */
    .page-content {
      padding-top: 100px;
    }
    
    .artist-hero {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 3rem;
      align-items: center;
      margin: 2rem 0;
    }
    .artist-photo {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 12px;
    }
    .artist-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .artist-info h1 {
      margin: 0;
      font-size: clamp(2.5rem, 5vw, 4rem);
      color: #fff;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .artist-links {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .artist-links a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      font-size: 0.9rem;
      transition: background 0.2s;
      color: #fff !important;
      text-decoration: none;
    }
    .artist-links a:hover {
      background: rgba(255,255,255,0.12);
    }
    .artist-contact {
      margin-top: 2rem;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .artist-contact a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #6b4c7a, #9b7bb8);
      border-radius: 999px;
      font-size: 0.95rem;
      font-weight: 500;
      transition: transform 0.2s, box-shadow 0.2s;
      color: #fff !important;
      text-decoration: none;
    }
    .artist-contact a:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(155, 123, 184, 0.3);
    }
    .artist-contact a.secondary {
      background: rgba(255,255,255,0.08);
    }
    .artist-contact a.secondary:hover {
      background: rgba(255,255,255,0.15);
      box-shadow: none;
    }
    .artist-bio-full {
      margin: 2rem 0;
      max-width: 800px;
    }
    .artist-bio-full p {
      font-size: 1.1rem;
      line-height: 1.7;
      color: #ccc;
    }
    .artist-releases {
      margin-top: 4rem;
    }
    .artist-releases h2 {
      margin-bottom: 1.5rem;
    }
    .releases-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }
    @media (max-width: 768px) {
      .artist-hero {
        grid-template-columns: 1fr;
        gap: 1.5rem;
        text-align: center;
      }
      .artist-photo {
        max-width: 280px;
        margin: 0 auto;
      }
      .artist-info {
        text-align: center;
      }
      .artist-links {
        justify-content: center;
      }
      .artist-contact {
        justify-content: center;
      }
      .artist-bio-full {
        text-align: center;
        margin: 2rem auto;
      }
      .artist-releases {
        text-align: center;
      }
      .artist-releases h2 {
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <script>
    fetch("/header.html")
      .then(r => r.text())
      .then(html => {
        document.body.insertAdjacentHTML("afterbegin", html);
        const btn = document.getElementById("menu-toggle");
        const nav = document.querySelector(".main-nav");
        if(btn && nav){
          btn.addEventListener("click", () => {
            const open = nav.classList.toggle("open");
            btn.textContent = open ? "✖" : "☰";
          });
          document.addEventListener("click", e => {
            if(e.target.closest(".nav-links a")){
              nav.classList.remove("open");
              btn.textContent = "☰";
            }
          });
        }
      });
  </script>

  <main class="page-content">
    <div id="artist-content">
      <div class="artist-hero">
        <img src="${photo}" alt="${name}" class="artist-photo">
        <div class="artist-info">
          <h1>${name}</h1>
          <div class="artist-links">
            ${linksHtml}
          </div>
          ${contactHtml}
        </div>
      </div>
      
      <div class="artist-bio-full">
        <p>${bio}</p>
      </div>
      
      <div class="artist-releases">
        <h2>Oysterdale Releases</h2>
        <div class="releases-grid" id="artist-releases"></div>
      </div>
    </div>
  </main>

  <script>
    fetch("/footer.html")
      .then(r => r.text())
      .then(html => document.body.insertAdjacentHTML("beforeend", html));
  </script>

  <script>
    const OWNER = "Oysterdale";
    const REPO = "oysterdale-site";
    
    async function loadReleases() {
      try {
        const r = await fetch('https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/releases');
        const files = await r.json();
        const releases = [];
        
        for(const file of files.filter(f => f.name.endsWith('.md'))) {
          const md = await fetch(file.download_url).then(r => r.text());
          const data = parseFrontmatter(md);
          
          if(data.artists && data.artists.some(a => 
            a.toLowerCase().includes('${nameLower}') || 
            '${nameLower}'.includes(a.toLowerCase())
          )) {
            data.fileName = file.name;
            releases.push(data);
          }
        }
        
        const container = document.getElementById('artist-releases');
        if(releases.length === 0) {
          container.innerHTML = '<p>No releases yet.</p>';
          return;
        }
        
        container.innerHTML = releases.map(function(r) {
          var releaseSlug = r.fileName.replace('.md', '').toLowerCase();
          return '<div class="release">' +
            '<a href="/releases/' + releaseSlug + '/">' +
            '<img src="' + (r.cover || r.image) + '" alt="' + r.title + '" class="release-cover" loading="lazy">' +
            '<h3>' + r.title + '</h3>' +
            '<p>' + r.artists.join(' | ') + '</p>' +
            '</a>' +
            '</div>';
        }).join('');
        
      } catch(e) {
        console.error(e);
      }
    }
    
    function parseFrontmatter(md) {
      var parts = md.split('---');
      if(parts.length < 3) return {data: {}};
      var yaml = parts[1];
      var data = {};
      var lines = yaml.split(/\\r?\\n/);
      
      var listKey = null;
      for(var i = 0; i < lines.length; i++){
        var line = lines[i];
        if(!line.trim()) continue;
        
        var listStart = line.match(/^([A-Za-z0-9_]+):\\s*$/);
        if(listStart){
          listKey = listStart[1];
          data[listKey] = [];
          continue;
        }
        
        if(listKey && line.trim().startsWith("-")){
          data[listKey].push(line.replace(/^\\s*-\\s*/, "").trim());
          continue;
        }
        
        var field = line.match(/^([^:]+):\\s*(.*)$/);
        if(field){
          data[field[1].trim()] = field[2].replace(/^["']|["']$/g, "");
        }
      }
      
      if(data.artists){
        if(Array.isArray(data.artists)){
          data.artists = data.artists.map(function(a) {
            return typeof a === "string" ? a : (a.existing || a.custom || "");
          }).filter(Boolean);
        } else {
          data.artists = [String(data.artists).trim()];
        }
      }
      
      return data;
    }
    
    loadReleases();
  </script>
</body>
</html>`;
}

function parseFrontmatter(md) {
  const parts = md.split(/^---\s*$/m);
  if(parts.length < 3) return {};
  const yaml = parts[1].trim();
  const data = {};
  const lines = yaml.split(/\r?\n/);
  
  let currentKey = null;
  let currentValue = [];
  let inBlock = false;
  let blockIndent = null;
  
  for(let i = 0; i < lines.length; i++){
    const line = lines[i];
    
    // Check for block scalar start (|, >, |-, >+, etc.)
    const blockMatch = line.match(/^(\w+):\s*([>|](?:[-+]?)\s*)$/);
    if(blockMatch){
      if(currentKey){
        data[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = blockMatch[1];
      currentValue = [];
      inBlock = true;
      blockIndent = null;
      continue;
    }
    
    // Check for simple field (key: value)
    const fieldMatch = line.match(/^(\w+):\s*(.*)$/);
    
    // If we're in a block and encounter a new field at root level, end the block
    if(inBlock && fieldMatch){
      const indent = line.match(/^(\s*)/)[1].length;
      if(indent === 0 || (blockIndent !== null && indent < blockIndent)){
        data[currentKey] = currentValue.join('\n').trim();
        currentKey = fieldMatch[1];
        currentValue = [fieldMatch[2].trim().replace(/^["']|["']$/g, '')];
        inBlock = false;
        blockIndent = null;
        continue;
      }
    }
    
    // Regular field (not in block)
    if(fieldMatch && !inBlock){
      if(currentKey){
        data[currentKey] = currentValue.join('\n').trim();
      }
      currentKey = fieldMatch[1];
      currentValue = [fieldMatch[2].trim().replace(/^["']|["']$/g, '')];
      continue;
    }
    
    // Check for list item
    const listMatch = line.match(/^\s+-\s+(.*)$/);
    if(listMatch){
      if(currentKey){
        if(!Array.isArray(data[currentKey])){
          data[currentKey] = data[currentKey] ? [data[currentKey]] : [];
        }
        data[currentKey].push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
      }
      continue;
    }
    
    // Handle block content
    if(inBlock){
      if(blockIndent === null && line.trim().length > 0){
        blockIndent = line.match(/^(\s*)/)[1].length;
      }
      if(line.trim().length === 0){
        currentValue.push('');
      } else if(blockIndent !== null){
        const lineIndent = line.match(/^(\s*)/)[1].length;
        if(lineIndent >= blockIndent){
          currentValue.push(line.substring(blockIndent));
        } else {
          currentValue.push(line.trim());
        }
      } else {
        currentValue.push(line);
      }
    }
  }
  
  if(currentKey){
    data[currentKey] = currentValue.join('\n').trim();
  }
  
  return data;
}

// Main
const files = fs.readdirSync(ARTISTS_DIR).filter(f => f.endsWith('.md'));

files.forEach(file => {
  const md = fs.readFileSync(path.join(ARTISTS_DIR, file), 'utf8');
  const data = parseFrontmatter(md);
  const slug = data.name ? data.name.toLowerCase().replace(/\s+/g, '-') : file.replace('.md', '');
  
  const dir = path.join(ARTISTS_DIR, slug);
  if(!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
  
  const html = generateTemplate(data);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log('Generated: ' + dir + '/index.html');
});

console.log('Done!');
