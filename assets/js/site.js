// Theme: the inline <head> script applies the saved choice or the device preference
// before paint. This keeps the toggle and the live system preference in sync.
(() => {
  const root = document.documentElement;
  const toggle = document.querySelector('.theme-toggle');
  const query = matchMedia('(prefers-color-scheme: dark)');
  const KEY = 'ec:theme';

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
    toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
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

// Shared behaviour: newsletter signup form (inline + popup), submitted to Formspree.
(() => {
  const SIGNUP_ENDPOINT = 'https://formspree.io/f/xbgorovg';
  const POPUP_DELAY_MS = 5000;
  const SEEN_KEY = 'ec:signup-seen';
  const AUTO_OPEN = false;   // auto-popup paused for now; the sign up link still works

  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };

  function formHtml() {
    return `
      <form class="signup" action="${SIGNUP_ENDPOINT}" method="post" novalidate>
        <div class="signup__row">
          <input type="email" name="email" aria-label="Email address" placeholder="Email address" autocomplete="email" required>
          <button class="btn" type="submit">Subscribe</button>
        </div>
        <input type="hidden" name="_subject" value="New newsletter signup">
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
        note.textContent = 'Please enter a valid email address.';
        email.focus();
        return;
      }
      button.disabled = true;
      note.textContent = 'Subscribing…';
      try {
        const res = await fetch(SIGNUP_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
        if (res.ok) {
          note.textContent = 'Thanks — you’re on the list.';
          email.value = '';
          store.set(SEEN_KEY, 'subscribed');
          if (onSuccess) setTimeout(onSuccess, 1500);
        } else {
          const data = await res.json().catch(() => ({}));
          note.textContent = data.errors?.map((err) => err.message).join(' ') || 'Something went wrong. Please try again.';
        }
      } catch {
        note.textContent = 'Network error. Please try again.';
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
      <button class="icon-btn modal__close" type="button" aria-label="Close" data-close>&times;</button>
      <h2 id="signup-title">Stay in the loop</h2>
      <p>New photos and videos, now and then. No spam.</p>
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
