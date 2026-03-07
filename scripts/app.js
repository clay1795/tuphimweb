// ============================================================
// TuPhim Distribution Web — app.js
// ============================================================

const APP = {
  version: '2.1.0',
  iosGuideUrl: '',
  androidGuideUrl: '',
  apiBase: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api'
    : '/api',
};

// ============================================================
// SVG ICON HELPERS
// ============================================================
const ICONS = {
  download: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  apple: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,
  android: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.34l1.43 2.484a.693.693 0 1 1-1.205.695l-1.447-2.511A8.5 8.5 0 0 1 12 16.5a8.5 8.5 0 0 1-4.3-1.492L6.252 17.52a.693.693 0 1 1-1.205-.695l1.43-2.484A8.466 8.466 0 0 1 3.5 8H20.5a8.466 8.466 0 0 1-2.977 7.34zM9 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm6 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM7.5 5.196l-1.5-2.6a.5.5 0 0 1 .866-.5l1.539 2.666A8.496 8.496 0 0 1 12 4c1.27 0 2.476.278 3.562.775L17.1 2.109a.5.5 0 0 1 .866.5L16.5 5.196A8.479 8.479 0 0 1 20.5 8H3.5a8.48 8.48 0 0 1 4-2.804z"/></svg>`,
  windows: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/></svg>`,
  disk: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
};

// ============================================================
// MODAL CONTROLLER
// ============================================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
}
function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, duration = 3500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `${ICONS.download}<span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ============================================================
// MOBILE MENU
// ============================================================
function closeMobileMenu() {
  document.getElementById('mobile-menu')?.classList.remove('open');
}

// ============================================================
// DEVICE DETECTION → smart hero button
// ============================================================
function detectDevice() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  return 'desktop';
}

// ============================================================
// WINDOWS DOWNLOAD
// ============================================================
function startWindowsDownload() {
  showToast('Đang tải TuPhim cho Windows…');
  window.location.href = `${APP.apiBase}/download/windows`;
}

// ============================================================
// FETCH APP INFO
// ============================================================
async function fetchAppInfo() {
  try {
    const res = await fetch(`${APP.apiBase}/info`);
    if (!res.ok) return;
    const data = await res.json();

    if (data.version) {
      APP.version = data.version;
      ['hero-ver', 'hero-version-label'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'v' + data.version;
      });
      const iosVer = document.getElementById('ios-modal-version');
      if (iosVer) iosVer.textContent = `iOS 14.0+ · v${data.version}`;
      const andVer = document.getElementById('android-modal-version');
      if (andVer) andVer.textContent = `Android 8.0+ · v${data.version}`;
    }

    if (data.updatedAt) {
      const dateEl = document.getElementById('hero-date');
      if (dateEl) dateEl.textContent = new Date(data.updatedAt).toLocaleDateString('vi-VN');
    }

    const iosGuideBtn = document.getElementById('btn-ios-guide');
    if (iosGuideBtn) {
      if (data.iosGuideUrl) { iosGuideBtn.href = data.iosGuideUrl; APP.iosGuideUrl = data.iosGuideUrl; }
      else iosGuideBtn.style.display = 'none';
    }

    const andGuideBtn = document.getElementById('btn-android-guide');
    if (andGuideBtn) {
      if (data.androidGuideUrl) { andGuideBtn.href = data.androidGuideUrl; APP.androidGuideUrl = data.androidGuideUrl; }
      else andGuideBtn.style.display = 'none';
    }

    if (!data.hasIPA) {
      const btn = document.getElementById('btn-ios-download');
      if (btn) { btn.href = '#'; btn.innerHTML = `${ICONS.disk} Sắp có — chưa có IPA`; btn.style.opacity = '.55'; btn.style.pointerEvents = 'none'; }
    }
    if (!data.hasAPK) {
      const btn = document.getElementById('btn-android-download');
      if (btn) { btn.href = '#'; btn.innerHTML = `${ICONS.disk} Sắp có — chưa có APK`; btn.style.opacity = '.55'; btn.style.pointerEvents = 'none'; }
    }
  } catch (e) {
    console.warn('[TuPhim] Could not fetch app info:', e.message);
  }
}

// ============================================================
// FAQ ACCORDION
// ============================================================
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ============================================================
// COUNTER ANIMATION
// ============================================================
function animateCounters() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.animated) return;
      el.dataset.animated = '1';
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = target / 55;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = Math.floor(current).toLocaleString('vi-VN') + suffix;
      }, 22);
      obs.unobserve(el);
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('[data-count]').forEach(el => obs.observe(el));
}

// ============================================================
// SCROLL REVEAL ANIMATIONS
// ============================================================
function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  // Add reveal-item class to animatable elements
  const selectors = [
    '.platform-card',
    '.feature-card',
    '.faq-item',
    '.section-header',
    '.stats-bar',
    '.hero-badge',
    '.hero-app-icon',
    '.hero-title',
    '.hero-sub',
    '.hero-meta',
    '.hero-actions',
    '.hero-platforms',
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal-item');
      // Stagger delay for grids
      if (el.classList.contains('platform-card') || el.classList.contains('feature-card') || el.classList.contains('faq-item')) {
        el.style.transitionDelay = `${i * 80}ms`;
      }
      obs.observe(el);
    });
  });
}

// ============================================================
// NAVBAR SCROLL EFFECT
// ============================================================
function initNavbarScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }, { passive: true });
}

// ============================================================
// MOBILE MENU
// ============================================================
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => menu.classList.toggle('open'));
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove('open');
    }
  });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Smart hero button — SVG icons, no emoji
  const device = detectDevice();
  const mainBtn = document.getElementById('btn-main-download');
  const navBtn = document.getElementById('btn-nav-download');

  const btnConfig = {
    ios: { svg: ICONS.apple, label: 'Tải cho iPhone', cls: 'btn-ios', action: () => openModal('modal-ios') },
    android: { svg: ICONS.android, label: 'Tải APK Android', cls: 'btn-android', action: () => openModal('modal-android') },
    windows: { svg: ICONS.windows, label: 'Tải cho Windows', cls: 'btn-windows', action: startWindowsDownload },
    desktop: { svg: ICONS.download, label: 'Tải ứng dụng', cls: 'btn-primary', action: () => openModal('modal-platforms') },
  };
  const cfg = btnConfig[device] || btnConfig.desktop;

  if (mainBtn) {
    mainBtn.innerHTML = `${cfg.svg} ${cfg.label}`;
    mainBtn.className = `btn btn-lg ${cfg.cls}`;
    mainBtn.addEventListener('click', cfg.action);
  }
  if (navBtn) navBtn.addEventListener('click', cfg.action);

  // Modals
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeAllModals(); });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllModals(); });

  // Features
  initFAQ();
  animateCounters();
  initScrollReveal();
  initNavbarScroll();
  initMobileMenu();
  fetchAppInfo();
});
