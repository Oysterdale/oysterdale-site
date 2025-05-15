document.addEventListener("DOMContentLoaded", function () {
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
