// Theme: the inline <head> script applies the saved choice or the device preference
// before paint. This keeps the toggle and the live system preference in sync.
(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const query = matchMedia('(prefers-color-scheme: dark)');
  const KEY = 'ec:theme';
  const { t } = window.EC_I18N || { t: (key) => key };

  const saved = () => {
    try { return localStorage.getItem(KEY); } catch { return null; }
  };

  function apply(theme, persist) {
    root.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem(KEY, theme); } catch { /* storage unavailable */ }
    }
    if (!toggle) return;

    const dark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(dark));
    toggle.setAttribute('aria-label', t(dark ? 'theme.light' : 'theme.dark'));
    toggle.title = t(dark ? 'theme.light' : 'theme.dark');
  }

  apply(root.dataset.theme === 'dark' ? 'dark' : 'light', false);

  if (toggle) {
    toggle.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark', true);
    });
  }

  // Follow the device until the visitor makes a choice of their own.
  query.addEventListener('change', () => {
    if (!saved()) apply(query.matches ? 'dark' : 'light', false);
  });
})();

// Language switch: carry the current album query and #signup across languages.
(() => {
  for (const link of document.querySelectorAll('[data-lang-link]')) {
    const url = new URL(link.getAttribute('href'), location.href);
    url.search = location.search;
    url.hash = location.hash;
    link.href = url.href;
  }
})();

// Shared behaviour: newsletter signup form (inline + popup), submitted to Formspree.
(() => {
  const SIGNUP_ENDPOINT = 'https://formspree.io/f/xbgorovg';
  const POPUP_DELAY_MS = 5000;
  const SEEN_KEY = 'ec:signup-seen';
  const AUTO_OPEN = false;   // auto-popup paused for now; the sign up link still works
  const { t } = window.EC_I18N || { t: (key) => key };

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  function formHtml() {
    return `
      <form class="signup" action="${SIGNUP_ENDPOINT}" method="post" novalidate>
        <div class="signup__row">
          <input type="email" name="email" aria-label="${t('signup.email')}" placeholder="${t('signup.email')}" autocomplete="email" required>
          <button class="btn" type="submit">${t('signup.subscribe')}</button>
        </div>
        <input type="hidden" name="_subject" value="${t('signup.subject')}">
        <div class="signup__trap" aria-hidden="true">
          <input type="text" name="_gotcha" tabindex="-1" autocomplete="off" value="">
        </div>
        <p class="signup__note" role="status"></p>
      </form>`;
  }

  function wireForm(form, onSuccess) {
    const note = form.querySelector('.signup__note');
    const email = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!email.checkValidity() || !email.value.trim()) {
        note.textContent = t('signup.invalid');
        email.focus();
        return;
      }
      button.disabled = true;
      note.textContent = t('signup.subscribing');
      try {
        const res = await fetch(SIGNUP_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (res.ok) {
          note.textContent = t('signup.success');
          email.value = '';
          store.set(SEEN_KEY, 'subscribed');
          if (onSuccess) setTimeout(onSuccess, 1500);
        } else {
          const data = await res.json().catch(() => ({}));
          note.textContent = data.errors?.map((err) => err.message).join(' ') || t('signup.error');
        }
      } catch {
        note.textContent = t('signup.network');
      } finally {
        button.disabled = false;
      }
    });
  }

  // Popup.
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal__backdrop" data-close></div>
    <div class="modal__panel" role="dialog" aria-labelledby="signup-title">
      <button class="icon-btn modal__close" type="button" aria-label="${t('signup.close')}" data-close>&times;</button>
      <h2 id="signup-title">${t('signup.title')}</h2>
      <p>${t('signup.body')}</p>
      <div data-popup-form></div>
    </div>`;
  document.body.append(modal);
  modal.querySelector('[data-popup-form]').innerHTML = formHtml();

  const triggers = document.querySelectorAll('[data-signup-trigger]');
  let lastFocus = null;

  const isOpen = () => !modal.hidden;

  function open() {
    if (isOpen()) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    store.set(SEEN_KEY, store.get(SEEN_KEY) || 'seen');
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'true'));
    modal.querySelector('input[type="email"]').focus({ preventScroll: true });
  }

  function close() {
    if (!isOpen()) return;
    modal.hidden = true;
    triggers.forEach((t) => t.setAttribute('aria-expanded', 'false'));
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  wireForm(modal.querySelector('form'), close);

  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });

  triggers.forEach((t) => {
    t.setAttribute('aria-expanded', 'false');
    t.addEventListener('click', (e) => {
      e.preventDefault();
      isOpen() ? close() : open();
    });
  });

  // Auto-open once for first-time visitors (not on Contact). Paused for now with
  // AUTO_OPEN; the header "sign up" link still opens the form on demand.
  const onContact = /(^|\/)contact(\.html)?$/.test(location.pathname);
  if (AUTO_OPEN && !store.get(SEEN_KEY) && !onContact) {
    setTimeout(() => {
      if (!store.get(SEEN_KEY) && !document.body.classList.contains('overlay-open')) open();
    }, POPUP_DELAY_MS);
  }
})();

// Formspree injects English status/validation copy; translate the common messages
// on the Spanish pages.
(() => {
  if (!window.EC_I18N || window.EC_I18N.lang !== 'es') return;

  const messages = {
    'Thank you!': 'Gracias.',
    'An unexpected error occurred. Please try again.': 'Ha ocurrido un error inesperado. Inténtalo de nuevo.',
    'There was an error submitting the form.': 'No se pudo enviar el formulario.',
    'Please enter a valid email address.': 'Introduce un correo electrónico válido.',
    'This field is required.': 'Este campo es obligatorio.',
    'Please fill out this field.': 'Completa este campo.',
  };

  function translate(node) {
    const text = node.textContent.trim();
    const match = messages[text];
    if (match) node.textContent = match;
  }

  const targets = document.querySelectorAll('.fs-status, .fs-error');
  targets.forEach(translate);
  if (!targets.length) return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translate(mutation.target);
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) translate(node);
      }
    }
  });

  targets.forEach((node) => observer.observe(node, { childList: true, subtree: true, characterData: true }));
})();
