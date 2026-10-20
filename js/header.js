/* ==========================================================================
   Header — pillola in stile Until
   1. Si stringe dopo un po' di scroll (.is-compact)
   2. Modalità: voci in riga (desktop, pillola larga) o pannello (.is-panel-mode)
   3. Tendine (in riga) / accordion (pannello)
   4. Pannello a tutto schermo: focus intrappolato, Esc, blocco scroll
   ========================================================================== */

(function () {
  'use strict';

  var header = document.getElementById('siteHeader');
  if (!header) return;

  var nav = document.getElementById('mainNav');
  var toggle = header.querySelector('.menu-toggle');
  var triggers = Array.prototype.slice.call(header.querySelectorAll('.nav-trigger'));
  var desktopMq = window.matchMedia('(min-width: 1200px)');
  var hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)');
  var COMPACT_AT = 80;
  var closeTimer = null;

  function isPanelMode() {
    return header.classList.contains('is-panel-mode');
  }

  function isMenuOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  /* ------------------------------------------------------------------------
     1–2. Pillola stretta e modalità
     ------------------------------------------------------------------------ */

  // Su desktop la modalità pannello arriva solo dopo che le voci sono
  // sfumate (0.2s in header.css): altrimenti sparirebbero di colpo
  var PANEL_DELAY = 220;
  var panelTimer = null;

  function setPanelMode(panel) {
    if (panel === isPanelMode()) return;
    header.classList.toggle('is-panel-mode', panel);
    closeAll();
  }

  function updateMode(immediate) {
    // Con il pannello aperto la pagina è bloccata: non cambiamo stato
    if (isMenuOpen()) return;
    var compact = window.scrollY > COMPACT_AT;
    var desktop = desktopMq.matches;

    header.classList.toggle('is-compact', compact);
    clearTimeout(panelTimer);

    if (!desktop) {
      setPanelMode(true);
    } else if (!compact) {
      setPanelMode(false);
    } else if (immediate === true) {
      setPanelMode(true);
    } else if (!isPanelMode()) {
      panelTimer = setTimeout(function () {
        if (header.classList.contains('is-compact')) setPanelMode(true);
      }, PANEL_DELAY);
    }
  }

  /* ------------------------------------------------------------------------
     Vetro chiaro o scuro in base alla sezione sotto la pillola:
     .theme-light → vetro chiaro, testo Hard Grey; hero e .theme-dark → scuro
     ------------------------------------------------------------------------ */

  var pill = header.querySelector('.header-pill');

  function updateTheme() {
    var r = pill.getBoundingClientRect();
    var y = r.top + r.height / 2;
    var els = document.elementsFromPoint(window.innerWidth / 2, y);
    var onLight = false;
    for (var i = 0; i < els.length; i++) {
      if (header.contains(els[i])) continue;
      var sec = els[i].closest('.theme-light, .theme-dark, .hero, .theme-olive, .theme-cerulean, .theme-antique');
      if (sec) { onLight = !sec.classList.contains('theme-dark') && !sec.classList.contains('hero'); break; }
    }
    header.classList.toggle('is-on-light', onLight);
  }

  window.addEventListener('scroll', function () { updateMode(false); updateTheme(); }, { passive: true });
  window.addEventListener('resize', updateTheme);
  updateTheme();

  /* ------------------------------------------------------------------------
     Logo: torna in cima, la pillola si riapre e il racconto del hero riparte
     ------------------------------------------------------------------------ */

  var logo = header.querySelector('.header-logo');
  logo.addEventListener('click', function (e) {
    // Nelle altre pagine il logo è un link normale alla home
    if (logo.getAttribute('href').charAt(0) !== '#') return;
    e.preventDefault();
    if (isMenuOpen()) closeMenu(false);
    document.dispatchEvent(new CustomEvent('roelmi:home'));
    window.scrollTo({ top: 0, behavior: window.RoelmiMotion && window.RoelmiMotion.isPaused() ? 'auto' : 'smooth' });
    // Il focus torna all'inizio della pagina (utile da tastiera)
    var main = document.getElementById('main');
    if (main) main.focus({ preventScroll: true });
  });
  desktopMq.addEventListener('change', function () { updateMode(true); });

  // Primo stato senza transizioni (es. pagina ricaricata a metà)
  header.classList.add('is-init');
  updateMode(true);
  setTimeout(function () { header.classList.remove('is-init'); }, 80);

  /* ------------------------------------------------------------------------
     3. Tendine (in riga) e accordion (pannello)
     ------------------------------------------------------------------------ */

  function setOpen(trigger, open) {
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeAll(except) {
    triggers.forEach(function (t) {
      if (t !== except) setOpen(t, false);
    });
  }

  triggers.forEach(function (trigger) {
    var item = trigger.closest('.nav-item');

    trigger.addEventListener('click', function () {
      var open = trigger.getAttribute('aria-expanded') !== 'true';
      closeAll(trigger);
      setOpen(trigger, open);
    });

    // In riga, con il mouse: apertura al passaggio
    item.addEventListener('mouseenter', function () {
      if (isPanelMode() || !hoverMq.matches) return;
      clearTimeout(closeTimer);
      closeAll(trigger);
      setOpen(trigger, true);
    });

    item.addEventListener('mouseleave', function () {
      if (isPanelMode() || !hoverMq.matches) return;
      closeTimer = setTimeout(function () { setOpen(trigger, false); }, 180);
    });

    // In riga: chiude quando il focus esce dalla voce
    item.addEventListener('focusout', function (e) {
      if (isPanelMode()) return;
      if (!item.contains(e.relatedTarget)) setOpen(trigger, false);
    });
  });

  document.addEventListener('click', function (e) {
    if (!isPanelMode() && !e.target.closest('.nav-item')) closeAll();
  });

  /* ------------------------------------------------------------------------
     4. Pannello a tutto schermo
     ------------------------------------------------------------------------ */

  function focusables() {
    return Array.prototype.slice.call(
      header.querySelectorAll('a[href], button:not([disabled])')
    ).filter(function (el) {
      return el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden';
    });
  }

  var closingTimer = null;

  function openMenu() {
    // Se il clic arriva mentre le voci stanno ancora sfumando
    clearTimeout(panelTimer);
    setPanelMode(true);
    clearTimeout(closingTimer);
    nav.classList.remove('is-closing');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    nav.classList.add('is-open');
    header.classList.add('is-menu-open');
    document.documentElement.classList.add('has-menu-open');
    var first = nav.querySelector('.nav-link');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeMenu(returnFocus) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    // Dissolvenza di chiusura solo qui, quando il pannello è davvero aperto
    nav.classList.add('is-closing');
    nav.classList.remove('is-open');
    header.classList.remove('is-menu-open');
    document.documentElement.classList.remove('has-menu-open');
    closeAll();
    if (returnFocus) toggle.focus();
    clearTimeout(closingTimer);
    closingTimer = setTimeout(function () {
      nav.classList.remove('is-closing');
      updateMode(true);
    }, 460);
  }

  toggle.addEventListener('click', function () {
    if (isMenuOpen()) closeMenu(false); else openMenu();
  });

  // Scelta una voce, il pannello si chiude
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a[href]') && isMenuOpen()) closeMenu(false);
  });

  // Focus intrappolato tra pillola e pannello
  header.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !isMenuOpen()) return;
    var els = focusables();
    if (!els.length) return;
    var first = els[0];
    var last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  /* ------------------------------------------------------------------------
     Esc: chiude tendina o pannello e riporta il focus
     ------------------------------------------------------------------------ */

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (isMenuOpen()) {
      closeMenu(true);
      return;
    }
    var openTrigger = triggers.filter(function (t) {
      return t.getAttribute('aria-expanded') === 'true';
    })[0];
    if (openTrigger) {
      setOpen(openTrigger, false);
      openTrigger.focus();
    }
  });
})();
