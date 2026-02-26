// js/reservation.js
// Phase 2 — Formulaire de reservation natif
// Loaded with <script src="/js/reservation.js" defer>

(function () {
  'use strict';

  // --- Constants (must match functions/api/reservations.ts) ---
  const FRENCH_PHONE_RE = /^(?:(?:\+33|0033)[67]|0[67])\d{8}$/;
  const FIELDS = ['first_name', 'last_name', 'phone', 'email', 'date', 'time_slot', 'party_size'];
  const API_URL = '/api/reservations';

  // --- State ---
  const touched = {};

  // --- DOM references ---
  const form        = document.getElementById('reservation-form');
  const successDiv  = document.getElementById('reservation-success');
  const successDetails = document.getElementById('success-details');
  const newResaBtn  = document.getElementById('new-reservation-btn');
  const submitBtn   = document.getElementById('submit-btn');
  const dateInput   = document.getElementById('date');
  const globalError = document.getElementById('form-error-global');
  const reservationInfo = document.getElementById('reservation-info');

  if (!form) return; // Guard: form not present on this page

  // --- Init ---
  setDateMin();
  attachBlurListeners();
  attachDateChangeListener();
  form.addEventListener('submit', handleSubmit);
  if (newResaBtn) newResaBtn.addEventListener('click', handleNewReservation);

  // --- Helpers ---

  function setDateMin() {
    if (dateInput) {
      dateInput.min = new Date().toISOString().slice(0, 10);
    }
  }

  function isMonday(dateString) {
    // Use T12:00:00Z to match server-side logic (UTC-safe)
    return new Date(dateString + 'T12:00:00Z').getUTCDay() === 1;
  }

  function showFieldError(name, message) {
    var input = document.getElementById(name);
    var errorEl = document.getElementById(name + '-error');
    if (input) input.classList.add('field-invalid');
    if (errorEl) errorEl.textContent = message;
  }

  function clearFieldError(name) {
    var input = document.getElementById(name);
    var errorEl = document.getElementById(name + '-error');
    if (input) input.classList.remove('field-invalid');
    if (errorEl) errorEl.textContent = '';
  }

  function showGlobalError(message) {
    if (globalError) {
      globalError.textContent = message;
      globalError.hidden = false;
    }
  }

  function clearGlobalError() {
    if (globalError) {
      globalError.textContent = '';
      globalError.hidden = true;
    }
  }

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.innerHTML = isSubmitting
      ? '<i class="fas fa-spinner fa-spin"></i> Envoi en cours\u2026'
      : '<i class="fas fa-calendar-check"></i> Confirmer ma r\u00e9servation';
  }

  // --- Validation ---

  function validateField(name, value) {
    switch (name) {
      case 'first_name':
      case 'last_name':
        return value.trim().length > 0 ? null : 'Ce champ est requis.';

      case 'phone': {
        if (!value.trim()) return 'Ce champ est requis.';
        // Normalize spaces before testing: "06 12 34 56 78" => "0612345678"
        var normalized = value.replace(/\s/g, '');
        return FRENCH_PHONE_RE.test(normalized)
          ? null
          : 'Format invalide. Ex\u00a0: 06 12 34 56 78 ou +33 6 12 34 56 78';
      }

      case 'email':
        if (!value.trim()) return 'Ce champ est requis.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? null
          : 'Adresse email invalide.';

      case 'date':
        if (!value) return 'Veuillez choisir une date.';
        if (isMonday(value)) return 'Le restaurant est ferm\u00e9 le lundi. Choisissez un autre jour.';
        return null;

      case 'time_slot':
        return value ? null : 'Veuillez choisir un cr\u00e9neau.';

      case 'party_size':
        return value ? null : 'Veuillez indiquer le nombre de convives.';

      default:
        return null;
    }
  }

  // --- Blur listeners ---

  function attachBlurListeners() {
    FIELDS.forEach(function (name) {
      var el = document.getElementById(name);
      if (!el) return;

      // Mark touched and validate on blur
      el.addEventListener('blur', function () {
        touched[name] = true;
        var error = validateField(name, el.value);
        if (error) {
          showFieldError(name, error);
        } else {
          clearFieldError(name);
        }
      });

      // Re-validate on change (only if already touched) — useful for selects and date
      el.addEventListener('change', function () {
        if (touched[name]) {
          var changeError = validateField(name, el.value);
          if (changeError) {
            showFieldError(name, changeError);
          } else {
            clearFieldError(name);
          }
        }
      });
    });
  }

  // --- Monday blocking on date change ---

  function attachDateChangeListener() {
    if (!dateInput) return;
    dateInput.addEventListener('change', function () {
      if (dateInput.value && isMonday(dateInput.value)) {
        showFieldError('date', 'Le restaurant est ferm\u00e9 le lundi. Choisissez un autre jour.');
        dateInput.value = ''; // Clear invalid Monday selection
        touched['date'] = true;
      }
    });
  }

  // --- Submit handler ---

  function handleSubmit(e) {
    e.preventDefault();
    clearGlobalError();

    // Mark all fields as touched and validate
    var valid = true;
    FIELDS.forEach(function (name) {
      touched[name] = true;
      var el = document.getElementById(name);
      if (!el) return;
      var error = validateField(name, el.value);
      if (error) {
        showFieldError(name, error);
        valid = false;
      } else {
        clearFieldError(name);
      }
    });

    if (!valid) return;

    // Check party_size > 8 — prompt to call instead
    var partySizeVal = parseInt(document.getElementById('party_size').value, 10);
    if (partySizeVal === 9) {
      showGlobalError(
        'Pour les groupes de plus de 8 personnes, veuillez nous appeler au 06\u00a051\u00a084\u00a015\u00a061.'
      );
      return;
    }

    setSubmitting(true);

    // Build payload (normalize phone, parseInt party_size)
    var phoneRaw = document.getElementById('phone').value;
    var phoneNormalized = phoneRaw.replace(/\s/g, '');

    var payload = {
      first_name: document.getElementById('first_name').value.trim(),
      last_name:  document.getElementById('last_name').value.trim(),
      phone:      phoneNormalized,
      email:      document.getElementById('email').value.trim(),
      date:       document.getElementById('date').value,
      time_slot:  document.getElementById('time_slot').value,
      party_size: parseInt(document.getElementById('party_size').value, 10),
      honeypot:   document.getElementById('website') ? document.getElementById('website').value : '',
    };

    // POST to /api/reservations
    (async function () {
      try {
        var res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showSuccess(payload);
        } else {
          var errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
          try {
            var data = await res.json();
            if (data.error) errorMessage = data.error;
          } catch (jsonErr) { /* ignore JSON parse errors */ }
          showGlobalError(errorMessage);
        }
      } catch (networkErr) {
        showGlobalError(
          'Impossible de contacter le serveur. Vérifiez votre connexion et réessayez.'
        );
      } finally {
        setSubmitting(false);
      }
    }());
  }

  // --- Success state ---

  function showSuccess(payload) {
    var dateFormatted = new Date(payload.date + 'T12:00:00Z')
      .toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

    if (successDetails) {
      successDetails.textContent =
        payload.first_name + ', votre table pour ' + payload.party_size + ' personne(s) ' +
        'est r\u00e9serv\u00e9e le ' + dateFormatted + ' \u00e0 ' + payload.time_slot + '.';
    }

    form.style.display = 'none';
    if (reservationInfo) reservationInfo.style.display = 'none';
    if (successDiv) successDiv.hidden = false;
  }

  // Expose showSuccess so Plan 02-02 can call it after a successful fetch response
  window._reservationShowSuccess = showSuccess;

  // --- New reservation button ---

  function handleNewReservation() {
    form.reset();

    // Clear touched state
    Object.keys(touched).forEach(function (k) {
      delete touched[k];
    });

    // Clear all field errors
    document.querySelectorAll('.field-error').forEach(function (el) {
      el.textContent = '';
    });

    // Clear field-invalid classes
    document.querySelectorAll('.field-invalid').forEach(function (el) {
      el.classList.remove('field-invalid');
    });

    clearGlobalError();

    if (successDiv) successDiv.hidden = true;
    form.style.display = '';
    if (reservationInfo) reservationInfo.style.display = '';

    // Re-set date min after reset (form.reset() may clear the min attribute in some browsers)
    setDateMin();
  }

})();
