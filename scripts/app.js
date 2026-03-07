// ============================================================
// TuPhim Distribution Web — app.js
// Simplified: direct IPA/APK download + install guide links
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
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.classList.remove('active');
  });
  document.body.style.overflow = '';
}

// ============================================================
// TOAST
// ============================================================
function showToast(icon, message, duration = 3500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
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
  showToast('💾', 'Đang tải TuPhim cho Windows…');
  window.location.href = `${APP.apiBase}/download/windows`;
}

// ============================================================
// FETCH APP INFO (version, guide URLs) from server
// ============================================================
async function fetchAppInfo() {
  try {
    const res = await fetch(`${APP.apiBase}/info`);
    if (!res.ok) return;
    const data = await res.json();

    // Update version badges
    if (data.version) {
      APP.version = data.version;
      const els = ['hero-ver', 'hero-version-label'];
      els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'v' + data.version;
      });
      const iosVer = document.getElementById('ios-modal-version');
      if (iosVer) iosVer.textContent = `iOS 14.0+ · v${data.version}`;
      const andVer = document.getElementById('android-modal-version');
      if (andVer) andVer.textContent = `Android 8.0+ · v${data.version}`;
    }

    // Update date
    if (data.updatedAt) {
      const dateEl = document.getElementById('hero-date');
      if (dateEl) {
        const d = new Date(data.updatedAt);
        dateEl.textContent = d.toLocaleDateString('vi-VN');
      }
    }

    // iOS guide link
    if (data.iosGuideUrl) {
      APP.iosGuideUrl = data.iosGuideUrl;
      const btn = document.getElementById('btn-ios-guide');
      if (btn) btn.href = data.iosGuideUrl;
    } else {
      // Hide guide button if no URL configured
      const btn = document.getElementById('btn-ios-guide');
      if (btn) btn.style.display = 'none';
    }

    // Android guide link
    if (data.androidGuideUrl) {
      APP.androidGuideUrl = data.androidGuideUrl;
      const btn = document.getElementById('btn-android-guide');
      if (btn) btn.href = data.androidGuideUrl;
    } else {
      const btn = document.getElementById('btn-android-guide');
      if (btn) btn.style.display = 'none';
    }

    // Disable iOS download button if no IPA uploaded
    if (!data.hasIPA) {
      const btn = document.getElementById('btn-ios-download');
      if (btn) {
        btn.href = '#';
        btn.innerHTML = '<span>⏳</span> Sắp có — chưa có IPA';
        btn.style.opacity = '.55';
        btn.style.pointerEvents = 'none';
      }
    }

    // Disable Android download button if no APK uploaded
    if (!data.hasAPK) {
      const btn = document.getElementById('btn-android-download');
      if (btn) {
        btn.href = '#';
        btn.innerHTML = '<span>⏳</span> Sắp có — chưa có APK';
        btn.style.opacity = '.55';
        btn.style.pointerEvents = 'none';
      }
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
      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      // Toggle current
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ============================================================
// STATS COUNTER ANIMATION
// ============================================================
function animateCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (el.dataset.animated) return;
      el.dataset.animated = '1';
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      let current = 0;
      const step = target / 50;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(timer); }
        el.textContent = Math.floor(current).toLocaleString('vi-VN') + suffix;
      }, 25);
      observer.unobserve(el);
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Smart hero button
  const device = detectDevice();
  const mainBtn = document.getElementById('btn-main-download');
  const navBtn = document.getElementById('btn-nav-download');

  const btnConfig = {
    ios:     { icon: '🍎', label: 'Tải cho iPhone',  cls: 'btn-ios',     action: () => openModal('modal-ios') },
    android: { icon: '🤖', label: 'Tải APK Android', cls: 'btn-android',  action: () => openModal('modal-android') },
    windows: { icon: '🪟', label: 'Tải cho Windows', cls: 'btn-windows',  action: startWindowsDownload },
    desktop: { icon: '⬇️', label: 'Tải ứng dụng',   cls: 'btn-primary',  action: () => openModal('modal-platforms') },
  };
  const cfg = btnConfig[device] || btnConfig.desktop;

  if (mainBtn) {
    mainBtn.innerHTML = `<span>${cfg.icon}</span> ${cfg.label}`;
    mainBtn.className = `btn btn-lg ${cfg.cls}`;
    mainBtn.addEventListener('click', cfg.action);
  }
  if (navBtn) {
    navBtn.addEventListener('click', cfg.action);
  }

  // Modal overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
  });

  // FAQ
  initFAQ();

  // Counters
  animateCounters();

  // Fetch live data
  fetchAppInfo();
});
