/* ==========================================================================
   Who We Are
   1. Il paragrafo si accende parola per parola durante lo scroll
      (lo screen reader legge sempre il testo intero)
   2. La fascia di immagini scorre da destra verso sinistra con lo scroll
   Con Stop animation / reduced-motion: tutto acceso, immagini ferme.
   ========================================================================== */

(function () {
  'use strict';

  var section = document.getElementById('who');
  if (!section) return;

  var statement = section.querySelector('.who-statement');
  var gallery = section.querySelector('.who-gallery');
  var track = section.querySelector('.who-track');
  var words = [];

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  function motionOn() {
    return window.RoelmiMotion ? !window.RoelmiMotion.isPaused() : true;
  }

  /* ------------------------------------------------------------------------
     1. Parole: copia visibile divisa in parole (aria-hidden) + testo intero
        per lo screen reader. I <strong> restano, così gli accenti Ocean.
     ------------------------------------------------------------------------ */

  function splitInto(source, target) {
    Array.prototype.forEach.call(source.childNodes, function (node) {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            target.appendChild(document.createTextNode(' '));
          } else {
            var w = document.createElement('span');
            w.className = 'who-word';
            w.textContent = part;
            target.appendChild(w);
            words.push(w);
          }
        });
      } else if (node.nodeType === 1) {
        var copy = node.cloneNode(false);
        target.appendChild(copy);
        splitInto(node, copy);
      }
    });
  }

  if (statement) {
    var original = statement.cloneNode(true);
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = statement.textContent.replace(/\s+/g, ' ').trim();
    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    splitInto(original, vis);
    statement.textContent = '';
    statement.appendChild(sr);
    statement.appendChild(vis);
    statement.classList.add('is-ready');
  }

  /* ------------------------------------------------------------------------
     2. Disegno in base allo scroll
     ------------------------------------------------------------------------ */

  function render() {
    var vh = window.innerHeight;
    var animated = motionOn();

    // Parole: si accendono mentre il paragrafo sale dall'85% al 35% dello schermo
    if (words.length) {
      var r = statement.getBoundingClientRect();
      var p = animated ? clamp((vh * 0.85 - r.top) / (r.height + vh * 0.5)) : 1;
      var lit = Math.round(p * words.length);
      for (var i = 0; i < words.length; i++) {
        words[i].classList.toggle('is-lit', i < lit);
      }
    }

    // Immagini: da destra verso sinistra. Il movimento è distribuito su
    // tutto il passaggio della sezione (non solo della fascia): così è più
    // lento e si vedono tutte le texture
    if (track) {
      if (!animated) {
        track.style.transform = '';
        return;
      }
      var s = section.getBoundingClientRect();
      var prog = clamp((vh - s.top) / (vh + s.height));
      var travel = Math.max(0, track.scrollWidth - window.innerWidth);
      var startX = window.innerWidth * 0.15;
      var x = startX - prog * (travel + startX);
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
    }
  }

  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', render);
  if (window.RoelmiMotion) window.RoelmiMotion.onChange(render);
  render();
})();
