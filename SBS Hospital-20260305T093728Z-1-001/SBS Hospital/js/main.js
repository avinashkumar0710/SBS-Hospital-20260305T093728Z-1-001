/* =============================================
   SBS HOSPITAL — main.js
   Navigation · Animations · Gallery · Forms
   ============================================= */
'use strict';

// ── Navbar ─────────────────────────────────────
const navbar   = document.getElementById('navbar');
const hamburger = document.querySelector('.hamburger');
const mobileNav = document.querySelector('.mobile-nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
  scrollTopBtn && (scrollTopBtn.classList.toggle('shown', window.scrollY > 400));
});

if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('active');
    mobileNav.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  // Close on link click
  mobileNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
  // Close on outside click
  document.addEventListener('click', e => {
    if (!navbar.contains(e.target) && !mobileNav.contains(e.target)) {
      hamburger.classList.remove('active');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

// Mark active nav link
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-nav a[href]').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});

// ── Scroll-to-top ────────────────────────────
const scrollTopBtn = document.getElementById('scrollTop');
if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── Intersection Observer (animations) ───────
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .stagger').forEach(el => io.observe(el));

// ── Animated Counter ─────────────────────────
function animateCounter(el, target, suffix = '', duration = 1800) {
  let start = 0, startTime = null;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counterIO = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    animateCounter(el, target, suffix);
    counterIO.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num[data-count]').forEach(el => counterIO.observe(el));

// ── Lightbox ─────────────────────────────────
const lightbox     = document.getElementById('lightbox');
const lbImg        = document.getElementById('lbImg');
const lbCaption    = document.getElementById('lbCaption');
const lbClose      = document.getElementById('lbClose');
const lbPrev       = document.getElementById('lbPrev');
const lbNext       = document.getElementById('lbNext');
let   lbItems      = [];
let   lbIndex      = 0;

function openLightbox(items, index) {
  lbItems = items; lbIndex = index;
  showLbSlide(lbIndex);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox && lightbox.classList.remove('open');
  document.body.style.overflow = '';
}
function showLbSlide(i) {
  if (!lbItems.length) return;
  lbIndex = (i + lbItems.length) % lbItems.length;
  if (lbImg) { lbImg.src = lbItems[lbIndex].src; lbImg.alt = lbItems[lbIndex].caption; }
  if (lbCaption) lbCaption.textContent = lbItems[lbIndex].caption;
}

if (lightbox) {
  lbClose && lbClose.addEventListener('click', closeLightbox);
  lbPrev  && lbPrev.addEventListener('click',  () => showLbSlide(lbIndex - 1));
  lbNext  && lbNext.addEventListener('click',  () => showLbSlide(lbIndex + 1));
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape')     closeLightbox();
    if (e.key === 'ArrowLeft')  showLbSlide(lbIndex - 1);
    if (e.key === 'ArrowRight') showLbSlide(lbIndex + 1);
  });
}

// Attach lightbox to gallery items
function initGallery() {
  const items = [];
  document.querySelectorAll('.gallery-item[data-src]').forEach(el => {
    items.push({ src: el.dataset.src, caption: el.dataset.caption || '' });
  });
  document.querySelectorAll('.gallery-item[data-src]').forEach((el, i) => {
    el.addEventListener('click', () => openLightbox(items, i));
  });
}

// ── Gallery Filter ────────────────────────────
function initFilter() {
  const btns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.gallery-item[data-cat]');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      cards.forEach(c => {
        c.style.display = (cat === 'all' || c.dataset.cat === cat) ? '' : 'none';
      });
    });
  });
}

// ── Appointment Form Validation ───────────────
function initForm() {
  const form = document.getElementById('appointmentForm');
  if (!form) return;

  const rules = {
    name:    { required: true, minLen: 2, msg: 'Please enter your full name (min. 2 characters).' },
    phone:   { required: true, pattern: /^[6-9]\d{9}$/, msg: 'Enter a valid 10-digit Indian mobile number.' },
    email:   { required: false, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Enter a valid email address.' },
    dept:    { required: true, msg: 'Please select a department.' },
    date:    { required: true, msg: 'Please select a preferred date.' },
    message: { required: false },
  };

  function validate(name, value) {
    const r = rules[name]; if (!r) return '';
    if (r.required && !value.trim()) return r.msg;
    if (value.trim() && r.minLen && value.trim().length < r.minLen) return r.msg;
    if (value.trim() && r.pattern && !r.pattern.test(value.trim())) return r.msg;
    return '';
  }

  function showErr(name, msg) {
    const el = form.querySelector(`[name="${name}"]`);
    const em = form.querySelector(`#err_${name}`);
    if (!el) return;
    el.classList.toggle('error', !!msg);
    if (em) { em.textContent = msg; em.classList.toggle('show', !!msg); }
  }

  // Real-time validation on blur
  Object.keys(rules).forEach(name => {
    const el = form.querySelector(`[name="${name}"]`);
    if (!el) return;
    el.addEventListener('blur', () => showErr(name, validate(name, el.value)));
    el.addEventListener('input', () => { if (el.classList.contains('error')) showErr(name, validate(name, el.value)); });
  });

  // Prevent future date restriction for appointment (must be today+)
  const dateEl = form.querySelector('[name="date"]');
  if (dateEl) { dateEl.min = new Date().toISOString().split('T')[0]; }

  form.addEventListener('submit', e => {
    e.preventDefault();
    let valid = true;
    Object.keys(rules).forEach(name => {
      const el = form.querySelector(`[name="${name}"]`);
      if (!el) return;
      const err = validate(name, el.value);
      showErr(name, err);
      if (err) valid = false;
    });
    if (!valid) return;

    // Sanitize & show success
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Submitting…';
    setTimeout(() => {
      form.style.display = 'none';
      const ok = document.getElementById('formSuccess');
      if (ok) ok.classList.add('show');
    }, 1200);
  });
}

// ── Smooth scroll for anchor links ───────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 76);
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  initFilter();
  initForm();
  // Trigger scroll once to apply initial navbar state
  window.dispatchEvent(new Event('scroll'));
});
