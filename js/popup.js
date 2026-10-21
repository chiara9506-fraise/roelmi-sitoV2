/* ==========================================================================
   Pop-up evento (home)
   - Compare dopo 3 secondi, come in SITO 1
   - Si chiude con × o Esc; ricompare a ogni caricamento della pagina
   - Chiuso, resta una linguetta sul bordo destro: un clic lo riapre
   - Non ruba il focus: lo screen reader lo sente da una riga di stato
   ========================================================================== */

(function () {
  'use strict';

  var popup = document.getElementById('sitePopup');
  var close = document.getElementById('sitePopupClose');
  var tab = document.getElementById('sitePopupTab');
  if (!popup || !close) return;

  var DELAY = 3000;

  // Riga di stato sempre presente: annuncia l'arrivo del pop-up
  var status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('role', 'status');
  document.body.appendChild(status);
  popup.removeAttribute('aria-live');

  // Mostra / nasconde con la dissolvenza del CSS (classe is-visible)
  function reveal(el) {
    el.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('is-visible'); });
    });
    // Rete di sicurezza se i fotogrammi non arrivano
    setTimeout(function () { el.classList.add('is-visible'); }, 120);
  }

  function conceal(el) {
    el.classList.remove('is-visible');
    setTimeout(function () { if (!el.classList.contains('is-visible')) el.hidden = true; }, 450);
  }

  function show() {
    reveal(popup);
    status.textContent = 'Event: ' + popup.querySelector('.site-popup-title').textContent + '. Press Escape to close.';
  }

  function hide(returnFocus) {
    var hadFocus = popup.contains(document.activeElement);
    conceal(popup);
    status.textContent = '';
    if (tab) {
      tab.setAttribute('aria-expanded', 'false');
      reveal(tab);
    }
    // Se il focus era nel pop-up, va alla linguetta che lo riapre
    if (returnFocus && hadFocus) {
      if (tab) tab.focus({ preventScroll: true });
      else {
        var main = document.getElementById('main');
        if (main) main.focus({ preventScroll: true });
      }
    }
  }

  // Linguetta: riapre il pop-up e ci porta il focus
  if (tab) {
    tab.addEventListener('click', function () {
      conceal(tab);
      tab.setAttribute('aria-expanded', 'true');
      reveal(popup);
      popup.focus({ preventScroll: true });
    });
  }

  close.addEventListener('click', function () { hide(true); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !popup.hidden) hide(true);
  });

  setTimeout(show, DELAY);
})();
