// Last inn headeren og legg den til i toppen av siden
fetch('header.html')
  .then(res => res.text())
  .then(data => {
    document.body.insertAdjacentHTML('afterbegin', data);

    // Når headeren er lagt til, legg til hamburger-meny funksjon
    const toggleButton = document.getElementById("menu-toggle");
    const nav = document.querySelector(".main-nav");
    const navLinks = document.querySelectorAll(".main-nav a");

    toggleButton.addEventListener("click", function () {
      nav.classList.toggle("open");

      // Bytt mellom hamburgermeny og X
      if (toggleButton.innerHTML === "☰") {
        toggleButton.innerHTML = "✕";
      } else {
        toggleButton.innerHTML = "☰";
      }
    });

    // Lukk menyen når en lenke trykkes (kun på mobil)
    navLinks.forEach(link => {
      link.addEventListener("click", function () {
        if (nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggleButton.innerHTML = "☰";
        }
      });
    });
  });
