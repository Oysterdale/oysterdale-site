// Related Releases - Client-side loader
// Fetches releases.json and shows related releases based on matching artists
// Place <script src="/js/related-releases.js"></script> right before </body>
// The script expects a container: <div class="related-grid" data-current-slug="..."></div>

(function () {
  // Only run if there's a related-releases section on this page
  const grid = document.querySelector('.related-grid');
  if (!grid) return;

  const currentSlug = grid.dataset.currentSlug || '';
  if (!currentSlug) return;

  // Parse current page artists from the DOM
  const artistsContainer = document.querySelector('.release-artists');
  if (!artistsContainer) return;

  const currentArtists = Array.from(artistsContainer.querySelectorAll('a'))
    .map(a => a.textContent.trim().toLowerCase())
    .filter(Boolean);

  if (currentArtists.length === 0) return;

  function fetchReleases() {
    return fetch('/releases.json')
      .then(r => r.json())
      .catch(() => []);
  }

  function getRelatedReleases(releases, slug, artists) {
    return releases
      .filter(r => r.slug !== slug)
      .map(r => {
        const relArtists = (r.artists || []).map(a => a.toLowerCase().trim());
        const matches = relArtists.filter(a => artists.includes(a));
        return {
          ...r,
          matchCount: matches.length,
          matchArtists: matches
        };
      })
      .filter(r => r.matchCount > 0)
      .sort((a, b) => {
        // Sort by match count descending, then date descending
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      })
      .slice(0, 4); // Max 4 related releases
  }

  function generateCard(release) {
    const artistText = (release.artists || []).join(', ');
    return `
      <a href="/releases/${release.slug}/" class="related-card">
        <img src="${release.cover}" alt="${release.title}" loading="lazy">
        <h4>${release.title}</h4>
        <p>${artistText}</p>
      </a>
    `;
  }

  function render() {
    fetchReleases().then(releases => {
      const related = getRelatedReleases(releases, currentSlug, currentArtists);
      if (related.length === 0) {
        // Hide section if no related releases
        const section = document.querySelector('.related-releases');
        if (section) section.style.display = 'none';
        return;
      }
      grid.innerHTML = related.map(generateCard).join('');
    });
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
