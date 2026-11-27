(() => {
  const P = window.PIECES || [];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pad = n => String(n).padStart(2, "0");
  requestAnimationFrame(() => document.body.classList.add("ready"));

  // header goes solid after the opening
  const top = document.getElementById("top");
  const onScrollHeader = () => top.classList.toggle("solid", scrollY > 40);
  addEventListener("scroll", onScrollHeader, { passive: true }); onScrollHeader();

  /* ---------- the hall: pieces placed at depth, scroll walks the camera forward ---------- */
  const scene = document.getElementById("scene"), hall = document.getElementById("hall");
  const GAP = innerWidth < 700 ? 1300 : 900;                                  // depth between pieces (px)
  const lanes = [[-1, -.04], [1, .02], [-.15, -.08], [1.05, -.05], [-1.05, .03], [.2, .0], [-.9, -.06]];
  const hallPieces = P.map((p, i) => {
    const el = document.createElement("button");
    el.className = "piece"; el.type = "button";
    el.setAttribute("aria-label", `${p.title}, open`);
    const vw = Math.min(innerWidth, 1400);
    const phone = innerWidth < 700;
    const wide = p.w / p.h > 1.2, w = phone ? innerWidth * (wide ? .78 : .62) : (wide ? .40 : .28) * vw;
    const [lx, ly] = lanes[i % lanes.length];
    el.style.width = w + "px";
    el.style.setProperty("--ar", `${p.w}/${p.h}`);
    el.dataset.x = phone ? lx * innerWidth * .06 : lx * vw * .26; el.dataset.y = ly * innerHeight; el.dataset.z = -i * GAP - 300;
    el.innerHTML = `<div class="frame"><img src="${p.src}" alt="${p.title}" width="${p.w}" height="${p.h}" loading="${i < 2 ? "eager" : "lazy"}" decoding="async"><div class="plaque"><span>${p.title}</span><b>${pad(i + 1)}</b></div></div>`;
    el.addEventListener("click", () => openLb(i));
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 14 + "deg");
      el.style.setProperty("--rx", -((e.clientY - r.top) / r.height - .5) * 10 + "deg");
    });
    el.addEventListener("pointerleave", () => { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
    scene.appendChild(el);
    return el;
  });
  document.getElementById("hallOf").textContent = pad(P.length);
  const hallNo = document.getElementById("hallNo");
  const depth = (P.length - 1) * GAP + 600;
  let target = 0, cur = 0, mx = 0, my = 0, cmx = 0, cmy = 0;
  addEventListener("pointermove", e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });

  function hallProgress() {
    const r = hall.getBoundingClientRect();
    const span = hall.offsetHeight - innerHeight;
    return Math.min(1, Math.max(0, -r.top / span));
  }
  function frame() {
    target = hallProgress() * depth;
    cur += (target - cur) * (reduce ? 1 : .085);     // eased camera
    cmx += (mx - cmx) * .05; cmy += (my - cmy) * .05;
    let nearest = 0, best = 1e9;
    hallPieces.forEach((el, i) => {
      const z = +el.dataset.z + cur;                // distance in front of the camera (negative = ahead)
      const far = innerWidth < 700 ? 1500 : 3600, ramp = innerWidth < 700 ? 700 : 1600;
      const fadeIn = Math.min(1, Math.max(0, (z + far) / ramp));
      const fadeOut = Math.min(1, Math.max(0, (420 - z) / 380));
      el.style.opacity = (fadeIn * fadeOut).toFixed(3);
      el.style.visibility = fadeIn * fadeOut < .01 ? "hidden" : "visible";
      el.style.transform = `translate3d(calc(-50% + ${+el.dataset.x - cmx * 60}px), calc(-50% + ${+el.dataset.y - cmy * 40}px), ${z}px)`;
      if (Math.abs(z + 300) < best) { best = Math.abs(z + 300); nearest = i; }
    });
    hallNo.textContent = pad(nearest + 1);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- the collection: filters, build-in, hover tilt, lightbox ---------- */
  const grid = document.getElementById("grid"), filters = document.getElementById("filters");
  const cats = ["All", ...new Set(P.map(p => p.cat))];
  cats.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.role = "tab"; b.textContent = c; b.setAttribute("aria-selected", i === 0);
    b.addEventListener("click", () => setCat(c));
    filters.appendChild(b);
  });
  const cards = P.map((p, i) => {
    const c = document.createElement("button");
    c.type = "button"; c.className = "card"; c.dataset.cat = p.cat;
    c.setAttribute("aria-label", `${p.title}, open`);
    c.innerHTML = `<img src="${p.src}" alt="${p.title}" width="${p.w}" height="${p.h}" loading="lazy" decoding="async"><span class="cap"><span>${p.title}</span><b>${p.cat}</b></span>`;
    c.addEventListener("click", () => openLb(i));
    grid.appendChild(c);
    return c;
  });
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const idx = [...grid.children].filter(x => !x.classList.contains("out")).indexOf(e.target);
    e.target.style.transitionDelay = (idx % 3) * 90 + "ms";
    e.target.classList.add("in"); io.unobserve(e.target);
  }), { rootMargin: "0px 0px -8% 0px" });
  cards.forEach(c => io.observe(c));
  function setCat(c) {
    [...filters.children].forEach(b => b.setAttribute("aria-selected", b.textContent === c));
    cards.forEach(card => {
      const show = c === "All" || card.dataset.cat === c;
      card.classList.toggle("out", !show);
      if (show) { card.classList.remove("in"); card.style.transitionDelay = "0ms"; requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("in"))); }
    });
  }
  const book = document.querySelector(".book");
  new IntersectionObserver(es => es.forEach(e => e.isIntersecting && book.classList.add("in")), { threshold: .3 }).observe(book);

  /* ---------- lightbox ---------- */
  const lb = document.getElementById("lb"), lbImg = document.getElementById("lbImg"), lbCap = document.getElementById("lbCap");
  let at = 0, lastFocus = null;
  function show(i) { at = (i + P.length) % P.length; lbImg.src = P[at].src; lbImg.alt = P[at].title; lbCap.textContent = `${pad(at + 1)} / ${pad(P.length)}  ${P[at].title}`; }
  function openLb(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; requestAnimationFrame(() => lb.classList.add("on")); lb.querySelector(".lb-x").focus(); }
  function closeLb() { lb.classList.remove("on"); setTimeout(() => { lb.hidden = true; lastFocus && lastFocus.focus(); }, 300); }
  lb.querySelector(".lb-x").onclick = closeLb;
  lb.querySelector(".lb-p").onclick = () => show(at - 1);
  lb.querySelector(".lb-n").onclick = () => show(at + 1);
  lb.addEventListener("click", e => { if (e.target === lb) closeLb(); });
  addEventListener("keydown", e => {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") show(at - 1);
    if (e.key === "ArrowRight") show(at + 1);
  });
})();
