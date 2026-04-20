const fs = require('fs');
const path = require('path');

const ARTISTS_DIR = path.join(__dirname, '..', 'artists');
const TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{name}} | Oysterdale Records</title>
  <meta name="description" content="{{bio}}">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/styles-news.css">
  <link rel="icon" href="/images/favicon.png" type="image/png">
  <link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" as="style" crossorigin="" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin=""></noscript>
  <style>
    /* Force white text */
    body {
      color: #fff !important;
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
      align-items: start;
      margin: 2rem 0;
    }
    .artist-photo {
      width: 100%;
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 12px;
    }
    .artist-info h1 {
      margin: 0 0 1rem;
      font-size: clamp(2rem, 4vw, 3rem);
      color: #fff;
    }
    .artist-info a {
      color: #fff !important;
    }
    .artist-role {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(107, 76, 122, 0.3);
      border-radius: 999px;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.5rem;
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
    .artist-links {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 1rem;
      justify-content: center;
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
    }
    .artist-links a:hover {
      background: rgba(255,255,255,0.12);
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
      }
      .artist-photo {
        max-width: 280px;
        margin: 0 auto;
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
        <img src="{{photo}}" alt="{{name}}" class="artist-photo">
        <div class="artist-info">
          <h1>{{name}}</h1>
          <div class="artist-links">
            {{links}}
          </div>
        </div>
      </div>
      
      <div class="artist-bio-full">
        <p>{{bio}}</p>
      </div>
      
      <div class="artist-releases">
        <h2>Releases on Oysterdale</h2>
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
    // Load releases for this artist
    async function loadReleases() {
      try {
        const r = await fetch('https://api.github.com/repos/Oysterdale/oysterdale-site/contents/releases');
        const files = await r.json();
        const releases = [];
        
        for(const file of files.filter(f => f.name.endsWith('.md'))) {
          const md = await fetch(file.download_url).then(r => r.text());
          const { data } = parseFrontmatter(md);
          
          if(data.artists && data.artists.some(a => 
            a.toLowerCase().includes('{{name_lower}}') || 
            '{{name_lower}}'.includes(a.toLowerCase())
          )) {
            releases.push(data);
          }
        }
        
        const container = document.getElementById('artist-releases');
        if(releases.length === 0) {
          container.innerHTML = '<p>No releases yet.</p>';
          return;
        }
        
        container.innerHTML = releases.map(r => \`
          <div class="release">
            <a href="/releases/\${r.title.toLowerCase().replace(/\\s+/g, '-')}.html">
              <img src="\${r.cover || r.image}" alt="\${r.title}" class="release-cover" loading="lazy">
              <h3>\${r.title}</h3>
              <p>\${r.artists.join(' | ')}</p>
            </a>
          </div>
        \`).join('');
        
      } catch(e) {
        console.error(e);
      }
    }
    
    function parseFrontmatter(md) {
      const parts = md.split('---');
      if(parts.length < 3) return {data: {}};
      const yaml = parts[1];
      const data = {};
      const lines = yaml.split(/\\r?\\n/);
      
      let listKey = null;
      for(const line of lines){
        if(!line.trim()) continue;
        const listStart = line.match(/^([A-Za-z0-9_]+):\\s*$/);
        if(listStart){
          listKey = listStart[1];
          data[listKey] = [];
          continue;
        }
        if(listKey && line.trim().startsWith("-")){
          data[listKey].push(line.replace(/^\\s*-\\s*/, "").trim());
          continue;
        }
        const field = line.match(/^([^:]+):\\s*(.*)$/);
        if(field){
          data[field[1].trim()] = field[2].replace(/^["']|["']$/g, "");
        }
      }
      
      if(data.artists){
        if(Array.isArray(data.artists)){
          data.artists = data.artists.map(a => 
            typeof a === "string" ? a : (a.existing || a.custom || "")
          ).filter(Boolean);
        } else {
          data.artists = [String(data.artists).trim()];
        }
      }
      
      return {data};
    }
    
    loadReleases();
  </script>
</body>
</html>`;

function parseFrontmatter(md) {
  const parts = md.split('---');
  if(parts.length < 3) return {};
  const yaml = parts[1];
  const data = {};
  yaml.split(/\r?\n/).forEach(line => {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if(m){
      data[m[1].trim()] = m[2].trim().replace(/^"(.*)"$/, "$1");
    }
  });
  return data;
}

function generateLinks(data) {
  const links = [];
  if(data.spotify) links.push({url: data.spotify, icon: 'fa-brands fa-spotify', label: 'Spotify'});
  if(data.soundcloud) links.push({url: data.soundcloud, icon: 'fa-brands fa-soundcloud', label: 'SoundCloud'});
  if(data.instagram) links.push({url: data.instagram, icon: 'fa-brands fa-instagram', label: 'Instagram'});
  if(data.website) links.push({url: data.website, icon: 'fa-solid fa-globe', label: 'Website'});
  if(data.mixcloud) links.push({url: data.mixcloud, icon: 'fa-brands fa-mixcloud', label: 'Mixcloud'});
  if(data.bandcamp) links.push({url: data.bandcamp, icon: 'fa-brands fa-bandcamp', label: 'Bandcamp'});
  if(data.contact_email) links.push({url: `mailto:${data.contact_email}`, icon: 'fa-solid fa-envelope', label: 'Contact'});
  
  return links.map(l => `
    <a href="${l.url}" target="_blank" rel="noopener">
      <i class="${l.icon}"></i> ${l.label}
    </a>
  `).join('');
}

function generateArtistPage(data, slug) {
  return TEMPLATE
    .replace(/\{\{name\}\}/g, data.name || '')
    .replace(/\{\{name_lower\}\}/g, (data.name || '').toLowerCase())
    .replace(/\{\{role\}\}/g, data.role || '')
    .replace(/\{\{bio\}\}/g, data.bio || '')
    .replace(/\{\{photo\}\}/g, data.photo || data.image || '')
    .replace(/\{\{links\}\}/g, generateLinks(data));
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
  
  const html = generateArtistPage(data, slug);
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`Generated: ${dir}/index.html`);
});

console.log('Done!');
