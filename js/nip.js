/* ==========================================================================
   NIP® — zoom lentissimo della texture (se c'è) e profondità dei pannelli di vetro
   mentre la sezione attraversa lo schermo.
   Con Stop animation / reduced-motion: tutto fermo.
   (I numeri che contano li gestisce impact.js, comune a tutti gli .stat-value)
   ========================================================================== */

(function () {
  'use strict';

  var stage = document.querySelector('.nip-stage');
  if (!stage) return;
  var img = stage.querySelector('.nip-texture img');

  function motionOn() {
    return window.RoelmiMotion ? !window.RoelmiMotion.isPaused() : true;
  }

  // Profondità: i pannelli di vetro scorrono a velocità diverse dalla texture.
  // Si usa la proprietà "translate", separata da "transform" che serve
  // all'entrata dal basso (reveal), così le due animazioni non si scontrano.
  var layers = [
    { el: stage.querySelector('.nip-head'), depth: -40 },
    { el: stage.querySelector('.nip-stats'), depth: 30 }
  ].filter(function (l) { return l.el; });

  function render() {
    if (!motionOn()) {
      if (img) img.style.transform = '';
      layers.forEach(function (l) { l.el.style.translate = ''; });
      return;
    }
    var r = stage.getBoundingClientRect();
    var vh = window.innerHeight;
    var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
    if (img) img.style.transform = 'scale(' + (1 + p * 0.12).toFixed(4) + ')';
    layers.forEach(function (l) {
      l.el.style.translate = '0 ' + ((p - 0.5) * l.depth).toFixed(1) + 'px';
    });
  }

  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', render);
  if (window.RoelmiMotion) window.RoelmiMotion.onChange(render);
  render();
})();
