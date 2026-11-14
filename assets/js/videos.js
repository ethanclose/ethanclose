// Videos page: reads assets/videos/oaklandojos.txt ("orientation,title,url" per line).
(() => {
  const app = document.getElementById('app');

  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function youtubeId(raw) {
    try {
      const u = new URL(raw);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/);
      return m ? m[1] : u.searchParams.get('v');
    } catch {
      return null;
    }
  }

  function parse(text) {
    return text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((line) => {
      const first = line.indexOf(',');
      const last = line.lastIndexOf(',');
      if (first < 0 || last === first) return null;
      const orientation = line.slice(0, first).trim().toLowerCase() === 'portrait' ? 'portrait' : 'landscape';
      const title = line.slice(first + 1, last).trim();
      const id = youtubeId(line.slice(last + 1).trim());
      return id ? { orientation, title, id } : null;
    }).filter(Boolean);
  }

  function render(videos) {
    const still = videos.length < 2 ? ' vcarousel--still' : '';
    app.innerHTML = `
      <section class="vcarousel${still}" style="--n: ${videos.length}" aria-label="Videos">
        <div class="vcarousel__ring">
          ${videos.map((v, i) => `
          <button class="video video--${v.orientation}" type="button" style="--i: ${i}" data-index="${i}" aria-label="Play ${esc(v.title)}">
            <img src="https://i.ytimg.com/vi/${v.id}/${v.orientation === 'portrait' ? 'oar2' : 'maxresdefault'}.jpg" alt="" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">
            <span class="video__play" aria-hidden="true"></span>
            <span class="video__title">${esc(v.title)}</span>
          </button>`).join('')}
        </div>
      </section>`;

    app.querySelectorAll('.video img').forEach((img, i) => {
      img.addEventListener('error', () => {
        const fallback = `https://i.ytimg.com/vi/${videos[i].id}/hqdefault.jpg`;
        if (img.src !== fallback) img.src = fallback;
      });
    });

    app.querySelectorAll('.video').forEach((btn) => {
      btn.addEventListener('click', () => openPlayer(videos[Number(btn.dataset.index)], btn));
    });
  }

  function openPlayer(video, trigger) {
    const el = document.createElement('div');
    el.className = `player player--${video.orientation}`;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', video.title);
    const origin = location.protocol.startsWith('http') ? `&origin=${encodeURIComponent(location.origin)}` : '';
    el.innerHTML = `
      <button class="icon-btn player__close" type="button" aria-label="Close video">&times;</button>
      <a class="player__yt" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener">Watch on YouTube &nearr;</a>
      <iframe class="player__frame" title="${esc(video.title)}"
        src="https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&playsinline=1${origin}"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"></iframe>`;
    document.body.append(el);
    document.body.classList.add('overlay-open');

    // On phones, landscape videos go landscape: lock orientation where the browser allows it
    // (Android), otherwise rotate the player with CSS when the phone is held upright (iOS).
    const wantsLandscape = matchMedia('(pointer: coarse)').matches && video.orientation === 'landscape';
    const portraitQuery = matchMedia('(orientation: portrait)');
    let locked = false;
    let enteredFullscreen = false;

    function updateRotation() {
      el.classList.toggle('player--rotated', wantsLandscape && !locked && portraitQuery.matches);
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      portraitQuery.removeEventListener('change', updateRotation);
      if (locked) screen.orientation.unlock();
      if (document.fullscreenElement === el) document.exitFullscreen().catch(() => {});
      el.remove();
      document.body.classList.remove('overlay-open');
      trigger.focus({ preventScroll: true });
    }

    function onKey(e) { if (e.key === 'Escape') close(); }

    function onFullscreenChange() {
      if (document.fullscreenElement === el) enteredFullscreen = true;
      else if (enteredFullscreen) close();
    }

    el.querySelector('.player__close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    portraitQuery.addEventListener('change', updateRotation);
    el.querySelector('.player__close').focus({ preventScroll: true });

    const fullscreen = el.requestFullscreen ? el.requestFullscreen().catch(() => {}) : Promise.resolve();
    fullscreen
      .then(() => (wantsLandscape && screen.orientation?.lock
        ? screen.orientation.lock('landscape').then(() => { locked = true; }, () => {})
        : null))
      .then(updateRotation);
  }

  (async () => {
    try {
      const res = await fetch('assets/videos/oaklandojos.txt', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`videos ${res.status}`);
      const videos = parse(await res.text());
      if (videos.length) render(videos);
      else app.innerHTML = '<p class="status">No videos yet.</p>';
    } catch (err) {
      console.error(err);
      app.innerHTML = '<p class="status">Could not load videos.</p>';
    }
  })();
})();
