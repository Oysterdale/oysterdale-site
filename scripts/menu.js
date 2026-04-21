/* Mobile menu toggle for all Oysterdale pages */
document.addEventListener('DOMContentLoaded', function() {
  console.log('Menu.js loaded');
  const toggleButton = document.getElementById('menu-toggle');
  const nav = document.querySelector('.main-nav');
  const navLinks = document.querySelectorAll('.main-nav a');

  console.log('Toggle found:', !!toggleButton);
  console.log('Nav found:', !!nav);

  if(!toggleButton || !nav) return;

  toggleButton.addEventListener('click', function(){
    console.log('Toggle clicked');
    nav.classList.toggle('open');
    toggleButton.textContent = nav.classList.contains('open') ? '✖' : '☰';
  });

  navLinks.forEach(function(link){
    link.addEventListener('click', function(){
      if(nav.classList.contains('open')){
        nav.classList.remove('open');
        toggleButton.textContent = '☰';
      }
    });
  });
});
