/* Cataleya: the page's own motion on top of site.js (theme, header, reveals) and the film engine. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  requestAnimationFrame(() => document.body.classList.add('ready'));

  // the sentence inks in word by word as it crosses the screen
  const ink = $('[data-ink]');
  if (ink) {
    ink.innerHTML = ink.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    const ws = $$('.w', ink);
    const run = () => {
      const r = ink.getBoundingClientRect(), vh = innerHeight;
      const p = reduce ? 1 : Math.min(1, Math.max(0, (vh * .9 - r.top) / (vh * .55)));
      const n = Math.round(p * ws.length);
      ws.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    addEventListener('scroll', run, { passive: true }); run();
  }

  // prices count up once, the first time they are seen
  const counts = $$('[data-count]');
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = +el.dataset.count;
    if (reduce) { el.textContent = '$' + to; return; }
    const t0 = performance.now(), dur = 1100;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = '$' + v; if (k < 1) requestAnimationFrame(tick); };
    el.textContent = '$0'; requestAnimationFrame(tick);
  }), { threshold: .6 });
  counts.forEach((c) => io.observe(c));

  // stagger the build-in inside each grid
  $$('.menu, .rooms, .pillars').forEach((g) => $$('.reveal', g).forEach((el, i) => { el.style.transitionDelay = (i % 3) * 80 + 'ms'; }));

  // tilt toward the pointer, on every card
  if (hover && !reduce) $$('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  // the band at the end draws itself
  const band = $('.end .band');
  if (band) new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { band.classList.add('in'); o.disconnect(); } }), { threshold: .5 }).observe(band);

  // the work: her photos with hover and a lightbox
  const P = window.PIECES || [], grid = $('#workGrid');
  if (grid) {
    P.slice(0, 4).forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'reveal'; b.setAttribute('aria-label', `${p.title}, open`);
      b.style.transitionDelay = i * 80 + 'ms';
      b.innerHTML = `<img src="${p.src}" alt="${p.title}" width="${p.w}" height="${p.h}" loading="lazy" decoding="async"><span class="cap">${p.title}</span>`;
      b.addEventListener('click', () => openLb(i));
      grid.appendChild(b);
    });
    const io2 = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io2.unobserve(e.target); } }), { threshold: .1 });
    $$('button', grid).forEach((b) => io2.observe(b));
  }
  const lb = $('#lb'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let at = 0, back = null;
  const show = (i) => { at = (i + P.length) % P.length; lbImg.src = P[at].src; lbImg.alt = P[at].title; lbCap.textContent = P[at].title; };
  function openLb(i) { back = document.activeElement; show(i); lb.hidden = false; requestAnimationFrame(() => lb.classList.add('on')); $('.lb-x', lb).focus(); }
  function closeLb() { lb.classList.remove('on'); setTimeout(() => { lb.hidden = true; back && back.focus(); }, 300); }
  if (lb) {
    $('.lb-x', lb).onclick = closeLb; $('.lb-p', lb).onclick = () => show(at - 1); $('.lb-n', lb).onclick = () => show(at + 1);
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
    addEventListener('keydown', (e) => { if (lb.hidden) return; if (e.key === 'Escape') closeLb(); if (e.key === 'ArrowLeft') show(at - 1); if (e.key === 'ArrowRight') show(at + 1); });
  }

  // preview: the booking link isn't wired yet (her Jane link lists a Brampton address; fixed before launch)
  $$('[data-preview-link]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); a.textContent = 'Booking link goes live at launch'; }));
})();
