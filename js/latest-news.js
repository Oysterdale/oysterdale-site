/* Load latest news on homepage */
(function() {
  const container = document.getElementById('latest-news-container');
  if (!container) return;

  async function loadLatestNews() {
    try {
      // Fetch news index
      const response = await fetch('/news/index.html');
      if (!response.ok) throw new Error('Failed to fetch news');
      
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Find news cards
      const cards = doc.querySelectorAll('.news-card');
      const latestCards = Array.from(cards).slice(0, 3); // Show 3 latest
      
      if (latestCards.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;">No news yet. Check back soon!</p>';
        return;
      }
      
      // Build HTML
      const newsHTML = latestCards.map(card => {
        const link = card.querySelector('a');
        const title = card.querySelector('h2')?.textContent || 'Untitled';
        const excerpt = card.querySelector('.excerpt')?.textContent || '';
        const date = card.querySelector('time')?.textContent || '';
        const image = card.querySelector('img');
        const href = link?.getAttribute('href') || '#';
        
        return `
          <article class="news-preview-card">
            <a href="${href}" class="news-preview-link">
              ${image ? `<figure class="news-preview-image"><img src="${image.src}" alt="${image.alt}" loading="lazy"></figure>` : ''}
              <div class="news-preview-content">
                <time class="news-preview-date">${date}</time>
                <h3 class="news-preview-title">${title}</h3>
                <p class="news-preview-excerpt">${excerpt.substring(0, 120)}${excerpt.length > 120 ? '...' : ''}</p>
              </div>
            </a>
          </article>
        `;
      }).join('');
      
      container.innerHTML = `<div class="news-preview-list">${newsHTML}</div>`;
      
    } catch (err) {
      console.error('Error loading latest news:', err);
      container.innerHTML = '<p style="text-align:center;color:#888;">Unable to load news. <a href="/news/">View all news →</a></p>';
    }
  }

  // Load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadLatestNews);
  } else {
    loadLatestNews();
  }
})();
