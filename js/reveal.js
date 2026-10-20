/* ==========================================================================
   Reveal — ogni blocco [data-reveal] entra dal basso con dissolvenza lenta.
   Ritardo opzionale: data-reveal-delay="0.15" (secondi).
   Lo stile è in base.css; senza JS o con reduced-motion tutto è già visibile.
   ========================================================================== */

(function () {
  'use strict';

  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  Array.prototype.forEach.call(items, function (el) {
    var d = el.getAttribute('data-reveal-delay');
    if (d) el.style.setProperty('--reveal-delay', d + 's');
  });

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(items, function (el) { el.classList.add('is-in'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.01 });

  Array.prototype.forEach.call(items, function (el) { io.observe(el); });
})();
