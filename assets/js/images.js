// Images page: album list, album view (?album=<title>) and zoomable lightbox.
(() => {
  const app = document.getElementById('app');
  const MAX_ZOOM = 6;

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const src = (path) => encodeURI(path).replace(/#/g, '%23').replace(/\?/g, '%3F');

  async function loadAlbums() {
    const res = await fetch('assets/images/manifest.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`manifest ${res.status}`);
    return (await res.json()).albums || [];
  }

  function renderAlbums(albums) {
    document.title = 'Images — Ethan Close';
    app.innerHTML = `<div class="albums">${albums.map((a) => `
      <a class="album" href="images.html?album=${encodeURIComponent(a.title)}">
        <div class="album__head">
          <h2 class="album__title">${esc(a.title)}</h2>
          <span class="album__count">${a.images.length} ${a.images.length === 1 ? 'photo' : 'photos'}</span>
        </div>
        <div class="album__cover"><img src="${src(a.images[0])}" alt="${esc(a.title)}" decoding="async"></div>
      </a>`).join('')}</div>`;
  }

  function renderAlbum(album) {
    document.title = `${album.title} — Ethan Close`;
    app.innerHTML = `
      <div class="album-view">
        <a class="back" href="images.html">&larr; All albums</a>
        <h1 class="page-title">${esc(album.title)}</h1>
        ${album.images.map((p, i) => `
          <button class="photo" type="button" data-index="${i}" aria-label="Open photo ${i + 1} of ${album.images.length}">
            <img src="${src(p)}" alt="${esc(album.title)} — photo ${i + 1}" loading="${i < 2 ? 'eager' : 'lazy'}" decoding="async">
          </button>`).join('')}
      </div>`;

    const lightbox = createLightbox(album.images.map(src), album.title);
    app.querySelectorAll('.photo').forEach((btn) => {
      btn.addEventListener('click', () => lightbox.open(Number(btn.dataset.index), btn));
    });
  }

  function createLightbox(urls, title) {
    const el = document.createElement('div');
    el.className = 'lightbox';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', `${title} photo viewer`);
    el.innerHTML = `
      <div class="lightbox__stage"><img class="lightbox__img" alt="" draggable="false"></div>
      <div class="lightbox__bar">
        <span class="lightbox__count"></span>
        <div class="lightbox__tools">
          <button class="icon-btn" type="button" data-act="out" aria-label="Zoom out">&minus;</button>
          <button class="icon-btn" type="button" data-act="in" aria-label="Zoom in">+</button>
          <button class="icon-btn" type="button" data-act="close" aria-label="Close">&times;</button>
        </div>
      </div>
      <button class="icon-btn lightbox__nav lightbox__nav--prev" type="button" data-act="prev" aria-label="Previous photo">&lsaquo;</button>
      <button class="icon-btn lightbox__nav lightbox__nav--next" type="button" data-act="next" aria-label="Next photo">&rsaquo;</button>`;
    document.body.append(el);

    const stage = el.querySelector('.lightbox__stage');
    const img = el.querySelector('.lightbox__img');
    const count = el.querySelector('.lightbox__count');
    const navBtns = el.querySelectorAll('.lightbox__nav');
    const closeBtn = el.querySelector('[data-act="close"]');

    let index = 0;
    let opener = null;
    let s = 1, x = 0, y = 0;
    const pointers = new Map();
    let moved = false;
    let downOnBackdrop = false;

    const isOpen = () => !el.hidden;
    const clampNum = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

    function apply() {
      // Keep the zoomed image from being panned fully off-screen.
      const r = stage.getBoundingClientRect();
      const mx = Math.max(0, (img.offsetWidth * s - r.width) / 2);
      const my = Math.max(0, (img.offsetHeight * s - r.height) / 2);
      x = clampNum(x, -mx, mx);
      y = clampNum(y, -my, my);
      img.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      el.classList.toggle('is-zoomed', s > 1.001);
    }

    function zoomAt(next, cx, cy) {
      next = clampNum(next, 1, MAX_ZOOM);
      const r = stage.getBoundingClientRect();
      const px = cx - (r.left + r.width / 2);
      const py = cy - (r.top + r.height / 2);
      x = px - (px - x) * (next / s);
      y = py - (py - y) * (next / s);
      s = next;
      apply();
    }

    function zoomCenter(factor) {
      const r = stage.getBoundingClientRect();
      zoomAt(s * factor, r.left + r.width / 2, r.top + r.height / 2);
    }

    function show(i) {
      index = (i + urls.length) % urls.length;
      s = 1; x = 0; y = 0;
      img.style.transform = '';
      el.classList.remove('is-zoomed');
      img.src = urls[index];
      img.alt = `${title} — photo ${index + 1}`;
      count.textContent = `${index + 1} / ${urls.length}`;
      navBtns.forEach((b) => { b.hidden = urls.length < 2; });
    }

    function open(i, trigger) {
      opener = trigger;
      show(i);
      el.hidden = false;
      document.body.classList.add('overlay-open');
      closeBtn.focus({ preventScroll: true });
    }

    function close() {
      el.hidden = true;
      pointers.clear();
      document.body.classList.remove('overlay-open', 'is-dragging');
      el.classList.remove('is-dragging');
      img.removeAttribute('src');
      if (opener) opener.focus({ preventScroll: true });
    }

    el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'close') close();
      else if (act === 'prev') show(index - 1);
      else if (act === 'next') show(index + 1);
      else if (act === 'in') zoomCenter(1.6);
      else if (act === 'out') zoomCenter(1 / 1.6);
      else if (downOnBackdrop && !moved && s === 1) close();
    });

    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const k = e.ctrlKey ? 0.01 : 0.0018; // ctrlKey = trackpad pinch
      zoomAt(s * Math.exp(-e.deltaY * k), e.clientX, e.clientY);
    }, { passive: false });

    stage.addEventListener('dblclick', (e) => {
      if (s > 1.001) zoomAt(1, e.clientX, e.clientY);
      else zoomAt(2.5, e.clientX, e.clientY);
    });

    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      stage.setPointerCapture(e.pointerId);
      if (pointers.size === 0) { moved = false; downOnBackdrop = e.target === stage; }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (s > 1.001) el.classList.add('is-dragging');
    });

    stage.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const nx = e.clientX, ny = e.clientY;

      if (pointers.size === 2) {
        const other = [...pointers].find(([id]) => id !== e.pointerId)[1];
        const prevDist = Math.hypot(p.x - other.x, p.y - other.y);
        const dist = Math.hypot(nx - other.x, ny - other.y);
        const prevMid = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
        const mid = { x: (nx + other.x) / 2, y: (ny + other.y) / 2 };
        x += mid.x - prevMid.x;
        y += mid.y - prevMid.y;
        if (prevDist > 0) zoomAt(s * (dist / prevDist), mid.x, mid.y);
        else apply();
        moved = true;
      } else if (pointers.size === 1 && s > 1.001) {
        x += nx - p.x;
        y += ny - p.y;
        apply();
        if (Math.abs(nx - p.x) + Math.abs(ny - p.y) > 0) moved = true;
      }
      p.x = nx;
      p.y = ny;
    });

    const release = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) el.classList.remove('is-dragging');
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(index - 1);
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === '+' || e.key === '=') zoomCenter(1.6);
      else if (e.key === '-') zoomCenter(1 / 1.6);
      else if (e.key === '0') { s = 1; x = 0; y = 0; apply(); }
    });

    window.addEventListener('resize', () => { if (isOpen()) apply(); });

    return { open };
  }

  (async () => {
    try {
      const albums = await loadAlbums();
      const wanted = new URLSearchParams(location.search).get('album');
      const album = wanted && albums.find((a) => a.title === wanted);
      if (album) renderAlbum(album);
      else if (albums.length) renderAlbums(albums);
      else app.innerHTML = '<p class="status">No albums yet.</p>';
    } catch (err) {
      console.error(err);
      app.innerHTML = '<p class="status">Could not load images.</p>';
    }
  })();
})();
