/* ============================================================
 * SEUL ENDROIT À MODIFIER pour changer la destination des CTA :
 * ============================================================ */
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_kl29up/checkout";

(function () {
  "use strict";

  /* Injecte l'URL Chariow dans tous les boutons CTA de la page. */
  document.querySelectorAll("[data-cta]").forEach(function (link) {
    link.setAttribute("href", CHARIOW_URL);
    link.setAttribute("rel", "noopener");
  });

  /* Affiche un repère élégant si une image référencée n'a pas encore été
     fournie (affiche du pack, captures WhatsApp de la preuve sociale). */
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

  document.querySelectorAll(".hero__cover img, .presentation__cover img").forEach(function (img) {
    setupMissingImageFallback(img, img.parentElement, "cover--missing");
  });

  document.querySelectorAll(".proof-card img").forEach(function (img) {
    setupMissingImageFallback(img, img.closest(".proof-card"), "proof-card--missing");
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

  /* Barre CTA sticky (mobile) : apparaît après le premier scroll, sans
     jamais recouvrir le contenu (padding réservé sur <body>). */
  var stickyCta = document.getElementById("sticky-cta");
  var hero = document.querySelector(".hero");
  if (stickyCta && hero) {
    var revealThreshold = hero.offsetHeight * 0.6;
    var ticking = false;

    function updateStickyCta() {
      var shouldShow = window.scrollY > revealThreshold;
      stickyCta.classList.toggle("is-visible", shouldShow);
      document.body.classList.toggle("has-sticky-cta", shouldShow);
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

  /* Lightbox : ouvre une capture WhatsApp en grand au clic, avec
     navigation précédent/suivant entre toutes les captures de la galerie. */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var lightboxPrev = document.getElementById("lightbox-prev");
  var lightboxNext = document.getElementById("lightbox-next");
  var proofImages = Array.prototype.slice.call(document.querySelectorAll(".proof-card img"));

  if (lightbox && lightboxImg && lightboxClose && proofImages.length) {
    var lastFocused = null;
    var currentIndex = 0;

    function showImage(index) {
      var img = proofImages[index];
      if (!img || (img.complete && img.naturalWidth === 0)) return;
      currentIndex = index;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
    }

    function openLightbox(index) {
      lastFocused = document.activeElement;
      showImage(index);
      lightbox.hidden = false;
      requestAnimationFrame(function () {
        lightbox.classList.add("is-visible");
      });
      lightboxClose.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function closeLightbox() {
      lightbox.classList.remove("is-visible");
      document.removeEventListener("keydown", onKeydown);
      window.setTimeout(function () {
        lightbox.hidden = true;
        lightboxImg.src = "";
      }, 200);
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }

    function showPrev() {
      showImage((currentIndex - 1 + proofImages.length) % proofImages.length);
    }

    function showNext() {
      showImage((currentIndex + 1) % proofImages.length);
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        showPrev();
      } else if (event.key === "ArrowRight") {
        showNext();
      }
    }

    proofImages.forEach(function (img, index) {
      img.addEventListener("click", function () {
        if (img.complete && img.naturalWidth === 0) return;
        openLightbox(index);
      });
      img.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          img.click();
        }
      });
    });

    lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", showPrev);
    if (lightboxNext) lightboxNext.addEventListener("click", showNext);
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  }
})();
