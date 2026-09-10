(function () {
  "use strict";

  /* Affiche un repère élégant si une image référencée n'a pas encore été
     fournie (couvertures des deux livres). */
  function setupMissingImageFallback(img, container, missingClass) {
    var markMissing = function () {
      container.classList.add(missingClass);
    };
    /* L'image commence à charger dès le parsing du HTML : son événement
       "error" peut donc déjà s'être déclenché avant que ce script (placé
       en fin de page) n'ait le temps d'écouter. On vérifie d'abord l'état
       actuel, puis on écoute pour le cas où le chargement est en cours. */
    if (img.complete && img.naturalWidth === 0) {
      markMissing();
    } else {
      img.addEventListener("error", markMissing, { once: true });
    }
  }

  document.querySelectorAll(".hero__cover img").forEach(function (img) {
    setupMissingImageFallback(img, img.closest(".hero__cover"), "cover--missing");
  });

  document.querySelectorAll(".book-block__cover img").forEach(function (img) {
    setupMissingImageFallback(img, img.closest(".book-block__cover"), "cover--missing");
  });

  /* Effet d'apparition discret au scroll. */
  var revealTargets = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && revealTargets.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealTargets.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealTargets.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* Bouton CTA sticky : apparaît après le premier scroll. */
  var stickyCta = document.getElementById("sticky-cta");
  var hero = document.querySelector(".hero");
  if (stickyCta && hero) {
    var revealThreshold = hero.offsetHeight * 0.6;
    var ticking = false;

    function updateStickyCta() {
      var shouldShow = window.scrollY > revealThreshold;
      stickyCta.classList.toggle("is-visible", shouldShow);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(updateStickyCta);
          ticking = true;
        }
      },
      { passive: true }
    );
  }
})();
