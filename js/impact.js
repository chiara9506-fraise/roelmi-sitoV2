/* ==========================================================================
   Numeri che contano (Impact e NIP®) da zero quando entrano nello schermo.
   Lo screen reader legge sempre il valore finale (testo sr-only).
   Con Stop animation / reduced-motion: valore finale subito.
   ========================================================================== */

(function () {
  'use strict';

  var nums = document.querySelectorAll('.stat-value[data-count]');
  if (!nums.length) return;

  var DURATION = 1600;

  function motionOn() {
    return window.RoelmiMotion ? !window.RoelmiMotion.isPaused() : true;
  }

  function easeOut(v) { return 1 - Math.pow(1 - v, 3); }

  // Numeri negativi con il segno meno tipografico (−34, non -34)
  function setValue(el, v) {
    var n = Math.round(v);
    el.textContent = (n < 0 ? '−' : '') + Math.abs(n);
  }

  function count(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (!motionOn()) { setValue(el, target); return; }

    var start = null;
    function tick(now) {
      if (start === null) start = now;
      var p = Math.min(1, (now - start) / DURATION);
      setValue(el, target * easeOut(p));
      if (p < 1) requestAnimationFrame(tick);
    }
    setValue(el, 0);
    requestAnimationFrame(tick);
    // Rete di sicurezza: il valore finale arriva comunque
    setTimeout(function () { setValue(el, target); }, DURATION + 400);
  }

  if (!('IntersectionObserver' in window) || !motionOn()) {
    Array.prototype.forEach.call(nums, function (el) {
      setValue(el, parseFloat(el.getAttribute('data-count')));
    });
    return;
  }

  // Partono da 0 solo se l'animazione è attiva
  Array.prototype.forEach.call(nums, function (el) { setValue(el, 0); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      count(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  Array.prototype.forEach.call(nums, function (el) { io.observe(el); });
})();
