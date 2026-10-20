/* ==========================================================================
   Blog — anteprima dell'articolo che segue il cursore (solo mouse)
   - Passando su una riga compare la sua immagine e segue il mouse, morbida
   - Con Stop animation / reduced-motion: l'immagine compare ferma a destra
     della riga, senza seguire il cursore
   L'anteprima è decorativa (aria-hidden): il contenuto è nella riga.
   ========================================================================== */

(function () {
  'use strict';

  var list = document.querySelector('.blog-list');
  var preview = list && list.querySelector('.blog-preview');
  if (!preview || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var images = Array.prototype.slice.call(preview.querySelectorAll('img'));
  var posts = Array.prototype.slice.call(list.querySelectorAll('.post'));
  var pos = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  var raf = 0;

  function motionOn() {
    return window.RoelmiMotion ? !window.RoelmiMotion.isPaused() : true;
  }

  function place(x, y) {
    preview.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
  }

  function loop() {
    pos.x += (target.x - pos.x) * 0.15;
    pos.y += (target.y - pos.y) * 0.15;
    place(pos.x, pos.y);
    raf = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.3 ? requestAnimationFrame(loop) : 0;
  }

  function show(index) {
    images.forEach(function (img, i) { img.classList.toggle('is-current', i === index); });
    preview.classList.add('is-visible');
  }

  function hide() {
    preview.classList.remove('is-visible');
  }

  // Posizione "ferma": a destra della riga, centrata in verticale
  function restAt(post) {
    var lr = list.getBoundingClientRect();
    var r = post.getBoundingClientRect();
    var w = preview.offsetWidth;
    var h = preview.offsetHeight;
    target.x = pos.x = lr.width - w;
    target.y = pos.y = r.top - lr.top + r.height / 2 - h / 2;
    place(pos.x, pos.y);
  }

  posts.forEach(function (post, i) {
    post.addEventListener('mouseenter', function (e) {
      show(i);
      if (!motionOn()) { restAt(post); return; }
      var lr = list.getBoundingClientRect();
      // Prima apparizione: parte già sotto il cursore
      if (!preview.classList.contains('was-shown')) {
        pos.x = target.x = e.clientX - lr.left - preview.offsetWidth / 2;
        pos.y = target.y = e.clientY - lr.top - preview.offsetHeight / 2;
        place(pos.x, pos.y);
        preview.classList.add('was-shown');
      }
    });
  });

  list.addEventListener('mousemove', function (e) {
    if (!motionOn()) return;
    var lr = list.getBoundingClientRect();
    target.x = e.clientX - lr.left - preview.offsetWidth / 2;
    target.y = e.clientY - lr.top - preview.offsetHeight / 2;
    if (!raf) raf = requestAnimationFrame(loop);
  });

  list.addEventListener('mouseleave', function () {
    hide();
    preview.classList.remove('was-shown');
  });
})();
