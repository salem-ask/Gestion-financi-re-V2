/* ============================================================
 * SEUL ENDROIT À MODIFIER pour changer la destination des CTA :
 * ============================================================ */
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_eq8dt0/checkout";

(function () {
  "use strict";

  /* Injecte l'URL Chariow dans tous les boutons CTA de la page. */
  document.querySelectorAll("[data-cta]").forEach(function (link) {
    link.setAttribute("href", CHARIOW_URL);
    link.setAttribute("rel", "noopener");
  });

  /* Affiche un repère élégant si une image référencée n'a pas encore été
     fournie (cover.jpg, captures WhatsApp de la preuve sociale, etc.). */
  function setupMissingImageFallback(img, container, missingClass) {
    var markMissing = function () {
      container.classList.add(missingClass);
    };
    if (img.complete && img.naturalWidth === 0) {
      markMissing();
    } else {
      img.addEventListener("error", markMissing, { once: true });
    }
  }

  var coverImg = document.querySelector(".hero__cover img");
  if (coverImg) {
    setupMissingImageFallback(coverImg, coverImg.closest(".hero__cover"), "cover--missing");
  }

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

  /* Menu mobile (hamburger). */
  var navToggle = document.getElementById("nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  if (navToggle && navMenu) {
    var closeMenu = function () {
      navMenu.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", function () {
      var isOpen = navMenu.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  /* Bouton CTA sticky mobile : apparaît après le hero, fermable. */
  var stickyCta = document.getElementById("sticky-cta");
  var stickyClose = document.getElementById("sticky-cta-close");
  var hero = document.querySelector(".hero");
  var stickyDismissed = false;

  if (stickyClose && stickyCta) {
    stickyClose.addEventListener("click", function () {
      stickyDismissed = true;
      stickyCta.classList.remove("is-visible");
    });
  }

  if (stickyCta && hero) {
    var revealThreshold = hero.offsetHeight * 0.6;
    var ticking = false;

    function updateStickyCta() {
      var shouldShow = !stickyDismissed && window.scrollY > revealThreshold;
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

  /* Lightbox : agrandir une capture WhatsApp au clic. */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.setAttribute("src", src);
    lightboxImg.setAttribute("alt", alt || "");
    lightbox.classList.add("is-open");
  }
  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.classList.remove("is-open");
    lightboxImg.setAttribute("src", "");
  }

  document.querySelectorAll(".proof-card[data-lightbox]").forEach(function (card) {
    card.addEventListener("click", function () {
      if (card.classList.contains("proof-card--missing")) return;
      var img = card.querySelector("img");
      if (img) openLightbox(img.getAttribute("src"), img.getAttribute("alt"));
    });
  });

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });
})();
