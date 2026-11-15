// Home page: drag the section carousel to spin it. A flick speeds the ring up;
// after release it coasts and eases back to the slow default rotation.
(() => {
  const cards = document.querySelector('.cards');
  const ring = cards?.querySelector('.cards__ring');
  if (!cards || !ring) return;

  const BASE_SPEED = -360 / 40;   // deg/s: one slow turn every 40s, as before
  const DEG_PER_PX = 0.3;
  const MAX_SPEED = 720;          // deg/s
  const FRICTION = 1.5;           // 1/s: how quickly the spin settles to BASE_SPEED
  const DRAG_THRESHOLD = 6;       // px before movement counts as a drag
  const FACETS = 8;               // vertical strips each card is bent into

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let angle = 0;
  let velocity = BASE_SPEED;
  let lastFrame = 0;
  let pointer = null;
  let startX = 0;
  let lastX = 0;
  let lastT = 0;
  let lastMove = 0;
  let moved = false;
  let suppressUntil = 0;
  let lastSync = 0;

  const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;
  const render = () => { ring.style.transform = `rotateY(${angle}deg)`; };

  // A card is authored once, holding a single image/video. Bending it round the
  // cylinder means repeating that content into narrow facets, each of which shows one
  // vertical strip of it: the <a> collapses to an anchor on the axis and every facet
  // is placed on the arc (see .card__facet in style.css).
  function curveCards() {
    for (const card of ring.querySelectorAll('.card')) {
      const content = card.firstElementChild;
      if (!content || content.classList.contains('card__facet')) continue;

      card.classList.add('card--curved');
      card.style.setProperty('--slices', FACETS);

      for (let j = 0; j < FACETS; j += 1) {
        const facet = document.createElement('div');
        facet.className = 'card__facet';
        facet.style.setProperty('--j', j);

        const stage = document.createElement('div');
        stage.className = 'card__stage';
        stage.append(content.cloneNode(true));

        facet.append(stage);
        card.append(facet);
      }

      content.remove();
    }

    for (const video of ring.querySelectorAll('video')) {
      const started = video.play();
      if (started) started.catch(() => {});
    }
  }

  // Every facet carries its own copy of the video, so nudge the copies back onto the
  // first one's clock if they have drifted apart.
  function syncVideos(now) {
    if (now - lastSync < 1000) return;
    lastSync = now;

    const videos = ring.querySelectorAll('video');
    if (videos.length < 2) return;

    const master = videos[0];
    if (master.paused || master.readyState < 2) return;

    for (let i = 1; i < videos.length; i += 1) {
      const video = videos[i];
      if (video.paused) {
        const started = video.play();
        if (started) started.catch(() => {});
      } else if (Math.abs(video.currentTime - master.currentTime) > 0.15) {
        video.currentTime = master.currentTime;
      }
    }
  }

  function keyboardFocus() {
    const el = document.activeElement;
    if (!el || el === document.body || !cards.contains(el)) return false;
    try { return el.matches(':focus-visible'); } catch { return false; }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastFrame) / 1000, 0.05);
    lastFrame = now;
    syncVideos(now);
    if (pointer !== null || reduced.matches || keyboardFocus()) return;
    velocity += (BASE_SPEED - velocity) * (1 - Math.exp(-FRICTION * dt));
    angle = wrap(angle + velocity * dt);
    render();
  }

  function onPointerMove(e) {
    if (e.pointerId !== pointer) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    lastX = e.clientX;

    if (!moved) {
      if (Math.abs(e.clientX - startX) < DRAG_THRESHOLD) { lastT = now; return; }
      moved = true;
      cards.classList.add('is-dragging');
    }

    const dt = Math.max((now - lastT) / 1000, 0.008);
    lastT = lastMove = now;
    angle = wrap(angle + dx * DEG_PER_PX);
    const instant = (dx * DEG_PER_PX) / dt;
    velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, velocity * 0.6 + instant * 0.4));
    render();
  }

  function onPointerEnd(e) {
    if (e.pointerId !== pointer) return;
    pointer = null;
    cards.classList.remove('is-dragging');
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerEnd);
    window.removeEventListener('pointercancel', onPointerEnd);
    if (moved) suppressUntil = performance.now() + 500;
    if (reduced.matches || performance.now() - lastMove > 120) {
      velocity = reduced.matches ? 0 : BASE_SPEED;
    }
  }

  cards.addEventListener('pointerdown', (e) => {
    if (pointer !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
    pointer = e.pointerId;
    startX = lastX = e.clientX;
    lastT = lastMove = performance.now();
    moved = false;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
  });

  // A drag that ends over a card must not follow the link.
  cards.addEventListener('click', (e) => {
    if (performance.now() < suppressUntil) {
      e.preventDefault();
      e.stopPropagation();
      suppressUntil = 0;
    }
  }, true);

  cards.addEventListener('dragstart', (e) => e.preventDefault());

  reduced.addEventListener('change', () => {
    velocity = reduced.matches ? 0 : BASE_SPEED;
  });

  curveCards();
  cards.classList.add('cards--ready');
  render();
  lastFrame = performance.now();
  requestAnimationFrame(frame);
})();
