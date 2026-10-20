/* ==========================================================================
   Motion — stato globale delle animazioni continue
   - "Stop animation" ferma tutto: video, texture, trame (classe .motion-paused)
   - Con prefers-reduced-motion si parte in pausa (l'utente può riattivare)
   - La scelta resta salvata per la visita successiva (se lo storage c'è)

   API per gli altri script:
     RoelmiMotion.isPaused()          → true/false
     RoelmiMotion.onChange(fn)        → fn(paused) a ogni cambio
     RoelmiMotion.reducedMotion       → preferenza di sistema
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var STORAGE_KEY = 'roelmi-motion-paused';
  var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var listeners = [];

  function readStored() {
    try {
      var v = window.localStorage.getItem(STORAGE_KEY);
      return v === null ? null : v === '1';
    } catch (e) {
      return null;
    }
  }

  function store(paused) {
    try {
      window.localStorage.setItem(STORAGE_KEY, paused ? '1' : '0');
    } catch (e) { /* storage non disponibile: nessun problema */ }
  }

  var stored = readStored();
  var paused = stored !== null ? stored : reduceMq.matches;

  function syncButtons() {
    var buttons = document.querySelectorAll('[data-motion-toggle]');
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      var label = btn.querySelector('[data-motion-label]');
      if (label) label.textContent = paused ? 'Play animation' : 'Stop animation';
    });
  }

  function apply() {
    root.classList.toggle('motion-paused', paused);
    syncButtons();
    listeners.forEach(function (fn) { fn(paused); });
  }

  function setPaused(value, persist) {
    if (value === paused) return;
    paused = value;
    if (persist) store(paused);
    apply();
  }

  window.RoelmiMotion = {
    reducedMotion: reduceMq.matches,
    isPaused: function () { return paused; },
    onChange: function (fn) { listeners.push(fn); },
    setPaused: function (v) { setPaused(!!v, true); }
  };

  // Se la preferenza di sistema cambia e l'utente non ha scelto, la seguiamo
  reduceMq.addEventListener('change', function (e) {
    window.RoelmiMotion.reducedMotion = e.matches;
    if (readStored() === null) setPaused(e.matches, false);
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-motion-toggle]');
    if (btn) setPaused(!paused, true);
  });

  root.classList.toggle('motion-paused', paused);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncButtons);
  } else {
    syncButtons();
  }
})();
