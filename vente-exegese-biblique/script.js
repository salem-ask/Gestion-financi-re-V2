/* ============================================================
 * SEUL ENDROIT À MODIFIER pour changer la destination des CTA :
 * ============================================================ */
const CHARIOW_URL = "https://livresenligne.mychariow.shop/prd_0u00x6/checkout";

/* ============================================================
 * Meta Ads — à configurer plus tard.
 * Tant que META_PIXEL_ID est vide, aucun script Meta n'est chargé
 * et le site continue de fonctionner normalement (CTA et
 * redirections inchangés).
 * ============================================================ */
const META_PIXEL_ID = "";

(function () {
  "use strict";

  /* ---------- Meta Pixel (optionnel) ---------- */
  function loadMetaPixel() {
    if (!META_PIXEL_ID) return;
    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
    window.fbq("track", "ViewContent", {
      content_name: "Maîtrisez l'Exégèse Biblique",
      content_type: "product",
    });
  }

  function trackEvent(name, params) {
    if (typeof window.fbq === "function") {
      window.fbq("track", name, params || {});
    }
  }

  loadMetaPixel();

  /* Injecte l'URL Chariow dans tous les boutons CTA de la page et
     déclenche un événement InitiateCheckout avant la redirection
     (le clic n'est jamais bloqué si le tracking n'est pas configuré). */
  document.querySelectorAll("[data-cta]").forEach(function (link) {
    link.setAttribute("href", CHARIOW_URL);
    link.setAttribute("rel", "noopener");
    link.addEventListener("click", function () {
      trackEvent("InitiateCheckout", { content_name: "Maîtrisez l'Exégèse Biblique" });
    });
  });

  /* Affiche un repère élégant si une capture WhatsApp référencée n'a pas
     encore été fournie (images/proof/whatsapp-01.jpg à -04.jpg, etc.). */
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

  var proofCards = document.querySelectorAll(".proof-card");
  proofCards.forEach(function (card) {
    var img = card.querySelector("img");
    if (img) {
      setupMissingImageFallback(img, card, "proof-card--missing");
    }
  });

  /* ---------- Lightbox pour les captures WhatsApp ---------- */
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightbox-img");
  var lightboxClose = document.getElementById("lightbox-close");
  var lightboxPrev = document.getElementById("lightbox-prev");
  var lightboxNext = document.getElementById("lightbox-next");

  if (lightbox && lightboxImg) {
    var currentIndex = -1;

    function availableCards() {
      return Array.prototype.filter.call(proofCards, function (card) {
        return !card.classList.contains("proof-card--missing");
      });
    }

    function openLightbox(card) {
      var cards = availableCards();
      var index = cards.indexOf(card);
      if (index === -1) return;
      currentIndex = index;
      showCurrent(cards);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
    }

    function showCurrent(cards) {
      var card = cards[currentIndex];
      var img = card.querySelector("img");
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImg.src = "";
      document.body.style.overflow = "";
    }

    function step(delta) {
      var cards = availableCards();
      if (!cards.length) return;
      currentIndex = (currentIndex + delta + cards.length) % cards.length;
      showCurrent(cards);
    }

    proofCards.forEach(function (card) {
      card.addEventListener("click", function () {
        if (card.classList.contains("proof-card--missing")) return;
        openLightbox(card);
      });
    });

    lightboxClose.addEventListener("click", closeLightbox);
    lightboxPrev.addEventListener("click", function () {
      step(-1);
    });
    lightboxNext.addEventListener("click", function () {
      step(1);
    });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (lightbox.hidden) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

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
