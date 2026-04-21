/* Mobile menu toggle for all Oysterdale pages */
(function(){
  const toggleButton = document.getElementById('menu-toggle');
  const nav = document.querySelector('.main-nav');
  const navLinks = document.querySelectorAll('.main-nav a');

  if(!toggleButton || !nav) return;

  toggleButton.addEventListener('click', function(){
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
})();
