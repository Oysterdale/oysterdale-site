document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('menu-toggle');
  const nav = document.getElementById('nav');
  const icon = toggleBtn.querySelector('i');

  toggleBtn.addEventListener('click', () => {
    nav.classList.toggle('active');
    icon.classList.toggle('fa-bars');
    icon.classList.toggle('fa-times');
  });

  const navLinks = nav.querySelectorAll('a');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (nav.classList.contains('active')) {
        nav.classList.remove('active');
        icon.classList.add('fa-bars');
        icon.classList.remove('fa-times');
      }
    });
  });
});
