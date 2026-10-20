/* ==========================================================================
   Newsletter — controllo del modulo accessibile
   - Errori sotto ogni campo, collegati con aria-describedby + aria-invalid
   - All'invio con errori: il focus va al primo campo da correggere
   - Esito annunciato dalla riga di stato (role="status")
   Messaggi: gli stessi del prototipo (SITO 1).
   ========================================================================== */

(function () {
  'use strict';

  var form = document.getElementById('nlForm');
  if (!form) return;

  var email = form.querySelector('#nlEmail');
  var field = form.querySelector('.pill-field');
  var topics = Array.prototype.slice.call(form.querySelectorAll('input[name="topics"]'));
  var consent = form.querySelector('#nlConsent');
  var status = form.querySelector('#nlStatus');

  var err = {
    email: form.querySelector('#nlEmailErr'),
    topics: form.querySelector('#nlTopicErr'),
    consent: form.querySelector('#nlConsentErr')
  };

  function setError(key, input, msg) {
    err[key].textContent = msg || '';
    if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function checkEmail() {
    var v = email.value.trim();
    var msg = '';
    if (!v) msg = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Please enter a valid email address, e.g. name@company.com.';
    setError('email', email, msg);
    field.classList.toggle('is-invalid', !!msg);
    return !msg;
  }

  function checkTopics() {
    var ok = topics.some(function (t) { return t.checked; });
    err.topics.textContent = ok ? '' : 'Please choose at least one topic.';
    // Ogni checkbox segnato come non valido, così lo screen reader lo annuncia
    topics.forEach(function (t) { t.setAttribute('aria-invalid', ok ? 'false' : 'true'); });
    return ok;
  }

  function checkConsent() {
    var ok = consent.checked;
    setError('consent', consent, ok ? '' : 'Please accept the Privacy Policy to subscribe.');
    return ok;
  }

  // Dopo il primo errore, i messaggi si aggiornano mentre si corregge
  email.addEventListener('blur', function () { if (email.value) checkEmail(); });
  email.addEventListener('input', function () { if (email.getAttribute('aria-invalid') === 'true') checkEmail(); });
  topics.forEach(function (t) { t.addEventListener('change', function () { if (err.topics.textContent) checkTopics(); }); });
  consent.addEventListener('change', function () { if (err.consent.textContent) checkConsent(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.textContent = '';

    var okEmail = checkEmail();
    var okTopics = checkTopics();
    var okConsent = checkConsent();

    if (!okEmail) { email.focus(); return; }
    if (!okTopics) { topics[0].focus(); return; }
    if (!okConsent) { consent.focus(); return; }

    // Qui andrà collegato il servizio di newsletter vero
    status.textContent = 'Thank you for subscribing!';
    form.reset();
    field.classList.remove('is-invalid');
  });
})();
