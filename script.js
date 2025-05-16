document.addEventListener("DOMContentLoaded", function () {
  // Last inn header dynamisk
  fetch("header.html")
    .then(res => res.text())
    .then(data => {
      document.getElementById("main-header").innerHTML = data;
      initMobileMenu(); // Kjør menyfunksjon etter at header er lastet inn
    });

  function initMobileMenu() {
    const toggleButton = document.getElementById("menu-toggle");
    const nav = document.querySelector(".main-nav");
    const navLinks = document.querySelectorAll(".main-nav a");

    if (!toggleButton || !nav) return;

    toggleButton.addEventListener("click", function () {
      nav.classList.toggle("open");
      toggleButton.innerHTML = toggleButton.innerHTML === "☰" ? "✕" : "☰";
    });

    navLinks.forEach(link => {
      link.addEventListener("click", function () {
        if (nav.classList.contains("open")) {
          nav.classList.remove("open");
          toggleButton.innerHTML = "☰";
        }
      });
    });
  }
});
