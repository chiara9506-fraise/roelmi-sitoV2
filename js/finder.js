/* ==========================================================================
   Ingredient Finder
   - Filtri: OR dentro lo stesso gruppo, AND tra gruppi diversi
   - Ricerca libera su nome, linea, funzione, descrizione, benefici, mercato
   - Filtri e ricerca finiscono nell'indirizzo (?q=…&market=…): link
     condivisibile; arrivando dalla home (?q=hydration) la ricerca è già fatta
   - Numero di risultati annunciato (role="status")
   - Mobile: pannello filtri a tutto schermo (focus intrappolato, Esc)
   - Video dell'apertura: gira in loop, si ferma con Stop animation
   ========================================================================== */

(function () {
  'use strict';

  var DATA = window.ROELMI_INGREDIENTS || [];
  var form = document.getElementById('fxForm');
  var grid = document.getElementById('fxGrid');
  var countEl = document.getElementById('fxCount');
  if (!form || !grid) return;

  var panel = document.getElementById('fxFilters');
  var searchForm = document.querySelector('.fx-search');
  var searchInput = document.getElementById('fxSearch');
  var activeList = document.querySelector('.fx-active');
  var empty = document.querySelector('.fx-empty');
  var openBtn = document.querySelector('.fx-open');
  var openCount = document.querySelector('.fx-open-count');
  var closeBtn = document.querySelector('.fx-filters-close');
  var applyBtn = document.querySelector('.fx-apply');
  var clearBtns = document.querySelectorAll('.fx-clear');
  var mobileMq = window.matchMedia('(max-width: 899.98px)');

  // Gruppo del filtro → campo del dato
  var FIELDS = {
    line: 'line', market: 'market', tech: 'technology', type: 'type',
    category: 'category', benefit: 'benefits', cert: 'certifications'
  };
  var KEYS = Object.keys(FIELDS);

  var query = '';

  function boxes() {
    return Array.prototype.slice.call(form.querySelectorAll('input[type="checkbox"]'));
  }

  function selected() {
    var sel = {};
    KEYS.forEach(function (k) { sel[k] = []; });
    boxes().forEach(function (b) { if (b.checked) sel[b.name].push(b.value); });
    return sel;
  }

  function labelOf(box) {
    return box.parentNode.querySelector('span').textContent;
  }

  function groupTitleOf(key) {
    var box = form.querySelector('input[name="' + key + '"]');
    var legend = box && box.closest('fieldset').querySelector('legend');
    return legend ? legend.textContent : key;
  }

  /* ------------------------------------------------------------------------
     Filtro
     ------------------------------------------------------------------------ */

  function asList(v) {
    return Array.isArray(v) ? v : (v ? [v] : []);
  }

  function matches(item, sel, q) {
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (!sel[k].length) continue;
      var values = asList(item[FIELDS[k]]);
      var hit = sel[k].some(function (v) { return values.indexOf(v) !== -1; });
      if (!hit) return false;
    }
    if (q) {
      var text = [item.name, item.line, item.function, item.description]
        .concat(asList(item.benefits), asList(item.market)).join(' ').toLowerCase();
      if (text.indexOf(q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  /* ------------------------------------------------------------------------
     Schede
     ------------------------------------------------------------------------ */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function card(item) {
    var li = el('li', 'fx-card');
    var art = el('article');

    var name = el('h3', 'fx-card-name');
    var link = el('a', 'fx-card-link', item.name);
    link.href = item.link || '#';
    name.appendChild(link);
    art.appendChild(name);
    art.appendChild(el('p', 'fx-card-function', item.function));

    // Etichetta del mercato: Personal Care = Antique, Nutraceutical = Olive
    var pills = el('p', 'market-pills fx-card-markets');
    asList(item.market).forEach(function (m) {
      pills.appendChild(el('span', 'market-pill' + (m === 'Nutraceutical' ? ' market-pill--nutra' : ''), m));
    });
    art.appendChild(pills);

    var media = el('div', 'fx-card-media');
    var img = el('img');
    img.src = item.texture;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.appendChild(img);

    var glass = el('div', 'fx-card-glass');
    glass.appendChild(el('p', '', item.description));
    // Sotto la descrizione solo le certificazioni (mercato, tecnologia e tipo
    // non si ripetono: il mercato è già nell'etichetta sopra l'immagine)
    if (asList(item.certifications).length) {
      var tags = el('ul', 'fx-card-tags');
      tags.setAttribute('aria-label', 'Certifications');
      item.certifications.forEach(function (c) { tags.appendChild(el('li', '', c)); });
      glass.appendChild(tags);
    }
    media.appendChild(glass);
    art.appendChild(media);
    li.appendChild(art);
    return li;
  }

  /* ------------------------------------------------------------------------
     Disegno
     ------------------------------------------------------------------------ */

  function plural(n) {
    return n + (n === 1 ? ' ingredient' : ' ingredients');
  }

  function render(fromUser) {
    var sel = selected();
    var list = DATA.filter(function (it) { return matches(it, sel, query); });
    var filtering = query || KEYS.some(function (k) { return sel[k].length; });

    grid.textContent = '';
    list.forEach(function (it) { grid.appendChild(card(it)); });

    countEl.textContent = filtering ? list.length + ' of ' + plural(DATA.length) : plural(DATA.length);
    empty.hidden = list.length > 0;
    grid.hidden = list.length === 0;
    if (applyBtn) applyBtn.textContent = 'Show ' + plural(list.length);

    // Numero di filtri scelti per gruppo e in totale
    var total = 0;
    KEYS.forEach(function (k) {
      total += sel[k].length;
      var box = form.querySelector('input[name="' + k + '"]');
      var c = box && box.closest('details').querySelector('.fx-group-count');
      if (c) c.textContent = sel[k].length ? String(sel[k].length) : '';
    });
    if (openCount) openCount.textContent = total ? String(total) : '';
    if (openBtn) openBtn.setAttribute('aria-label', total ? 'Filters, ' + total + ' selected' : 'Filters');

    renderActive();
    if (fromUser) writeUrl(sel);
  }

  // Filtri attivi: pillole con × (bottoni veri, con nome per lo screen reader)
  function renderActive() {
    activeList.textContent = '';
    if (query) {
      activeList.appendChild(chip('Search: ' + query, 'Remove search “' + query + '”', function () {
        query = '';
        searchInput.value = '';
      }));
    }
    boxes().forEach(function (b) {
      if (!b.checked) return;
      activeList.appendChild(chip(labelOf(b), 'Remove filter ' + groupTitleOf(b.name) + ': ' + labelOf(b), function () {
        b.checked = false;
      }));
    });
  }

  function chip(text, aria, onRemove) {
    var li = el('li');
    var btn = el('button', 'fx-chip');
    btn.type = 'button';
    btn.setAttribute('aria-label', aria);
    btn.appendChild(el('span', '', text));
    btn.addEventListener('click', function () {
      // Dopo la rimozione il focus va alla pillola successiva, o al conteggio
      var items = Array.prototype.slice.call(activeList.querySelectorAll('.fx-chip'));
      var i = items.indexOf(btn);
      onRemove();
      render(true);
      var next = activeList.querySelectorAll('.fx-chip')[i] || activeList.querySelectorAll('.fx-chip')[i - 1];
      if (next) next.focus();
      else { countEl.setAttribute('tabindex', '-1'); countEl.focus(); }
    });
    li.appendChild(btn);
    return li;
  }

  /* ------------------------------------------------------------------------
     Indirizzo della pagina (link condivisibile)
     ------------------------------------------------------------------------ */

  function writeUrl(sel) {
    var params = new URLSearchParams();
    if (query) params.set('q', query);
    KEYS.forEach(function (k) { if (sel[k].length) params.set(k, sel[k].join('|')); });
    var s = params.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s : ''));
  }

  function readUrl() {
    var params = new URLSearchParams(location.search);
    query = (params.get('q') || '').trim();
    searchInput.value = query;
    KEYS.forEach(function (k) {
      var vals = (params.get(k) || '').split('|').filter(Boolean);
      form.querySelectorAll('input[name="' + k + '"]').forEach(function (b) {
        b.checked = vals.indexOf(b.value) !== -1;
        // Gruppo con filtri scelti: aperto
        if (b.checked) b.closest('details').open = true;
      });
    });
  }

  /* ------------------------------------------------------------------------
     Eventi
     ------------------------------------------------------------------------ */

  form.addEventListener('change', function () { render(true); });

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    query = searchInput.value.trim();
    render(true);
    // Porta ai risultati (utile su mobile)
    document.querySelector('.fx-results').scrollIntoView({ block: 'start' });
  });

  var typing = null;
  searchInput.addEventListener('input', function () {
    clearTimeout(typing);
    typing = setTimeout(function () {
      query = searchInput.value.trim();
      render(true);
    }, 300);
  });

  Array.prototype.forEach.call(clearBtns, function (btn) {
    btn.addEventListener('click', function () {
      boxes().forEach(function (b) { b.checked = false; });
      query = '';
      searchInput.value = '';
      render(true);
      countEl.setAttribute('tabindex', '-1');
      if (!panel.classList.contains('is-open')) countEl.focus();
    });
  });

  /* ------------------------------------------------------------------------
     Pannello filtri su mobile
     ------------------------------------------------------------------------ */

  function focusables() {
    return Array.prototype.slice.call(panel.querySelectorAll('button, summary, input, a[href]'))
      .filter(function (n) { return n.offsetParent !== null || n.tagName === 'INPUT'; });
  }

  function openPanel() {
    panel.classList.add('is-open');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    openBtn.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('has-menu-open');
    setTimeout(function () { closeBtn.focus(); }, 50);
  }

  function closePanel() {
    if (!panel.classList.contains('is-open')) return;
    panel.classList.remove('is-open');
    panel.removeAttribute('role');
    panel.removeAttribute('aria-modal');
    openBtn.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('has-menu-open');
    openBtn.focus();
  }

  openBtn.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanel);
  applyBtn.addEventListener('click', closePanel);

  panel.addEventListener('keydown', function (e) {
    if (!panel.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closePanel(); return; }
    if (e.key !== 'Tab') return;
    var f = focusables().filter(function (n) { return n.tagName !== 'INPUT' || n.closest('details').open; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  mobileMq.addEventListener('change', function (e) { if (!e.matches) closePanel(); });


  /* ------------------------------------------------------------------------
     Avvio
     ------------------------------------------------------------------------ */

  readUrl();
  render(false);
})();
