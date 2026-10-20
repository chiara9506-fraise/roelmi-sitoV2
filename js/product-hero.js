/* ==========================================================================
   Pagina prodotto — apertura (due varianti, scelte nel generatore):
   B .pd-hero--word: la texture si muove e si avvicina dentro il nome
   A .pd-hero--drop: "la goccia che si apre", descritta qui sotto
   Avanzamento p (0→1) dato dallo scroll della sezione:
   - 0 → 0.75  la goccia ROELMI cresce fino a coprire lo schermo
   - 0.68 → 0.92  la goccia si fonde con la texture intera + velo
   - il nome gigante sfuma all'inizio, la scheda di vetro entra alla fine
   Con Stop animation / reduced-motion: niente animazione, stato finale
   (quello del CSS) e sezione di altezza normale.
   Se si arriva con il Tab sulla scheda ancora invisibile, la pagina scorre
   fino a mostrarla.
   ========================================================================== */

(function () {
  'use strict';

  var hero = document.querySelector('.pd-hero');
  if (!hero) return;

  var card = hero.querySelector('.pd-hero-card');
  var stage = hero.querySelector('.pd-hero-stage');
  var breadcrumb = hero.querySelector('.pd-breadcrumb');
  var word = hero.querySelector('.pd-hero-word');
  var nameEl = hero.querySelector('.pd-hero-name');
  var inner = hero.querySelector('.pd-hero-inner');
  var DROP_RATIO = 36.3 / 54;   // larghezza / altezza della goccia (viewBox di --roelmi-drop)
  var mobileMq = window.matchMedia('(max-width: 899.98px)');
  var VARS = ['--drop-h', '--drop-x', '--drop-y', '--drop-o', '--full', '--name-o', '--card-o', '--name-top'];

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOut(v) { return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; }

  function motionOn() {
    return window.RoelmiMotion ? !window.RoelmiMotion.isPaused() : true;
  }

  function progress() {
    var total = hero.offsetHeight - window.innerHeight;
    if (total <= 0) return 1;
    return clamp(-hero.getBoundingClientRect().top / total);
  }

  function setFinal() {
    hero.classList.remove('is-animated', 'is-card-hidden');
    VARS.forEach(function (v) { hero.style.removeProperty(v); });
  }

  // Variante B: la texture si muove e si avvicina dentro le lettere
  var isWord = hero.classList.contains('pd-hero--word');

  function renderWord(p) {
    hero.style.setProperty('--word-y', lerp(20, 80, p).toFixed(2) + '%');
    hero.style.setProperty('--word-size', lerp(130, 190, easeInOut(p)).toFixed(1) + '%');
  }

  function render() {
    if (!motionOn()) {
      setFinal();
      hero.style.removeProperty('--word-y');
      hero.style.removeProperty('--word-size');
      return;
    }
    hero.classList.add('is-animated');

    // B: la sezione scorre normalmente, p va da 0 (in cima) a 1 (uscita)
    if (isWord) {
      var r = hero.getBoundingClientRect();
      renderWord(clamp(-r.top / Math.max(1, r.height)));
      return;
    }
    var p = progress();
    var vh = window.innerHeight;
    var big = Math.max(window.innerWidth, vh) * 5.5;  // goccia che copre tutto
    var mobile = mobileMq.matches;
    var g = easeInOut(clamp(p / 0.75));

    var stageTop = stage.getBoundingClientRect().top;
    var crumbBottom = breadcrumb ? breadcrumb.getBoundingClientRect().bottom - stageTop : 0;

    // Mobile: la goccia sta nello spazio libero più grande (sopra o sotto il
    // nome), mai sopra testo: nome e percorso restano sempre su fondo scuro
    var startH, center;
    if (mobile) {
      var nr = nameEl.getBoundingClientRect();
      var above = [crumbBottom, nr.top - stageTop];
      var below = [nr.bottom - stageTop, vh - 16];
      var zone = (above[1] - above[0]) >= (below[1] - below[0]) ? above : below;
      startH = Math.max(0, Math.min(vh * 0.46, zone[1] - zone[0] - 32));
      center = (zone[0] + zone[1]) / 2;
    } else {
      startH = vh * 0.62;
      center = (crumbBottom + vh) / 2;
    }
    var h = lerp(startH, big, g);
    // Desktop: all'inizio la goccia sta al centro dello spazio libero tra la
    // fine del nome (® compresa) e il margine destro del contenuto, poi va al
    // centro dello schermo
    var x;
    if (mobile) {
      x = '50%';
    } else {
      var w = h * DROP_RATIO;
      var cs = inner ? getComputedStyle(inner) : null;
      var right = inner ? inner.getBoundingClientRect().right - parseFloat(cs.paddingRight) : window.innerWidth * 0.9;
      // Fine reale del testo (la parola è un blocco largo quanto la colonna)
      var range = document.createRange();
      if (word) range.selectNodeContents(word);
      var nameEnd = word ? range.getBoundingClientRect().right : 0;
      x = lerp((nameEnd + right - w) / 2, (window.innerWidth - w) / 2, g).toFixed(1) + 'px';
    }
    // Goccia centrata nel suo spazio libero (desktop: sotto il percorso, con
    // il nome alla stessa altezza). Il centro si sposta verso la metà esatta
    // man mano che la goccia cresce oltre lo schermo.
    var wanted = lerp(center, vh / 2, g);
    var y = h < vh ? ((wanted - h / 2) / (vh - h)) * 100 : 50;
    if (!mobile) {
      // La parola (non tutto il blocco con l'etichetta) a metà altezza della goccia
      var offset = word ? word.offsetTop + word.offsetHeight / 2 : 0;
      hero.style.setProperty('--name-top', (center - offset).toFixed(1) + 'px');
    }
    var cardO = clamp((p - 0.72) / 0.2);

    hero.style.setProperty('--drop-h', h.toFixed(1) + 'px');
    hero.style.setProperty('--drop-x', x);
    hero.style.setProperty('--drop-y', y.toFixed(2) + '%');
    hero.style.setProperty('--drop-o', (1 - clamp((p - 0.7) / 0.22)).toFixed(3));
    hero.style.setProperty('--full', clamp((p - 0.68) / 0.22).toFixed(3));
    hero.style.setProperty('--name-o', (1 - clamp(p / 0.35)).toFixed(3));
    hero.style.setProperty('--card-o', cardO.toFixed(3));
    hero.classList.toggle('is-card-hidden', cardO < 0.05);
  }

  // Tab sulla scheda ancora invisibile: porta lo scroll alla fine dell'apertura
  if (card) {
    card.addEventListener('focusin', function () {
      if (!hero.classList.contains('is-card-hidden')) return;
      var total = hero.offsetHeight - window.innerHeight;
      var top = hero.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + total, behavior: 'auto' });
    });
  }

  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', render);
  if (window.RoelmiMotion) window.RoelmiMotion.onChange(render);
  render();
})();
