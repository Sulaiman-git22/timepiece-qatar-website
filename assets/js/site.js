// Timepiece Qatar · page behaviour + motion (GSAP 3.15, ScrollTrigger, SplitText, Lenis 1.3)
(() => {
  const root = document.documentElement;
  const AR = root.lang === 'ar';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // WhatsApp number: +974 3035 1113 (Google Maps + their own Snapchat video), Sulaiman 2026-11-18
  const WA = '97430351113';
  const OPEN_H = 14, CLOSE_H = 23; // daily 2 PM to 11 PM (bio + Google); some captions say 3 PM, to confirm

  const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
  document.querySelectorAll('[data-wa]').forEach((a) => {
    a.href = waLink(a.dataset.wa.replace(/&#10;/g, '\n'));
    a.target = '_blank'; a.rel = 'noopener';
  });

  // ---- light / dark toggle (remembered per visitor; the page paints the right theme before load via the head script) ----
  const toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    const label = (t) => AR ? (t === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن')
                            : (t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    const meta = document.querySelector('meta[name="theme-color"]');
    const apply = (t) => {
      root.setAttribute('data-theme', t);
      toggle.setAttribute('aria-pressed', String(t === 'dark'));
      toggle.setAttribute('aria-label', label(t)); toggle.title = label(t);
      if (meta) meta.setAttribute('content', t === 'dark' ? '#1B1C1F' : '#F3F2EF');
    };
    apply(root.getAttribute('data-theme') || 'light');
    toggle.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (!reduce) { root.classList.add('theme-anim'); setTimeout(() => root.classList.remove('theme-anim'), 650); }
      apply(next);
      try { localStorage.setItem('tp-theme', next); } catch (e) {}
    });
  }

  // ---- theme-aware product photos: ivory set in light mode, navy set in dark mode.
  //      On a theme change each photo crossfades over the same 0.55 s and curve as the page colours, so nothing pops ----
  const themeSrc = (light, dark) => (root.getAttribute('data-theme') === 'dark' && dark) ? dark : light;
  const FADE = 550, FADE_EASE = 'cubic-bezier(.16,1,.3,1)';
  const crossfade = (im, src) => {
    if (!src || im.getAttribute('src') === src) return;
    if (reduce || !im.isConnected || !im.offsetParent) { im.setAttribute('src', src); return; }
    const c = im.cloneNode();
    ['data-dark', 'data-light', 'data-hp-img', 'id', 'loading'].forEach((k) => c.removeAttribute(k));
    c.setAttribute('aria-hidden', 'true'); c.alt = ''; c.classList.add('tp-fade');
    Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover', opacity: '0',
      pointerEvents: 'none', zIndex: '3', transition: `opacity ${FADE}ms ${FADE_EASE}` });
    c.src = src;
    im.insertAdjacentElement('afterend', c);
    const go = () => requestAnimationFrame(() => { c.style.opacity = '1'; });
    (c.decode ? c.decode() : Promise.resolve()).then(go, go);
    setTimeout(() => {
      im.setAttribute('src', src);
      const done = () => c.remove();
      (im.decode ? im.decode() : Promise.resolve()).then(done, done);
    }, FADE + 40);
  };
  let firstPaint = true;
  const swapPhotos = () => {
    document.querySelectorAll('img[data-dark]').forEach((im) => {
      if (!im.dataset.light) im.dataset.light = im.getAttribute('src');
      const want = themeSrc(im.dataset.light, im.dataset.dark);
      if (firstPaint) { if (im.getAttribute('src') !== want) im.setAttribute('src', want); }
      else crossfade(im, want);
    });
    firstPaint = false;
    document.dispatchEvent(new CustomEvent('tp-theme-photos'));
  };
  swapPhotos();
  new MutationObserver(swapPhotos).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  // warm the other set once the page is idle, so the first toggle is instant
  const warm = () => document.querySelectorAll('img[data-dark]').forEach((im) => {
    const other = root.getAttribute('data-theme') === 'dark' ? im.dataset.light : im.dataset.dark;
    if (other) { const x = new Image(); x.decoding = 'async'; x.src = other; }
  });
  ('requestIdleCallback' in window) ? requestIdleCallback(warm, { timeout: 2500 }) : setTimeout(warm, 1500);

  // ---- hero slideshow: auto-advance with a running dash, pause on hover / focus / tab hidden / off screen, swipe, arrows, keys ----
  const hs = document.querySelector('[data-hs]');
  if (hs) {
    const slides = [...hs.querySelectorAll('[data-slide]')], dots = [...hs.querySelectorAll('.hs-dot')];
    const now = hs.querySelector('[data-hs-now]'), pp = hs.querySelector('[data-hs-pause]'), live = hs.querySelector('.hs-track');
    const DUR = 6500; hs.style.setProperty('--hs-dur', DUR + 'ms');
    let i = 0, timer = 0, left = DUR, started = 0, stopped = reduce, hold = 0;
    const PL = AR ? ['إيقاف العرض', 'تشغيل العرض'] : ['Pause slideshow', 'Play slideshow'];
    const warmNext = () => { const nx = slides[(i + 1) % slides.length].querySelectorAll('.hero-media img');
      nx.forEach((im) => { if (im.loading === 'lazy') im.loading = 'eager'; }); };
    const schedule = () => { clearTimeout(timer); if (stopped || hold) return; started = performance.now(); timer = setTimeout(() => show(i + 1), left); };
    const show = (n, user) => {
      n = (n + slides.length) % slides.length; if (n === i && !user) return;
      slides[i].classList.remove('is-on'); slides[i].setAttribute('aria-hidden', 'true'); slides[i].inert = true;
      i = n;
      slides[i].classList.add('is-on'); slides[i].removeAttribute('aria-hidden'); slides[i].inert = false;
      dots.forEach((d, k) => { d.toggleAttribute('aria-current', k === i); d.classList.toggle('done', k < i);
        if (k === i) { const f = d.firstElementChild; f.style.animation = 'none'; void f.offsetWidth; f.style.animation = ''; } });
      if (now) now.textContent = String(i + 1).padStart(2, '0');
      warmNext(); left = DUR; schedule();
    };
    const pause = () => { if (!hold++ && !stopped) { clearTimeout(timer); left = Math.max(400, left - (performance.now() - started)); } hs.classList.add('paused'); };
    const resume = () => { if (hold && !--hold) { hs.classList.remove('paused'); schedule(); } };
    const setStopped = (v) => { stopped = v; hs.classList.toggle('stopped', v); live.setAttribute('aria-live', v ? 'polite' : 'off');
      if (pp) { pp.setAttribute('aria-pressed', String(v)); pp.setAttribute('aria-label', PL[v ? 1 : 0]); }
      clearTimeout(timer); if (!v) { left = DUR; schedule(); } };
    slides.forEach((s, k) => { if (k) s.inert = true; });
    dots.forEach((d, k) => d.addEventListener('click', () => show(k, true)));
    hs.querySelector('[data-hs-prev]').addEventListener('click', () => show(i - 1, true));
    hs.querySelector('[data-hs-next]').addEventListener('click', () => show(i + 1, true));
    if (pp) pp.addEventListener('click', () => setStopped(!stopped));
    if (matchMedia('(hover:hover)').matches) { hs.addEventListener('mouseenter', pause); hs.addEventListener('mouseleave', resume); }
    hs.addEventListener('focusin', (e) => { if (!hs.contains(e.relatedTarget)) pause(); });
    hs.addEventListener('focusout', (e) => { if (!hs.contains(e.relatedTarget)) resume(); });
    document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));
    if ('IntersectionObserver' in window) { let off = false;
      new IntersectionObserver(([e]) => { if (!e.isIntersecting && !off) { off = true; pause(); } else if (e.isIntersecting && off) { off = false; resume(); } }).observe(hs); }
    hs.addEventListener('keydown', (e) => { const k = e.key, fw = AR ? 'ArrowLeft' : 'ArrowRight', bw = AR ? 'ArrowRight' : 'ArrowLeft';
      if (e.target.closest('input,textarea')) return;
      if (k === fw) { show(i + 1, true); e.preventDefault(); } else if (k === bw) { show(i - 1, true); e.preventDefault(); } });
    // swipe (touch / pen): a mostly horizontal move over 40 px changes the slide, vertical scroll is left alone
    let x0 = null, y0 = 0;
    live.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } }, { passive: true });
    live.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) show(i + ((dx < 0) !== AR ? 1 : -1), true); });
    live.addEventListener('pointercancel', () => { x0 = null; });
    warmNext(); setStopped(stopped);
  }

  // ---- store: Brands menu (click / hover / keys), live piece counts, every [data-brand-go] opens the collection on that brand ----
  const brandCount = (b) => [...document.querySelectorAll('.shelf .l-brand')].filter((p) => p.textContent.trim() === b).length;
  const piecesTxt = (n) => AR ? (n === 1 ? 'قطعة واحدة' : n === 2 ? 'قطعتان' : n <= 10 ? `${n} قطع` : `${n} قطعة`) : (n === 1 ? '1 piece' : `${n} pieces`);
  document.querySelectorAll('[data-brand-n]').forEach((el) => { el.textContent = piecesTxt(brandCount(el.dataset.brandN)); });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-brand-go]'); if (!a) return;
    const chip = [...document.querySelectorAll('.chip')].find((c) => c.dataset.brand === a.dataset.brandGo);
    if (chip) setTimeout(() => chip.click(), 60);
  });
  document.querySelectorAll('[data-dd]').forEach((dd) => {
    const btn = dd.querySelector('.nav-dd-btn'), panel = dd.querySelector('.nav-dd-panel');
    let t = 0;
    const set = (open) => { clearTimeout(t); btn.setAttribute('aria-expanded', String(open)); panel.hidden = !open; dd.classList.toggle('open', open); };
    btn.addEventListener('click', () => set(panel.hidden));
    if (matchMedia('(hover:hover)').matches) {
      dd.addEventListener('mouseenter', () => { clearTimeout(t); t = setTimeout(() => set(true), 90); });
      dd.addEventListener('mouseleave', () => { clearTimeout(t); t = setTimeout(() => set(false), 180); });
    }
    dd.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); }
      if (e.key === 'ArrowDown' && panel.hidden && e.target === btn) { e.preventDefault(); set(true); panel.querySelector('a').focus(); }
    });
    dd.addEventListener('focusout', (e) => { if (!dd.contains(e.relatedTarget)) set(false); });
    document.addEventListener('click', (e) => { if (!dd.contains(e.target)) set(false); });
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  });

  // ---- nav search: jump to the collection and put the cursor in its search box ----
  const navSearch = document.querySelector('[data-nav-search]');
  if (navSearch) navSearch.addEventListener('click', () => {
    const box = document.querySelector('[data-vt-search]'), sec = document.querySelector('#vitrine'); if (!box || !sec) return;
    if (window.lenis && window.lenis.scrollTo) window.lenis.scrollTo(sec, { offset: -90, duration: 1.2 }); else sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => box.focus({ preventScroll: true }), reduce ? 0 : 900);
  });

  // ---- about: live numbers (pieces and brands in the vitrine) ----
  const cp = document.querySelector('[data-count="pieces"]'), cb = document.querySelector('[data-count="brands"]');
  const shelfPieces = [...document.querySelectorAll('.shelf .piece')];
  if (cp) cp.textContent = shelfPieces.length;
  if (cb) cb.textContent = new Set(shelfPieces.map((li) => (li.querySelector('.l-brand') || {}).textContent)).size;

  // ---- phone dock: shows once the hero is scrolled past and stays until the footer comes into view ----
  const dock = document.querySelector('.mbar');
  if (dock) {
    const heroEl = document.querySelector('.hero'), footEl = document.querySelector('footer');
    const place = () => {
      const pastHero = heroEl ? heroEl.getBoundingClientRect().bottom < innerHeight * 0.35 : scrollY > 300;
      const atFoot = footEl ? footEl.getBoundingClientRect().top < innerHeight - 20 : false;
      dock.classList.toggle('mbar-hide', !pastHero || atFoot);
    };
    place(); addEventListener('scroll', place, { passive: true }); addEventListener('resize', place);
  }

  // ---- hero slide link opens that watch's detail card ----
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-open-piece]'); if (!a) return;
    const img = document.querySelector(`.shelf .piece img[src*="/${a.dataset.openPiece}.webp"], .shelf .piece img[data-light*="/${a.dataset.openPiece}.webp"]`);
    const ph = img && img.closest('.ph'); if (!ph) return;
    e.preventDefault(); e.stopPropagation(); ph.click();
  }, true);

  // ---- buy messages carry the product: name, reference, specs and the link to its own page.
  //      That page's share image is the product photo, so WhatsApp shows the picture as a preview card in the chat ----
  const photoUrl = (src) => { try { return new URL(src, location.href).href; } catch (e) { return ''; } };
  const pidFrom = (src) => { const m = String(src || '').match(/\/(?:vitrine(?:-navy)?|originals)\/([\w-]+)\.webp/) || String(src || '').match(/\/hero\/slides\/([\w-]+?)(?:-navy)?-(?:1600|2560|phone)\.webp/)
      || (/\/hero\/land-dweller/.test(src || '') ? [0, 'land-dweller'] : null); return m ? m[1] : ''; };
  const pageUrl = (pid) => pid ? new URL(`${AR ? '/ar' : ''}/p/${pid}/`, location.origin).href : '';
  const NL = String.fromCharCode(10);
  const withPage = (wa, extra, pid) => { const lines = wa.split('&#10;').join(NL).split(NL); const close = lines.pop();
    return lines.concat(extra || [], pageUrl(pid), close).filter(Boolean).join(NL); };
  document.querySelectorAll('.piece').forEach((li) => {
    const a = li.querySelector('a[data-wa]'); if (!a) return;
    const spec = ((li.querySelector('.l-spec') || {}).textContent || '').trim();
    a.href = waLink(withPage(a.dataset.wa, [spec], pidFrom(li.querySelector('.ph img').getAttribute('data-light') || li.querySelector('.ph img').getAttribute('src'))));
  });
  document.querySelectorAll('.feature, .duo-card, .hs-slide').forEach((sec) => {   // featured, spotlight and hero slides
    const im = sec.querySelector('img'); if (!im) return;
    const pid = sec.dataset.pid || pidFrom(im.getAttribute('src'));
    sec.querySelectorAll('a[data-wa]').forEach((a) => { if (a.dataset.wa.includes(NL) || a.dataset.wa.includes('&#10;')) a.href = waLink(withPage(a.dataset.wa, [], pid)); });
  });

  // ---- Doha clock + open status ----
  const doha = () => new Date(Date.now() + 3 * 3600 * 1000); // Qatar is UTC+3 all year
  const pad = (n) => String(n).padStart(2, '0');
  const T = AR ? {
    open: (c) => `مفتوح الآن حتى ${c}`, opens: (o) => `يفتح اليوم الساعة ${o}`, closed: (o) => `يفتح غدا الساعة ${o}`,
    h: (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'صباحا' : 'مساء'}`
  } : {
    open: (c) => `Open now until ${c}`, opens: (o) => `Opens today at ${o}`, closed: (o) => `Opens tomorrow at ${o}`,
    h: (h) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`
  };
  const clockEls = document.querySelectorAll('[data-clock]');
  const dotEls = document.querySelectorAll('[data-open-dot]');
  const stripEls = document.querySelectorAll('[data-open-strip]');
  const fh = document.getElementById('fbH'), fm = document.getElementById('fbM');
  function tick() {
    const d = doha();
    const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds();
    clockEls.forEach((el) => { el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`; });
    const isOpen = h >= OPEN_H && h < CLOSE_H;
    const status = isOpen ? T.open(T.h(CLOSE_H)) : (h < OPEN_H ? T.opens(T.h(OPEN_H)) : T.closed(T.h(OPEN_H)));
    dotEls.forEach((el) => el.classList.toggle('open', isOpen));
    stripEls.forEach((el) => { el.textContent = status; });
    document.querySelectorAll('[data-open-short]').forEach((el) => { el.textContent = isOpen ? (AR ? 'مفتوح الآن' : 'Open now') : (AR ? 'مغلق الآن' : 'Closed now'); });
    if (fh && fm) {
      fh.setAttribute('transform', `rotate(${((h % 12) + m / 60) * 30} 100 100)`);
      fm.setAttribute('transform', `rotate(${(m + s / 60) * 6} 100 100)`);
    }
  }
  tick(); setInterval(tick, 1000);

  // ---- dial ring + compass ticks (geometry) ----
  const ns = 'http://www.w3.org/2000/svg';
  const ticks = (g, cx, r, n, longEvery, l1, l2) => {
    if (!g) return;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, L = i % longEvery === 0 ? l1 : l2;
      const ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', cx + Math.sin(a) * r); ln.setAttribute('y1', cx - Math.cos(a) * r);
      ln.setAttribute('x2', cx + Math.sin(a) * (r - L)); ln.setAttribute('y2', cx - Math.cos(a) * (r - L));
      g.appendChild(ln);
    }
  };
  ticks(document.getElementById('ticks'), 500, 498, 120, 10, 26, 11);
  ticks(document.getElementById('compassTicks'), 200, 186, 72, 6, 16, 7);
  const ruler = document.getElementById('rulerTicks');
  if (ruler) for (let i = 0; i <= 120; i++) {
    const x = 0.5 + i * 9.99, L = i % 15 === 0 ? 24 : i % 5 === 0 ? 14 : 7;
    const ln = document.createElementNS(ns, 'line');
    ln.setAttribute('x1', x); ln.setAttribute('x2', x); ln.setAttribute('y1', 24); ln.setAttribute('y2', 24 - L);
    if (i % 15 === 0) ln.setAttribute('class', 'l');
    ruler.appendChild(ln);
  }

  // ---- find me a watch → WhatsApp, with a real error state ----
  const form = document.getElementById('finder');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const brand = (f.get('brand') || '').trim(), ref = (f.get('ref') || '').trim(), name = (f.get('name') || '').trim();
    const msg = form.querySelector('.form-msg');
    const brandLabel = form.querySelector('input[name=brand]').closest('label');
    if (!brand && !ref) {
      brandLabel.classList.add('err');
      msg.textContent = AR ? 'اكتب الماركة أو الموديل حتى نعرف عن أي ساعة تبحث' : 'Add a brand or a model so we know which watch to look for';
      form.querySelector('input[name=brand]').focus();
      return;
    }
    brandLabel.classList.remove('err'); msg.textContent = '';
    const lines = AR
      ? ['مرحبا Timepiece', 'أبحث عن ساعة', brand && `الماركة ${brand}`, ref && `الموديل أو المرجع ${ref}`, name && `الاسم ${name}`]
      : ['Hello Timepiece', 'I am looking for a watch', brand && `Brand ${brand}`, ref && `Model or reference ${ref}`, name && `Name ${name}`];
    window.open(waLink(lines.filter(Boolean).join('\n')), '_blank', 'noopener');
  });
  form && form.addEventListener('input', () => { form.querySelector('.err')?.classList.remove('err'); form.querySelector('.form-msg').textContent = ''; });

  // ---- hero watch face: a gold hand sweeps the dial; when it completes the circle the ring unwinds and the watch changes ----
  const hp = document.querySelector('[data-hour-piece]');
  if (hp) {
    const CYCLE = 9000, N = 60, TRAIL = 7;               // one turn = 9 s; 60 ticks; trail length in ticks
    const P = [...document.querySelectorAll('.shelf .piece')].map((li) => ({
      img: li.querySelector('img').dataset.light || li.querySelector('img').getAttribute('src'),
      dark: li.querySelector('img').dataset.dark,
      brand: li.querySelector('.l-brand').textContent.trim(),
      model: li.querySelector('h3').textContent.trim(),
      ref: (li.querySelector('.l-ref') || {}).textContent || ''
    }));
    const feat = document.querySelector('#featured');
    if (feat) { const fi = feat.querySelector('img'); P.splice(3, 0, { img: fi.dataset.light || fi.getAttribute('src'), dark: fi.dataset.dark, brand: 'Patek Philippe', model: 'Nautilus Denim', ref: '5980/60G-001' }); }
    const pic = (p) => themeSrc(p.img, p.dark);
    P.forEach((p) => { [p.img, p.dark].forEach((u) => { if (u) { const im = new Image(); im.src = u; } }); });

    // ---- build the bezel (SVG, 200 x 200, centre 100) ----
    const svg = hp.querySelector('.hp-ring'), NS = 'http://www.w3.org/2000/svg';
    const pt = (r, a) => [100 + Math.sin(a) * r, 100 - Math.cos(a) * r];
    let minutes = '', indices = '';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      if (i % 5) { const [x1, y1] = pt(90.6, a), [x2, y2] = pt(88.2, a); minutes += `<line class="mt" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }
      else {
        const deg = i * 6, w = i === 0 ? 1.1 : 1.5;
        const bar = (dx) => `<g transform="rotate(${deg} 100 100)"><rect class="ix" x="${100 - w / 2 + dx}" y="9.6" width="${w}" height="6.2" rx="${w / 2}"/><rect class="ix-hi" x="${100 - w / 2 + dx}" y="9.6" width="${w / 2.4}" height="6.2" rx="${w / 4}"/></g>`;
        indices += i === 0 ? bar(-1.1) + bar(1.1) : bar(0);
        minutes += `<line class="mt major" data-major x1="${pt(90.6, a)[0]}" y1="${pt(90.6, a)[1]}" x2="${pt(90.6, a)[0]}" y2="${pt(90.6, a)[1]}"/>`;
      }
    }
    svg.innerHTML = `
      <defs>
        <linearGradient id="bzMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#FBE7B5"/><stop offset=".22" stop-color="#D9AE62"/><stop offset=".45" stop-color="#8E6A2E"/>
          <stop offset=".62" stop-color="#E9C37C"/><stop offset=".8" stop-color="#B0843E"/><stop offset="1" stop-color="#F3D48F"/>
        </linearGradient>
        <linearGradient id="bzEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
        <linearGradient id="bzIdx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7DDA2"/><stop offset=".5" stop-color="#C79A50"/><stop offset="1" stop-color="#7E5C24"/></linearGradient>
        <radialGradient id="bzRehaut" cx=".5" cy=".5" r=".5"><stop offset=".84" style="stop-color:var(--rehaut-in)"/><stop offset="1" style="stop-color:var(--rehaut-out)"/></radialGradient>
        <filter id="bzShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy=".35" stdDeviation=".35" flood-color="#000" flood-opacity=".45"/></filter>
        <filter id="bzSoft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.2"/></filter>
      </defs>
      <circle class="bz-cast" cx="100" cy="101.5" r="97" filter="url(#bzSoft)"/>
      <circle class="bz-metal" cx="100" cy="100" r="96" />
      <circle class="bz-edge" cx="100" cy="100" r="96" />
      <circle class="bz-lip-out" cx="100" cy="100" r="98.9"/>
      <circle class="bz-lip-in" cx="100" cy="100" r="93.1"/>
      <circle class="bz-rehaut" cx="100" cy="100" r="88.2"/>
      <circle class="bz-arc" cx="100" cy="100" r="91.9" pathLength="100"/>
      <g class="bz-minutes">${minutes}</g>
      <g class="bz-indices" filter="url(#bzShadow)">${indices}</g>
      <circle class="bz-inner" cx="100" cy="100" r="84.6"/>
      <g class="bz-hand" filter="url(#bzShadow)">
        <path class="ph-body" d="M100 4.6 L102.6 11.2 L100 17.4 L97.4 11.2 Z"/>
        <path class="ph-hi" d="M100 4.6 L100 17.4 L97.4 11.2 Z"/>
        <circle class="ph-lume" cx="100" cy="10.6" r="1"/>
      </g>`;
    const ticks = [...svg.querySelectorAll('.bz-minutes .mt:not(.major)')];
    const prog = svg.querySelector('.bz-arc'), hand = svg.querySelector('.bz-hand');

    const frame = hp.querySelector('.hp-frame');
    const imgA = hp.querySelector('[data-hp-img]');
    imgA.removeAttribute('data-dark');
    const imgB = imgA.cloneNode(); imgB.removeAttribute('data-hp-img'); imgB.setAttribute('aria-hidden', 'true'); imgB.style.opacity = '0';
    frame.appendChild(imgB);
    const brandEl = hp.querySelector('[data-hp-brand]'), modelEl = hp.querySelector('[data-hp-model]');
    const ask = hp.querySelector('[data-hp-ask]'), timeEl = hp.querySelector('[data-hp-hour]');

    const label = (p) => {
      brandEl.textContent = p.brand; modelEl.textContent = p.model;
      const msg = (AR ? `مرحبا Timepiece\nأود شراء ${p.brand} ${p.model}` : `Hello Timepiece\nI would like to buy the ${p.brand} ${p.model}`) + (p.ref ? `\n${AR ? 'المرجع' : 'Ref'} ${p.ref}` : '') + `
${pageUrl(pidFrom(p.img))}` + (AR ? '\nأرجو إرسال السعر وطريقة الدفع' : '\nPlease send me the price and how to pay');
      ask.href = waLink(msg); ask.target = '_blank'; ask.rel = 'noopener';
    };
    let idx = 0, front = imgA, back = imgB, busy = false, paused = false, visible = true;
    const at = (i) => P[((i % P.length) + P.length) % P.length];
    front.src = pic(at(0)); front.alt = `${at(0).brand} ${at(0).model}`; label(at(0));

    // draw the dial for a progress value 0..1 (continuous)
    const ease = (x) => x;                                // linear sweep: steady like a real seconds hand
    const draw = (p) => {
      const q = Math.max(0, Math.min(1, p));
      prog.style.strokeDashoffset = String(100 - q * 100);
      hand.setAttribute('transform', `rotate(${q * 360} 100 100)`);
      const head = q * 60;
      for (let i = 0, k = 0; i < 60; i++) {
        if (i % 5 === 0) continue;
        const tk = ticks[k++]; if (!tk) continue;
        const behind = head - i;
        if (behind < 0) { tk.style.opacity = ''; tk.classList.remove('on'); continue; }
        tk.classList.add('on');
        tk.style.opacity = String(0.6 + 0.4 * Math.max(0, 1 - behind / 6));
      }
    };

    const state = { p: 0 };
    let last = performance.now();
    const change = (dir) => {                              // pulse, unwind the ring, crossfade to the next watch
      if (busy) return; busy = true;
      idx += dir; const p = at(idx);
      back.src = pic(p); back.alt = `${p.brand} ${p.model}`;
      const finish = () => { [front, back] = [back, front]; front.removeAttribute('aria-hidden'); back.setAttribute('aria-hidden', 'true'); state.p = 0; busy = false; };
      if (window.gsap && !reduce) {
        const turn = dir * 8;
        gsap.timeline({ onComplete: finish })
          .to(svg, { scale: 1.025, duration: .35, ease: 'power2.out', transformOrigin: '50% 50%' }, 0)
          .to(svg, { scale: 1, duration: .9, ease: 'elastic.out(1,0.5)' }, .35)
          .to(state, { p: 0, duration: 1.1, ease: 'power3.inOut', onUpdate: () => draw(state.p) }, .2)
          .set(back, { opacity: 0, scale: 1.12, rotate: -turn, zIndex: 2 }, 0).set(front, { zIndex: 1 }, 0)
          .to(front, { opacity: 0, scale: .94, rotate: turn, duration: 1.1, ease: 'power2.inOut' }, .2)
          .to(back, { opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'expo.out' }, .3)
          .to([brandEl, modelEl], { opacity: 0, y: 6, duration: .25, ease: 'power2.in', onComplete: () => label(p) }, .2)
          .to([brandEl, modelEl], { opacity: 1, y: 0, duration: .6, stagger: .06, ease: 'power3.out' }, .55);
      } else { back.style.opacity = '1'; front.style.opacity = '0'; label(p); draw(0); finish(); }
    };
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(100, now - last); last = now;
      const d = doha(); timeEl.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
      if (busy || paused || !visible || reduce) return;
      state.p += dt / CYCLE;
      if (state.p >= 1) { state.p = 1; draw(1); change(1); return; }
      draw(state.p);
    };
    draw(0); requestAnimationFrame(loop);
    document.addEventListener('tp-theme-photos', () => { crossfade(front, pic(at(idx))); P.forEach((p) => { const im = new Image(); im.src = pic(p); }); });
    hp.querySelector('[data-hp-next]').addEventListener('click', () => change(1));
    hp.querySelector('[data-hp-prev]').addEventListener('click', () => change(-1));
    hp.addEventListener('pointerenter', () => { paused = true; hp.classList.add('held'); });
    hp.addEventListener('pointerleave', () => { paused = false; hp.classList.remove('held'); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(hp);
    document.addEventListener('visibilitychange', () => { visible = !document.hidden; last = performance.now(); });
  }

  // ---- vitrine: search by brand, model or reference + brand chips with real counts ----
  const shelf = document.querySelector('.shelf');
  const vtSearch = document.querySelector('[data-vt-search]'), vtChips = document.querySelector('[data-vt-chips]'), vtEmpty = document.querySelector('[data-vt-empty]');
  const pieces = shelf ? [...shelf.querySelectorAll('.piece')] : [];
  if (shelf && vtChips) {
    const brandOf = (li) => li.querySelector('.l-brand').textContent.trim();
    const counts = pieces.reduce((m, li) => (m[brandOf(li)] = (m[brandOf(li)] || 0) + 1, m), {});
    let brand = '';
    const mk = (label, n, val) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.brand = val;
      b.innerHTML = `<span dir="auto">${label}</span><b>${n}</b>`; b.setAttribute('aria-pressed', String(val === '')); vtChips.appendChild(b); return b; };
    mk(vtChips.dataset.all, pieces.length, '');
    Object.keys(counts).sort((a, b) => counts[b] - counts[a]).forEach((k) => mk(k, counts[k], k));
    const apply = () => {
      const q = (vtSearch.value || '').toLowerCase().replace(/\s+/g, ' ').trim();
      let shown = 0;
      pieces.forEach((li) => {
        const hay = li.querySelector('.label').textContent.toLowerCase().replace(/\s+/g, ' ');
        const ok = (!brand || brandOf(li) === brand) && (!q || q.split(' ').every((w) => hay.includes(w)));
        li.hidden = !ok; if (ok) shown++;
      });
      shelf.classList.toggle('filtered', !!(brand || q));
      vtEmpty.hidden = shown > 0;
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    vtChips.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return;
      brand = b.dataset.brand; vtChips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b))); apply(); });
    vtSearch.addEventListener('input', apply);
    // long vitrine: show the first 9 on desktop, the rest behind one button (filters and search always show every match)
    if (pieces.length > 9) {
      shelf.classList.add('collapsed');
      const wrapMore = document.createElement('div'); wrapMore.className = 'vt-more';
      wrapMore.innerHTML = `<button type="button" class="pill pill-ghost">${AR ? 'عرض كل القطع' : 'See all pieces'} <b>${pieces.length}</b></button>`;
      shelf.after(wrapMore);
      wrapMore.querySelector('button').addEventListener('click', () => { shelf.classList.remove('collapsed'); wrapMore.remove(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    }
  }

  // ---- product detail panel: studio photo + their own boutique photo of the same piece, specs, buy / trade ----
  if (pieces.length) {
    const L = AR ? { close: 'إغلاق', studio: 'صورة الاستوديو', shop: 'داخل البوتيك', por: 'السعر عند الطلب', trade: 'استبدلها بساعتك', ref: 'المرجع',
                     f: { case: 'العلبة', cal: 'الحركة', pr: 'احتياطي الطاقة', wr: 'مقاومة الماء' }, h: 'ساعة', m: 'متر', mm: 'مم',
                     tradeMsg: (n, r) => `مرحبا Timepiece\nأود استبدال ساعتي مقابل ${n}${r ? `\nالمرجع ${r}` : ''}\nسأرسل تفاصيل وصور ساعتي` }
                 : { close: 'Close', studio: 'Studio photo', shop: 'In the boutique', por: 'Price on request', trade: 'Trade for this watch', ref: 'Ref',
                     f: { case: 'Case', cal: 'Movement', pr: 'Power reserve', wr: 'Water resistance' }, h: 'h', m: 'm', mm: 'mm',
                     tradeMsg: (n, r) => `Hello Timepiece\nI would like to trade my watch for the ${n}${r ? `\nRef ${r}` : ''}\nI will send details and photos of my watch` };
    const dlg = document.createElement('dialog'); dlg.className = 'pd'; dlg.setAttribute('aria-labelledby', 'pd-title');
    dlg.innerHTML = `<button class="pd-x" type="button" aria-label="${L.close}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
      <div class="pd-media"><figure class="pd-main"><img alt=""></figure><div class="pd-thumbs" role="group"></div></div>
      <div class="pd-info"><p class="l-brand" dir="ltr" lang="en"></p><h3 id="pd-title" dir="ltr" lang="en"></h3><p class="pd-ref"></p>
        <p class="pd-spec"></p><dl class="pd-facts"></dl><p class="note">${L.por}</p>
        <div class="pd-actions"><a class="pill pill-gold pd-buy" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg><span></span></a>
          <a class="pill pill-ghost pd-trade" target="_blank" rel="noopener"><svg class="ic"><use href="#i-wa"/></svg>${L.trade}</a></div></div>`;
    document.body.appendChild(dlg);
    const mainImg = dlg.querySelector('.pd-main img'), thumbs = dlg.querySelector('.pd-thumbs');
    const open = (li) => {
      const im = li.querySelector('.ph img'), brandT = li.querySelector('.l-brand').textContent.trim(), model = li.querySelector('h3').textContent.trim();
      const ref = (li.querySelector('.l-ref') || {}).textContent || '', buy = li.querySelector('.label a');
      const shots = [{ src: im.getAttribute('src'), label: L.studio }];
      if (im.dataset.original) shots.push({ src: im.dataset.original, label: L.shop });
      dlg.querySelector('.l-brand').textContent = brandT; dlg.querySelector('h3').textContent = model;
      dlg.querySelector('.pd-ref').innerHTML = ref ? `${L.ref} <bdi dir="ltr">${ref.trim()}</bdi>` : ''; dlg.querySelector('.pd-spec').textContent = (li.querySelector('.l-spec') || {}).textContent || '';
      const b = dlg.querySelector('.pd-buy'); b.href = buy.href; b.querySelector('span').textContent = buy.textContent.trim();
      dlg.querySelector('.pd-trade').href = waLink(L.tradeMsg(`${brandT} ${model}`, ref.trim()));
      // specs checked against the brand's own page (research/official); no links to brand sites on the website
      const ds = li.dataset;
      // no commas or brackets in visible copy; Arabic shows the calibre code only
      const cal = ds.cal && (AR ? 'كاليبر ' + ds.cal.replace(/^calibre\s*/i, '').split(/[,(·]/)[0].trim() : ds.cal.replace(/\s*,\s*/g, ' · ').replace(/[()]/g, ''));
      const val = { case: ds.case && ds.case.replace('mm', L.mm), cal, pr: ds.pr && `${ds.pr} ${L.h}`, wr: ds.wr && `${ds.wr} ${L.m}` };
      dlg.querySelector('.pd-facts').innerHTML = Object.keys(L.f).filter((k) => val[k]).map((k) => `<div><dt>${L.f[k]}</dt><dd dir="auto">${val[k].replace(/[<>&]/g, '')}</dd></div>`).join('');
      thumbs.innerHTML = '';
      const show = (i) => { mainImg.src = shots[i].src; mainImg.alt = `${brandT} ${model} ${shots[i].label}`; mainImg.parentElement.classList.toggle('tall', i === 1);
        mainImg.parentElement.style.setProperty('--pd-bg', `url("${shots[i].src}")`);   // blurred copy fills the frame behind a tall boutique photo
        thumbs.querySelectorAll('button').forEach((t, k) => t.setAttribute('aria-pressed', String(k === i))); };
      shots.forEach((sh, i) => { const t = document.createElement('button'); t.type = 'button'; t.innerHTML = `<img src="${sh.src}" alt=""><span>${sh.label}</span>`;
        t.addEventListener('click', () => show(i)); thumbs.appendChild(t); });
      show(0);
      dlg.showModal(); document.documentElement.classList.add('pd-open');
      if (window.gsap && !reduce) gsap.fromTo(dlg, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .6, ease: 'expo.out' });
    };
    const close = () => { dlg.close(); };
    dlg.addEventListener('close', () => document.documentElement.classList.remove('pd-open'));
    dlg.querySelector('.pd-x').addEventListener('click', close);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
    pieces.forEach((li) => {
      const ph = li.querySelector('.ph'), h = li.querySelector('h3');
      [ph, h].forEach((el) => { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.classList.add('opens');
        el.setAttribute('aria-label', `${li.querySelector('.l-brand').textContent.trim()} ${h.textContent.trim()}`);
        el.addEventListener('click', () => open(li)); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(li); } }); });
    });
  }

  // ---- brand marquee: tapping a brand opens the vitrine with that brand already chosen ----
  document.querySelectorAll('[data-marquee] a').forEach((a) => a.addEventListener('click', () => {
    const chip = [...document.querySelectorAll('.chip')].find((c) => c.dataset.brand === a.textContent.trim());
    if (chip) setTimeout(() => chip.click(), 60);
  }));

  // ---- Instagram + Snapchat carousels: official embeds load only after a tap; /api/social keeps the rows up to date ----
  const rows = [...document.querySelectorAll('.reel-row')];
  if (rows.length) {
    const dlgIg = document.createElement('dialog'); dlgIg.className = 'ig';
    dlgIg.innerHTML = `<div class="ig-box"></div><div class="ig-bar"><a target="_blank" rel="noopener"></a><button type="button"></button></div>`;
    document.body.appendChild(dlgIg);
    const box = dlgIg.querySelector('.ig-box'), more = dlgIg.querySelector('a'), closeBtn = dlgIg.querySelector('button');
    const shut = () => dlgIg.close();
    closeBtn.addEventListener('click', shut);
    dlgIg.addEventListener('click', (e) => { if (e.target === dlgIg) shut(); });
    dlgIg.addEventListener('close', () => { box.innerHTML = ''; document.documentElement.classList.remove('pd-open'); });
    const open = (row, b) => {
      const snap = !!b.dataset.snap;
      const latest = b.hasAttribute('data-iglatest');   // Instagram's own profile embed: always shows their newest posts
      const src = snap ? b.dataset.embed : latest ? 'https://www.instagram.com/timepiece/embed/' : `https://www.instagram.com/reel/${b.dataset.reel}/embed/`;
      const ifr = document.createElement('iframe');
      ifr.src = src; ifr.title = b.getAttribute('aria-label') || ''; ifr.loading = 'eager';
      ifr.allow = snap ? 'autoplay; clipboard-write' : 'autoplay; encrypted-media; picture-in-picture'; ifr.setAttribute('allowfullscreen', '');
      box.replaceChildren(ifr);
      box.classList.toggle('snap', snap);
      more.href = snap ? b.dataset.url : latest ? 'https://www.instagram.com/timepiece/' : `https://www.instagram.com/reel/${b.dataset.reel}/`;
      more.textContent = row.dataset.more; closeBtn.textContent = row.dataset.close;
      dlgIg.setAttribute('aria-label', snap ? 'Snapchat' : 'Instagram');
      dlgIg.showModal(); document.documentElement.classList.add('pd-open');
    };
    rows.forEach((row) => row.addEventListener('click', (e) => { const b = e.target.closest('[data-reel],[data-snap],[data-iglatest]'); if (b) open(row, b); }));

    // carousel arrows: scroll by most of a screen, dim at the ends (RTL aware)
    const navFor = (row) => row.closest('section').querySelector('.row-nav');
    const ends = (row) => { const nav = navFor(row); if (!nav) return;
      const max = row.scrollWidth - row.clientWidth, x = Math.abs(row.scrollLeft);
      nav.querySelector('[data-row-prev]').disabled = x < 4; nav.querySelector('[data-row-next]').disabled = x > max - 4;
      nav.hidden = max < 8; };
    rows.forEach((row) => { const nav = navFor(row); if (!nav) return;
      const step = (dir) => row.scrollBy({ left: dir * (AR ? -1 : 1) * row.clientWidth * 0.85, behavior: reduce ? 'auto' : 'smooth' });
      nav.querySelector('[data-row-prev]').addEventListener('click', () => step(-1));
      nav.querySelector('[data-row-next]').addEventListener('click', () => step(1));
      row.addEventListener('scroll', () => ends(row), { passive: true }); ends(row); });
    addEventListener('resize', () => rows.forEach(ends));

    // live list: new Spotlight videos (and Instagram reels once their account is connected) replace the baked-in cards
    const esc = (t) => String(t || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const play = '<span class="reel-play"><svg class="play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>';
    fetch('/api/social', { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d) return;
      rows.forEach((row) => {
        const f = d[row.dataset.feed]; if (!f || !Array.isArray(f.items) || !f.items.length) return;
        const snap = row.dataset.feed === 'snapchat';
        const local = {}; row.querySelectorAll('[data-snap],[data-reel]').forEach((b) => { local[b.dataset.snap || b.dataset.reel] = b.querySelector('img').getAttribute('src'); });
        row.innerHTML = f.items.map((it) => {
          const label = esc(`${row.dataset.play || ''} · ${it.caption || it.date}`);
          const attrs = snap ? `data-snap="${esc(it.id)}" data-embed="${esc(it.embed)}" data-url="${esc(it.url)}"` : `data-reel="${esc(it.id)}"`;
          return `<li><button type="button" class="reel" ${attrs} aria-label="${label}">
            <img src="${esc(local[it.id] || it.cover)}" width="540" height="960" alt="${esc(row.dataset.alt || '')}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
            ${play}<span class="reel-cap"><b dir="ltr">${esc(it.date)}</b>${String(it.caption || '').split(' · ').filter(Boolean).map((t) => `<span dir="auto">${esc(t)}</span>`).join('')}</span></button></li>`;
        }).join('') + (snap ? '' : (row.querySelector('[data-iglatest]') || { closest: () => null }).closest('li')?.outerHTML || '');
        ends(row);
      });
    }).catch(() => {});
  }

  // ---- finder tabs: find a watch | sell or trade ----
  const tabs = document.querySelector('[data-finder-tabs]');
  if (tabs) {
    const btns = [...tabs.querySelectorAll('[role=tab]')];
    const sel = (b) => { btns.forEach((x) => { const on = x === b; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
      const sell = b === btns[1];
      document.querySelectorAll('.finder-copy [data-sell]').forEach((el) => { if (!el.dataset.find) el.dataset.find = el.innerHTML; el.innerHTML = sell ? el.dataset.sell : el.dataset.find; }); };
    btns.forEach((b, i) => { b.addEventListener('click', () => sel(b));
      b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = btns[(i + 1) % btns.length]; sel(n); n.focus(); } }); });
    sel(btns[0]);
    document.querySelectorAll('a[href="#find"][data-tab]').forEach((a) => a.addEventListener('click', () => sel(btns[a.dataset.tab === 'sell' ? 1 : 0])));
  }
  const seller = document.getElementById('seller');
  if (seller) seller.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(seller), v = (k) => (f.get(k) || '').toString().trim();
    const msg = seller.querySelector('.form-msg'), first = seller.querySelector('input[name=brand]').closest('label');
    if (!v('brand') && !v('ref')) { first.classList.add('err'); msg.textContent = AR ? 'اكتب الماركة أو الموديل حتى نعرف الساعة' : 'Add a brand or a model so we know the watch'; seller.querySelector('input[name=brand]').focus(); return; }
    first.classList.remove('err'); msg.textContent = '';
    const lines = AR
      ? ['مرحبا Timepiece', 'أود بيع أو استبدال ساعتي', v('brand') && `الماركة ${v('brand')}`, v('ref') && `الموديل أو المرجع ${v('ref')}`, v('year') && `السنة ${v('year')}`, v('papers') && `العلبة والأوراق ${v('papers')}`, v('cond') && `الحالة ${v('cond')}`, 'سأرسل الصور هنا']
      : ['Hello Timepiece', 'I would like to sell or trade my watch', v('brand') && `Brand ${v('brand')}`, v('ref') && `Model or reference ${v('ref')}`, v('year') && `Year ${v('year')}`, v('papers') && `Box and papers ${v('papers')}`, v('cond') && `Condition ${v('cond')}`, 'I will send photos here'];
    window.open(waLink(lines.filter(Boolean).join('\n')), '_blank', 'noopener');
  });
  seller && seller.addEventListener('input', () => { seller.querySelector('.err')?.classList.remove('err'); seller.querySelector('.form-msg').textContent = ''; });

  // ---- nav: active section underline + phone menu sheet ----
  const navLinks = [...document.querySelectorAll('.nav-links > a[href^="#"]')];
  const secs = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && secs.length) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => { if (e.isIntersecting) navLinks.forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id)); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach((s) => io.observe(s));
    const top = document.querySelector('.hero');
    if (top) new IntersectionObserver((ents) => { if (ents[0].isIntersecting) navLinks.forEach((a) => a.removeAttribute('aria-current')); }, { rootMargin: '-45% 0px -50% 0px' }).observe(top);
  }
  const menu = document.getElementById('site-menu'), menuBtn = document.querySelector('[data-menu-open]');
  if (menu && menuBtn) {
    const openMenu = () => { menu.showModal(); document.documentElement.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true');
      if (window.gsap && !reduce) gsap.from(menu.querySelectorAll('.menu-status, .menu-list li, .menu-brands, .menu-foot'), { opacity: 0, y: 18, duration: 0.6, stagger: 0.04, ease: 'power3.out' }); };
    const shutMenu = () => menu.close();
    menuBtn.addEventListener('click', openMenu);
    menu.querySelector('[data-menu-close]').addEventListener('click', shutMenu);
    menu.addEventListener('close', () => { document.documentElement.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); });
    // close first; the page's own anchor handling (smooth scroll, sell tab) then runs as for any in-page link
    menu.querySelectorAll('.menu-list a, .menu-chips a').forEach((a) => a.addEventListener('click', shutMenu));
  }

  // ---- nav: glass after the hero top, hides on scroll down, returns on scroll up ----
  const nav = document.getElementById('nav');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 24);
    nav.classList.toggle('hide', y > 600 && y > lastY + 2);
    if (y < lastY - 2 || y < 600) nav.classList.remove('hide');
    lastY = y;
  };
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  // ---- reference tick: characters roll in like a catalogue ledger ----
  const CH = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
  const rollRef = (el) => {
    const final = el.dataset.tick; let f = 0; const total = 22;
    const step = () => {
      f++;
      el.textContent = final.split('').map((c, i) => (!/[A-Z0-9]/.test(c) || f > total * (i / final.length) + 6) ? c : CH[(Math.random() * CH.length) | 0]).join('');
      if (f < total + 8) requestAnimationFrame(step); else el.textContent = final;
    };
    step();
  };

  // ================= MOTION =================
  const G = window.gsap, ST = window.ScrollTrigger;
  if (!G || !ST) { root.classList.remove('gs'); root.classList.add('no-gsap'); return; }
  if (reduce) { root.classList.add('no-gsap'); return; }

  G.registerPlugin(ST);
  if (window.SplitText) G.registerPlugin(window.SplitText);
  G.defaults({ ease: 'expo.out', duration: 1 });

  // Lenis smooth scroll: desktop pointers only (house setup)
  const fine = matchMedia('(pointer: fine) and (min-width: 900px)').matches;
  if (fine && window.Lenis) {
    const lenis = new window.Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true, wheelMultiplier: 1 }); window.lenis = lenis;
    lenis.on('scroll', ST.update);
    G.ticker.add((time) => lenis.raf(time * 1000));
    G.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const el = document.querySelector(id); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { duration: 1.4, offset: -80 });
    }));
  }

  // 1 · hero entrance: masked headline lines, then the supporting copy
  const hero = G.timeline({ delay: 0.15 });
  hero.to('.display .line>span', { y: 0, duration: 1.3, ease: 'power4.out', stagger: 0.09 })
      .to('[data-hero-fade]', { opacity: 1, duration: 1.1, stagger: 0.1, ease: 'power3.out', startAt: { y: 18 }, y: 0 }, '-=0.8');

  // hero photo settles in as the page opens, then drifts slower than the page (depth without moving the type)
  const heroImg = document.querySelector('.hero-media img');
  if (heroImg) {
    if (!matchMedia('(max-width:760px), (max-width:1100px) and (orientation:portrait)').matches) G.to('.hs-track', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  // hero copy drifts and dims as the watch turns over (shapes and opacity, never below .55 for type)
  G.to('.hs-ui', { opacity: 0.55, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // 2 · brands marquee: endless loop that skews with scroll velocity (±6°)
  const track = document.querySelector('[data-marquee]');
  if (track) {
    const loop = G.to(track, { xPercent: AR ? 50 : -50, duration: 46, ease: 'none', repeat: -1 });
    const skewTo = G.quickTo(track, 'skewX', { duration: 0.9, ease: 'power3.out' });
    ST.create({ trigger: '.brands', start: 'top bottom', end: 'bottom top', onUpdate: (self) => {
      const v = self.getVelocity();
      skewTo(Math.max(-6, Math.min(6, -v / 2600)));
      loop.timeScale(1 + Math.min(3, Math.abs(v) / 1800));
    }});
  }

  // 3 · statement: words light up once, in reading order
  const big = document.querySelector('[data-words]');
  if (big && window.SplitText) {
    const split = new window.SplitText(big, { type: 'words', wordsClass: 'w' });
    G.fromTo(split.words, { opacity: 0.16 }, { opacity: 1, duration: 0.9, stagger: 0.045, ease: 'power2.out', immediateRender: true,
      scrollTrigger: { trigger: big, start: 'top 78%', once: true } });
  }

  // 4 · featured + spotlight: image uncovers top to bottom, then a slow parallax inside its frame
  document.querySelectorAll('[data-uncover]').forEach((fmEl) => {
    const img = fmEl.querySelector('img'), copy = fmEl.parentElement.querySelectorAll('.feature-copy > *');
    G.fromTo(fmEl, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.5, ease: 'power4.out', immediateRender: true,
      scrollTrigger: { trigger: fmEl, start: 'top 82%', once: true } });
    G.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2.2, ease: 'expo.out', immediateRender: true, scrollTrigger: { trigger: fmEl, start: 'top 82%', once: true } });
    G.fromTo(img, { yPercent: 0 }, { yPercent: -7, ease: 'none', scrollTrigger: { trigger: fmEl, start: 'top bottom', end: 'bottom top', scrub: true } });
    G.from(copy, { opacity: 0, y: 22, duration: 0.9, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: copy[0], start: 'top 80%', once: true } });
  });

  // 5 · the vitrine: each photo uncovers bottom to top while the picture settles, labels follow, refs roll
  const caseEl = document.querySelector('[data-case]');
  if (caseEl) {
    ST.batch(caseEl.querySelectorAll('.piece'), { start: 'top 86%', once: true, onEnter: (els) => {
      els.forEach((el, i) => {
        const fig = el.querySelector('.ph'), img = fig.querySelector('img'), lab = el.querySelector('.label');
        const d = i * 0.12;
        G.fromTo(fig, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.3, ease: 'power4.out', delay: d });
        G.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.9, ease: 'expo.out', delay: d });
        G.from(lab, { opacity: 0, y: 18, duration: 0.9, ease: 'power3.out', delay: d + 0.25 });
        const t = el.querySelector('[data-tick]'); if (t) setTimeout(() => rollRef(t), (d + 0.4) * 1000);
      });
    }});
  }

  ST.batch('.reel-row li', { start: 'top 92%', once: true, onEnter: (els) => G.from(els, { opacity: 0, y: 34, duration: 1, stagger: 0.07, ease: 'power3.out' }) });
  // 7 · landing sections: quiet rises, once each
  ['.why-list li', '.steps li', '.quotes li', '.faq details'].forEach((sel) => {
    ST.batch(sel, { start: 'top 90%', once: true, onEnter: (els) => G.from(els, { opacity: 0, y: 26, duration: 0.9, stagger: 0.08, ease: 'power3.out' }) });
  });
  if (document.querySelector('.final-card')) G.from('.final-card > *', { opacity: 0, y: 24, duration: 1, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '.final-card', start: 'top 82%', once: true } });

  // 6 · services, finder, visit: quiet rises, each section once
  ST.batch('.svc li', { start: 'top 90%', once: true, onEnter: (els) => G.from(els, { opacity: 0, y: 30, duration: 1, stagger: 0.1, ease: 'power3.out' }) });
  G.from('.svc-title, .finder-copy > *, .finder-form > *', { opacity: 0, y: 22, duration: 0.9, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '.finder', start: 'top 80%', once: true } });
  G.from('.visit-copy > *', { opacity: 0, y: 22, duration: 0.9, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.visit', start: 'top 78%', once: true } });

  // 7 · compass needle swings to north-north-east as the card arrives
  const needle = document.querySelector('[data-needle]');
  if (needle) G.fromTo(needle, { rotation: -70, svgOrigin: '200 200' }, { rotation: 18, svgOrigin: '200 200', duration: 2.6, ease: 'elastic.out(1,0.45)', immediateRender: true,
    scrollTrigger: { trigger: '.compass', start: 'top 80%', once: true } });

  // 8 · footer: invitation rises, the dial ruler sweeps in, the wordmark is engraved left to right
  G.from('.foot-line, .foot-cta-side > *', { opacity: 0, y: 26, duration: 1, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: '.foot', start: 'top 80%', once: true } });
  G.from('#rulerTicks line', { scaleY: 0, transformOrigin: '50% 100%', duration: 0.6, stagger: { amount: 0.9 }, ease: 'power2.out', scrollTrigger: { trigger: '.foot-ruler', start: 'top 92%', once: true } });
  const wm = document.querySelector('[data-wm-fill]');
  if (wm) G.fromTo(wm, { clipPath: AR ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 2.4, ease: 'power2.inOut', immediateRender: true,
    scrollTrigger: { trigger: '.wordmark-wrap', start: 'top 95%', once: true } });

  // keep trigger positions right once fonts and images settle
  document.fonts && document.fonts.ready.then(() => ST.refresh());
  window.addEventListener('load', () => ST.refresh());
})();
