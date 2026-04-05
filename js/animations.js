/* =========================================================
   animations.js — Scroll reveals, counters, hero canvas,
                   testimonials carousel, page transitions
   ========================================================= */

/* ── Hero Canvas: floating book pages ───────────────────── */
export function initHeroCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class BookPage {
    constructor() { this.reset(true); }

    reset(initial = false) {
      this.x      = Math.random() * canvas.width;
      this.y      = initial ? Math.random() * canvas.height : -30;
      this.w      = 9 + Math.random() * 14;
      this.h      = this.w * 1.35;
      this.rot    = (Math.random() - 0.5) * 0.8;
      this.dRot   = (Math.random() - 0.5) * 0.012;
      this.vy     = 0.4 + Math.random() * 1.1;
      this.vx     = (Math.random() - 0.5) * 0.4;
      this.alpha  = 0.08 + Math.random() * 0.18;
    }

    update() {
      this.y   += this.vy;
      this.x   += this.vx;
      this.rot += this.dRot;
      if (this.y > canvas.height + 30) this.reset();
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.globalAlpha = this.alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth   = 0.9;

      // Page outline
      ctx.beginPath();
      ctx.moveTo(-this.w / 2, -this.h / 2);
      ctx.lineTo( this.w / 2 - 3, -this.h / 2);
      ctx.lineTo( this.w / 2,     -this.h / 2 + 3);
      ctx.lineTo( this.w / 2,      this.h / 2);
      ctx.lineTo(-this.w / 2,      this.h / 2);
      ctx.closePath();
      ctx.stroke();

      // Dog-ear corner
      ctx.beginPath();
      ctx.moveTo(this.w / 2 - 3, -this.h / 2);
      ctx.lineTo(this.w / 2 - 3, -this.h / 2 + 3);
      ctx.lineTo(this.w / 2,     -this.h / 2 + 3);
      ctx.stroke();

      // Text lines
      for (let i = 0; i < 4; i++) {
        const lineY = -this.h / 2 + 5 + i * (this.h - 10) / 4;
        const lineW = (0.5 + Math.random() * 0.4) * (this.w - 6);
        ctx.beginPath();
        ctx.moveTo(-this.w / 2 + 3, lineY);
        ctx.lineTo(-this.w / 2 + 3 + lineW, lineY);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  const pages = Array.from({ length: 40 }, () => new BookPage());

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pages.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
  loop();
}

/* ── Scroll Reveal ───────────────────────────────────────── */
export function initScrollReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => io.observe(el));
}

/* ── Animated Counters ───────────────────────────────────── */
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animateCount(el) {
  const target   = parseFloat(el.dataset.target);
  const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
  const suffix   = el.dataset.suffix || '';
  const duration = 1600;
  const start    = performance.now();

  function tick(now) {
    const t     = Math.min((now - start) / duration, 1);
    const value = easeOutCubic(t) * target;
    el.textContent = value.toFixed(decimals).replace('.', ',') + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => io.observe(el));
}

/* ── Testimonials Carousel ───────────────────────────────── */
export function initCarousel() {
  const track  = document.querySelector('.carousel-track');
  const slides = document.querySelectorAll('.testimonial-card');
  const prev   = document.getElementById('carousel-prev');
  const next   = document.getElementById('carousel-next');
  const dots   = document.querySelectorAll('.carousel-dot');
  if (!track || !slides.length) return;

  let current   = 0;
  let autoTimer = null;

  function goTo(idx) {
    current = (idx + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function startAuto() {
    autoTimer = setInterval(() => goTo(current + 1), 10000);
  }
  function stopAuto() { clearInterval(autoTimer); }

  prev?.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
  next?.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });
  dots.forEach((d, i) => d.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); }));

  // Touch swipe
  let touchX = 0;
  track.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { stopAuto(); goTo(dx < 0 ? current + 1 : current - 1); startAuto(); }
  });

  goTo(0);
  startAuto();
}

/* ── Sticky Nav ─────────────────────────────────────────── */
export function initNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('nav-scrolled', window.scrollY > 60);
  }, { passive: true });

  // Smooth anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = nav.offsetHeight + 16;
        window.scrollTo({ top: target.offsetTop - offset, behavior: 'smooth' });
      }
    });
  });

  // Mobile menu toggle
  const burger  = document.getElementById('nav-burger');
  const mobileMenu = document.getElementById('mobile-menu');
  burger?.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  mobileMenu?.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => mobileMenu.classList.remove('open'))
  );
}

/* ── Page Transition ─────────────────────────────────────── */
export function initPageTransition() {
  document.body.classList.add('page-loaded');
  document.querySelectorAll('a:not([href^="#"]):not([target])').forEach(a => {
    if (a.hostname === location.hostname) {
      a.addEventListener('click', e => {
        e.preventDefault();
        const href = a.href;
        document.body.classList.add('page-leaving');
        setTimeout(() => { window.location.href = href; }, 280);
      });
    }
  });
}

/* ── Progress Bar (scroll) ────────────────────────────────── */
export function initProgressBar() {
  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    bar.style.width = Math.min(pct * 100, 100) + '%';
  }, { passive: true });
}
