// Auto-adds 'active' class to current nav link based on URL
(function() {
  function setActiveNav() {
    const path = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Remove existing active class
      link.classList.remove('active');
      
      // Check if current path matches this link
      // Handle both '/artists' and '/artists/' style paths
      const cleanPath = path.replace(/\/$/, '') || '/';
      const cleanHref = href.replace(/\/$/, '') || '/';
      
      if (cleanPath === cleanHref) {
        link.classList.add('active');
      }
    });
  }
  
  // Expose globally so pages can call it after loading header.html
  window.setActiveNav = setActiveNav;
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setActiveNav);
  } else {
    setActiveNav();
  }
  
  // Also run after header.html is loaded (for pages using fetch)
  window.addEventListener('load', setActiveNav);
})();
