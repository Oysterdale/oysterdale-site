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
      
      // Find news items - check for both old card layout and new list layout
      let latestItems = [];
      
      // Try new layout first (hero + list)
      const hero = doc.querySelector('.news-hero');
      if (hero) {
        const heroLink = hero.querySelector('a');
        const heroTitle = hero.querySelector('h2')?.textContent || '';
        const heroExcerpt = hero.querySelector('p')?.textContent || '';
        const heroDate = hero.querySelector('time')?.textContent || '';
        const heroImage = hero.querySelector('img');
        const heroHref = heroLink?.getAttribute('href') || '#';
        
        latestItems.push({
          title: heroTitle,
          excerpt: heroExcerpt,
          date: heroDate,
          image: heroImage,
          href: heroHref
        });
      }
      
      // Add list items
      const listItems = doc.querySelectorAll('.news-list-item');
      listItems.forEach(item => {
        const link = item.querySelector('a');
        latestItems.push({
          title: item.querySelector('h3')?.textContent || '',
          excerpt: item.querySelector('p')?.textContent || '',
          date: item.querySelector('time')?.textContent || '',
          image: null,
          href: link?.getAttribute('href') || '#'
        });
      });
      
      // Fallback to old card layout
      if (latestItems.length === 0) {
        const cards = doc.querySelectorAll('.news-card');
        cards.forEach(card => {
          const link = card.querySelector('a');
          latestItems.push({
            title: card.querySelector('h2')?.textContent || '',
            excerpt: card.querySelector('.excerpt')?.textContent || '',
            date: card.querySelector('time')?.textContent || '',
            image: card.querySelector('img'),
            href: link?.getAttribute('href') || '#'
          });
        });
      }
      
      const latestCards = latestItems.slice(0, 3); // Show 3 latest
      
      if (latestCards.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#888;">No news yet. Check back soon!</p>';
        return;
      }
      
      // Build HTML
      const newsHTML = latestCards.map((item, index) => {
        const isFirst = index === 0;
        
        return `
          <article class="news-preview-card${isFirst ? ' featured' : ''}">
            <a href="${item.href}" class="news-preview-link">
              ${item.image ? `<figure class="news-preview-image"><img src="${item.image.src}" alt="${item.image.alt || item.title}" loading="lazy"></figure>` : ''}
              <div class="news-preview-content">
                <time class="news-preview-date">${item.date}</time>
                <h3 class="news-preview-title">${item.title}</h3>
                <p class="news-preview-excerpt">${item.excerpt.substring(0, 120)}${item.excerpt.length > 120 ? '...' : ''}</p>
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
