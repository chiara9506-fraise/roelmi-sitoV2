/* ==========================================================================
   About us
   1. Video dell'apertura in loop (si ferma con Stop animation)
   2. "RO · EL · MI" si apre nei nomi: un solo momento, al caricamento
   3. Our Approach: la linea della sequenza si riempie scorrendo
   4. Timeline: la scena resta ferma e gli anni scorrono di lato
      (da tastiera: il focus su un link porta l'anno in vista)
   Con Stop animation / reduced-motion: nome già aperto, linea piena,
   timeline come riga scorrevole a mano.
   ========================================================================== */

(function () {
  'use strict';

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function motionOn() {
    return window.RoelmiMotion ? !window.RoelmiMotion.isPaused() : true;
  }

  /* ------------------------------------------------------------------------
     1. Video
     ------------------------------------------------------------------------ */

  var video = document.querySelector('.ab-video');
  function syncVideo() {
    if (!video) return;
    if (!motionOn()) { video.pause(); return; }
    var p = video.play();
    if (p && p.catch) p.catch(function () {});
  }
  if (video) {
    video.muted = true;
    if (video.dataset.src) video.src = video.dataset.src;
    video.addEventListener('error', function () { video.removeAttribute('src'); video.load(); }, true);
  }

  /* ------------------------------------------------------------------------
     2. Il nome che si apre
     ------------------------------------------------------------------------ */

  var hero = document.querySelector('.ab-hero');
  function expandName() { if (hero) hero.classList.add('is-expanded'); }

  if (hero) {
    if (!motionOn()) {
      expandName();
    } else {
      var go = function () { setTimeout(expandName, 500); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
      setTimeout(expandName, 2500); // rete di sicurezza
    }
  }

  /* ------------------------------------------------------------------------
     3. Our Approach: linea della sequenza
     ------------------------------------------------------------------------ */

  var steps = document.querySelector('.ab-steps');
  var stepItems = steps ? Array.prototype.slice.call(steps.querySelectorAll('.ab-step')) : [];

  function renderSteps() {
    if (!steps) return;
    var p = 1;
    if (motionOn()) {
      var r = steps.getBoundingClientRect();
      var vh = window.innerHeight;
      // si riempie mentre le fasi salgono dall'80% al 35% dello schermo
      p = clamp((vh * 0.8 - r.top) / (vh * 0.45));
    }
    steps.style.setProperty('--steps-p', p.toFixed(3));
    stepItems.forEach(function (it, i) {
      it.classList.toggle('is-on', p >= (i / stepItems.length) + 0.02 || p === 1);
    });
  }

  /* ------------------------------------------------------------------------
     4. Timeline orizzontale
     ------------------------------------------------------------------------ */

  var tl = document.querySelector('.ab-timeline');
  var track = tl && tl.querySelector('.ab-tl-track');
  var distance = 0;

  function measureTimeline() {
    if (!tl || !track) return;
    if (!motionOn()) {
      tl.classList.remove('is-pinned');
      tl.style.height = '';
      tl.style.removeProperty('--tl-x');
      tl.style.removeProperty('--tl-p');
      distance = 0;
      return;
    }
    tl.classList.add('is-pinned');
    distance = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
    tl.style.height = (window.innerHeight + distance) + 'px';
  }

  function renderTimeline() {
    if (!tl || !distance) return;
    var p = clamp(-tl.getBoundingClientRect().top / distance);
    tl.style.setProperty('--tl-x', (-p * distance).toFixed(1) + 'px');
    tl.style.setProperty('--tl-p', p.toFixed(3));
  }

  // Tab su un link di un anno fuori schermo: la pagina scorre fino a lui
  if (track) {
    track.addEventListener('focusin', function (e) {
      if (!distance) return;
      var item = e.target.closest('.ab-tl-item');
      if (!item) return;
      var x = Math.min(distance, Math.max(0, item.offsetLeft - 24));
      var top = tl.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + x, behavior: 'auto' });
    });
  }

  /* ------------------------------------------------------------------------
     Eventi
     ------------------------------------------------------------------------ */

  function onScroll() {
    renderSteps();
    renderTimeline();
  }

  function onChange() {
    syncVideo();
    if (!motionOn()) expandName();
    measureTimeline();
    onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measureTimeline(); onScroll(); });
  window.addEventListener('load', function () { measureTimeline(); onScroll(); });
  if (window.RoelmiMotion) window.RoelmiMotion.onChange(onChange);
  onChange();
})();
