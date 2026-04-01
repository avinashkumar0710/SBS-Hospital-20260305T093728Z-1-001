/* =============================================
   SBS HOSPITAL - main.js
   Navigation | Animations | Gallery | Forms
   ============================================= */
'use strict';

const navbar = document.getElementById('navbar');
const hamburger = document.querySelector('.hamburger');
const mobileNav = document.querySelector('.mobile-nav');
const scrollTopBtn = document.getElementById('scrollTop');

function setMobileNavState(open) {
  if (!hamburger || !mobileNav) return;
  if (!mobileNav.id) mobileNav.id = 'mobileNav';
  hamburger.setAttribute('aria-controls', mobileNav.id);
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  mobileNav.setAttribute('aria-hidden', open ? 'false' : 'true');
  hamburger.classList.toggle('active', open);
  mobileNav.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

if (hamburger && mobileNav) {
  setMobileNavState(false);
  hamburger.addEventListener('click', () => {
    setMobileNavState(!hamburger.classList.contains('active'));
  });

  mobileNav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => setMobileNavState(false));
  });

  document.addEventListener('click', (e) => {
    if (!navbar || !mobileNav.classList.contains('open')) return;
    if (!navbar.contains(e.target) && !mobileNav.contains(e.target)) {
      setMobileNavState(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      setMobileNavState(false);
    }
  });
}

window.addEventListener('scroll', () => {
  if (navbar) {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }
  if (scrollTopBtn) {
    scrollTopBtn.classList.toggle('shown', window.scrollY > 400);
  }
});

if (scrollTopBtn) {
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-nav a[href]').forEach((a) => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .stagger').forEach((el) => io.observe(el));
}

function animateCounter(el, target, suffix = '', duration = 1800) {
  const decimals = Number.isInteger(target) ? 0 : (target.toString().split('.')[1] || '').length;
  let startTime = null;

  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = eased * target;
    el.textContent = `${decimals ? value.toFixed(decimals) : Math.floor(value)}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.textContent = `${target}${suffix}`;
    }
  };

  requestAnimationFrame(step);
}

if ('IntersectionObserver' in window) {
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number.parseFloat(el.dataset.count);
      if (!Number.isFinite(target)) return;
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-num[data-count]').forEach((el) => counterIO.observe(el));
}

const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbCaption = document.getElementById('lbCaption');
const lbClose = document.getElementById('lbClose');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');
let lbItems = [];
let lbIndex = 0;

function openLightbox(items, index) {
  if (!lightbox) return;
  lbItems = items;
  lbIndex = index;
  showLbSlide(lbIndex);
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

function showLbSlide(index) {
  if (!lbItems.length) return;
  lbIndex = (index + lbItems.length) % lbItems.length;
  if (lbImg) {
    lbImg.src = lbItems[lbIndex].src;
    lbImg.alt = lbItems[lbIndex].caption;
  }
  if (lbCaption) {
    lbCaption.textContent = lbItems[lbIndex].caption;
  }
}

if (lightbox) {
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbPrev) lbPrev.addEventListener('click', () => showLbSlide(lbIndex - 1));
  if (lbNext) lbNext.addEventListener('click', () => showLbSlide(lbIndex + 1));

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showLbSlide(lbIndex - 1);
    if (e.key === 'ArrowRight') showLbSlide(lbIndex + 1);
  });
}

function initGallery() {
  const itemEls = Array.from(document.querySelectorAll('.gallery-item[data-src]'));
  if (!itemEls.length) return;

  const items = itemEls.map((el) => ({
    src: el.dataset.src,
    caption: el.dataset.caption || '',
  }));

  itemEls.forEach((el, i) => {
    const openItem = () => openLightbox(items, i);
    el.addEventListener('click', openItem);
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      openItem();
    });
  });
}

function initFilter() {
  const btns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.gallery-item[data-cat]');
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      cards.forEach((card) => {
        card.style.display = cat === 'all' || card.dataset.cat === cat ? '' : 'none';
      });
    });
  });
}

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

function initForm() {
  const form = document.getElementById('appointmentForm');
  if (!form) return;

  const formError = document.getElementById('formError');
  const submitBtn = form.querySelector('[type="submit"]');
  const submitBtnText = submitBtn ? submitBtn.textContent.trim() : 'Submit';
  const todayLocal = getLocalDateString();

  const rules = {
    name: { required: true, minLen: 2, msg: 'Please enter your full name (min. 2 characters).' },
    phone: { required: true, pattern: /^[6-9]\d{9}$/, msg: 'Enter a valid 10-digit Indian mobile number.' },
    email: { required: false, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Enter a valid email address.' },
    dept: { required: true, msg: 'Please select a department.' },
    date: { required: true, msg: 'Please select a preferred date.' },
    message: { required: false },
  };

  function validate(name, value) {
    const rule = rules[name];
    const trimmed = value.trim();
    if (!rule) return '';

    const valueForPattern = name === 'phone' ? normalizeIndianPhone(value) : trimmed;

    if (rule.required && !trimmed) return rule.msg;
    if (trimmed && rule.minLen && trimmed.length < rule.minLen) return rule.msg;
    if (valueForPattern && rule.pattern && !rule.pattern.test(valueForPattern)) return rule.msg;
    if (name === 'date' && trimmed && trimmed < todayLocal) {
      return 'Preferred date cannot be in the past.';
    }
    return '';
  }

  function showErr(name, msg) {
    const el = form.querySelector(`[name="${name}"]`);
    const err = form.querySelector(`#err_${name}`);
    if (!el) return;
    el.classList.toggle('error', Boolean(msg));
    if (err) {
      err.textContent = msg;
      err.classList.toggle('show', Boolean(msg));
    }
  }

  function showFormError(message) {
    if (!formError) return;
    formError.textContent = message || '';
    formError.classList.toggle('show', Boolean(message));
  }

  Object.keys(rules).forEach((name) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (!el) return;
    el.addEventListener('blur', () => {
      showErr(name, validate(name, el.value));
    });
    el.addEventListener('input', () => {
      if (el.classList.contains('error')) {
        showErr(name, validate(name, el.value));
      }
    });
  });

  const dateEl = form.querySelector('[name="date"]');
  if (dateEl) dateEl.min = todayLocal;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showFormError('');

    let valid = true;
    Object.keys(rules).forEach((name) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (!el) return;
      const err = validate(name, el.value);
      showErr(name, err);
      if (err) valid = false;
    });
    if (!valid) return;

    const payload = {
      name: form.name.value.trim(),
      phone: normalizeIndianPhone(form.phone.value),
      email: form.email.value.trim(),
      dept: form.dept.value.trim(),
      date: form.date.value.trim(),
      message: form.message.value.trim(),
    };

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((data && data.message) || 'Unable to submit appointment right now.');
      }

      form.style.display = 'none';
      const ok = document.getElementById('formSuccess');
      if (ok) ok.classList.add('show');
    } catch (err) {
      const fallback = 'Submission failed. Please try again or call 7000925884.';
      const message = err instanceof Error ? err.message : fallback;
      showFormError(message || fallback);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtnText;
      }
    }
  });
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const selector = a.getAttribute('href');
    if (!selector || selector.length < 2) return;
    const target = document.querySelector(selector);
    if (!target) return;
    e.preventDefault();
    const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 76;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

function initCurrentYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-current-year]').forEach((el) => {
    el.textContent = year;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCurrentYear();
  initGallery();
  initFilter();
  initForm();
  window.dispatchEvent(new Event('scroll'));
});


