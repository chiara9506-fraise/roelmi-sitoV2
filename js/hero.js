/* ==========================================================================
   Hero — racconto a scroll in stile Until
   - Avanzamento p (0→1) calcolato dalla posizione della sezione
   - Video: avanza con lo scroll (scrub) e si ingrandisce (data-zoom)
   - Frasi: una alla volta, parola per parola (opacità + sfocatura)
   - Stop animation / reduced-motion: niente zoom, scrub, sfocature;
     le frasi cambiano comunque con lo scroll (sono contenuto)
   ========================================================================== */

(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero) return;

  var video = hero.querySelector('.hero-video');
  var cue = hero.querySelector('.hero-cue');
  var steps = Array.prototype.slice.call(hero.querySelectorAll('[data-step]'))
    .sort(function (a, b) { return a.getAttribute('data-step') - b.getAttribute('data-step'); });
  var N = steps.length;
  var ZOOM = parseFloat(hero.getAttribute('data-zoom')) || 2.4;
  var mobileMq = window.matchMedia('(max-width: 767.98px)');

  hero.style.setProperty('--hero-steps', N);

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeInOut(v) { return v < 0.5 ? 2 * v * v : 1 - Math.pow(-2 * v + 2, 2) / 2; }
  function easeOut(v) { return 1 - Math.pow(1 - v, 3); }

  function motionOn() {
    return window.RoelmiMotion ? !window.RoelmiMotion.isPaused() : true;
  }

  /* ------------------------------------------------------------------------
     1. Frasi divise in parole.
        Lo screen reader legge il testo intero (sr-only); le parole visibili
        sono aria-hidden, così nessuna frase viene letta "a pezzi".
     ------------------------------------------------------------------------ */

  var stepWords = steps.map(function (step) {
    var text = step.textContent.replace(/\s+/g, ' ').trim();
    step.textContent = '';

    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text + ' ';
    step.appendChild(sr);

    var vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    var words = text.split(' ').map(function (w, i, arr) {
      var span = document.createElement('span');
      span.className = 'story-word';
      span.textContent = w;
      vis.appendChild(span);
      if (i < arr.length - 1) vis.appendChild(document.createTextNode(' '));
      return span;
    });
    step.appendChild(vis);
    return words;
  });

  /* ------------------------------------------------------------------------
     2. Video: file giusto per lo schermo, scrub con lo scroll
     ------------------------------------------------------------------------ */

  var pendingSeek = null;

  function pickSource() {
    if (!video) return;
    var src = mobileMq.matches ? video.dataset.srcMobile : video.dataset.src;
    var poster = mobileMq.matches ? video.dataset.posterMobile : video.dataset.poster;
    if (poster) video.poster = poster;
    if (src && video.getAttribute('src') !== src) {
      video.src = src;
      video.load();
    }
  }

  function seek(t) {
    if (!video || !isFinite(video.duration)) return;
    if (video.seeking) { pendingSeek = t; return; }
    if (Math.abs(video.currentTime - t) > 0.03) {
      try { video.currentTime = t; } catch (e) { /* non ancora pronto */ }
    }
  }

  if (video) {
    video.muted = true;
    video.pause();
    pickSource();
    mobileMq.addEventListener('change', pickSource);
    video.addEventListener('seeked', function () {
      if (pendingSeek === null) return;
      var t = pendingSeek;
      pendingSeek = null;
      seek(t);
    });
    video.addEventListener('loadedmetadata', render);
  }

  /* ------------------------------------------------------------------------
     3. Entrata della prima frase al caricamento
     ------------------------------------------------------------------------ */

  var intro = motionOn() ? 0 : 1;
  var introStarted = false;

  function runIntro() {
    if (introStarted || intro >= 1) return;
    introStarted = true;
    var start = null;
    var DURATION = 1600;
    function tick(now) {
      if (start === null) start = now;
      intro = clamp((now - start) / DURATION);
      render();
      if (intro < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    // Rete di sicurezza: se i fotogrammi non arrivano, la frase compare comunque
    setTimeout(function () { if (intro < 1) { intro = 1; render(); } }, DURATION + 600);
  }

  /* ------------------------------------------------------------------------
     4. Disegno in base allo scroll
     ------------------------------------------------------------------------ */

  function progress() {
    var total = hero.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-hero.getBoundingClientRect().top / total);
  }

  function styleWords(words, reveal, exit, animated) {
    var n = words.length;
    for (var k = 0; k < n; k++) {
      var w = words[k].style;
      if (!animated) {
        w.opacity = '';
        w.filter = '';
        w.transform = '';
        continue;
      }
      // Le parole entrano in sequenza, da sinistra a destra
      var wp = easeOut(clamp((reveal * (n + 2) - k) / 2));
      var o = wp * (1 - exit);
      w.opacity = o.toFixed(3);
      var blur = (1 - wp) * 10 + exit * 8;
      w.filter = blur > 0.05 ? 'blur(' + blur.toFixed(2) + 'px)' : '';
      w.transform = 'translate3d(0,' + ((1 - wp) * 0.3 - exit * 0.15).toFixed(3) + 'em,0)';
    }
  }

  function render() {
    var animated = motionOn();
    var p = progress();
    var pos = p * N;
    var s = Math.min(N - 1, Math.floor(pos));
    var t = pos - s;

    steps.forEach(function (step, i) {
      var active = i === s;
      step.classList.toggle('is-active', active);
      if (!active) { step.style.opacity = ''; return; }
      var reveal = i === 0 ? intro : clamp(t / 0.3);
      var exit = i === N - 1 ? 0 : clamp((t - 0.78) / 0.22);
      styleWords(stepWords[i], reveal, exit, animated);
      step.style.opacity = animated ? '' : '1';
    });

    // Il cue sparisce al primo scroll, come Until
    if (cue) cue.classList.toggle('is-hidden', window.scrollY > 10);

    // Dopo il clic sul logo: arrivati in cima, la prima frase rientra da capo
    if (replayPending && window.scrollY <= 1) {
      replayPending = false;
      if (animated) {
        intro = 0;
        introStarted = false;
        runIntro();
      }
    }

    if (video) {
      var z = animated ? 1 + (ZOOM - 1) * easeInOut(p) : 1;
      video.style.transform = z > 1.0001 ? 'scale(' + z.toFixed(4) + ')' : '';
      if (animated && isFinite(video.duration)) seek(p * Math.max(0, video.duration - 0.05));
    }
  }

  var replayPending = false;
  document.addEventListener('roelmi:home', function () {
    replayPending = true;
    // Già in cima: nessuno scroll in arrivo, si riparte subito
    if (window.scrollY <= 1) render();
  });

  window.addEventListener('scroll', render, { passive: true });
  window.addEventListener('resize', render);
  if (window.RoelmiMotion) {
    window.RoelmiMotion.onChange(function (paused) {
      if (paused) intro = 1;
      render();
    });
  }

  render();
  hero.classList.add('is-ready');
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(runIntro);
    setTimeout(runIntro, 800);
  } else {
    runIntro();
  }
})();
