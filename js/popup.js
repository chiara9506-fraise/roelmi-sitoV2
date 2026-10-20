/* ==========================================================================
   Pop-up evento (home)
   - Compare dopo 3 secondi, come in SITO 1
   - Si chiude con × o Esc; ricompare a ogni caricamento della pagina
   - Non ruba il focus: lo screen reader lo sente da una riga di stato
   ========================================================================== */

(function () {
  'use strict';

  var popup = document.getElementById('sitePopup');
  var close = document.getElementById('sitePopupClose');
  if (!popup || !close) return;

  var DELAY = 3000;

  // Riga di stato sempre presente: annuncia l'arrivo del pop-up
  var status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  document.body.appendChild(status);
  popup.removeAttribute('aria-live');

  function show() {
    popup.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { popup.classList.add('is-visible'); });
    });
    // Rete di sicurezza se i fotogrammi non arrivano
    setTimeout(function () { popup.classList.add('is-visible'); }, 120);
    status.textContent = 'Event: ' + popup.querySelector('.site-popup-title').textContent + '. Press Escape to close.';
  }

  function hide(returnFocus) {
    var hadFocus = popup.contains(document.activeElement);
    popup.classList.remove('is-visible');
    setTimeout(function () { popup.hidden = true; }, 450);
    status.textContent = '';
    // Se il focus era nel pop-up, va al contenuto principale
    if (returnFocus && hadFocus) {
      var main = document.getElementById('main');
      if (main) main.focus({ preventScroll: true });
    }
  }

  close.addEventListener('click', function () { hide(true); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !popup.hidden) hide(true);
  });

  setTimeout(show, DELAY);
})();
