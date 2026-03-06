// ============================================================
// TuPhim Distribution Web — app.js (Production)
// ============================================================

const APP = {
    name: 'TuPhim',
    version: '2.1.0',
    // Production API — change to your domain
    apiBase: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001/api'
        : '/api',
    sessionToken: null,
    pollInterval: null,
};

// ============================================================
// DEVICE DETECTION
// ============================================================
function detectDevice() {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    const isWindows = /Windows/.test(ua) && !isIOS && !isAndroid;

    document.body.classList.remove('device-ios', 'device-android', 'device-windows', 'device-desktop');
    if (isIOS) { document.body.classList.add('device-ios'); return 'ios'; }
    if (isAndroid) { document.body.classList.add('device-android'); return 'android'; }
    if (isWindows) { document.body.classList.add('device-windows'); return 'windows'; }
    document.body.classList.add('device-desktop');
    return 'desktop';
}

// ============================================================
// MODAL CONTROLLER
// ============================================================
const Modal = {
    open(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.add('active'); document.body.style.overflow = 'hidden'; }
    },
    close(id) {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('active'); document.body.style.overflow = ''; }
    },
    closeAll() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
        document.body.style.overflow = '';
    }
};

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
// CHECK IF RETURNING FROM UDID REGISTRATION
// ============================================================
function checkReturnSession() {
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (!session) return;

    APP.sessionToken = session;
    const statusSection = document.getElementById('install-status-section');
    if (statusSection) statusSection.style.display = 'block';

    // Scroll to status
    setTimeout(() => statusSection?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 500);

    // Start polling
    iOSFlow._pollStatus(session);
}

// ============================================================
// IOS INSTALL FLOW
// ============================================================
const iOSFlow = {
    currentStep: 0,

    start() {
        APP.sessionToken = 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        Modal.open('modal-ios');
        this.setStep(1);
    },

    setStep(step) {
        this.currentStep = step;
        document.querySelectorAll('#modal-ios .step').forEach((s, i) => {
            s.classList.toggle('active', i + 1 === step);
            s.classList.toggle('done', i + 1 < step);
        });
        const pct = Math.round(((step - 1) / 4) * 100);
        const fill = document.querySelector('#modal-ios .progress-fill');
        if (fill) fill.style.width = pct + '%';
    },

    downloadProfile() {
        const profileUrl = `${APP.apiBase}/udid/profile?session=${APP.sessionToken}`;
        showToast('📲', 'Đang tải profile đăng ký UDID…');

        // On local/demo mode simulate the flow
        if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
            this._demoMode();
            return;
        }

        // Real: redirect to profile download (iOS will install it)
        window.location.href = profileUrl;
        this.setStep(2);

        // Poll status (user has to come back to the page)
        this._pollStatus(APP.sessionToken);
    },

    _demoMode() {
        this.setStep(2);
        const btn = document.getElementById('btn-download-profile');
        if (btn) btn.disabled = true;
        const area = document.getElementById('ios-profile-btn-area');
        if (area) area.style.display = 'none';
        showToast('🔧', 'Demo mode: Simulating UDID registration…');
        setTimeout(() => this.setStep(3), 1500);
        setTimeout(() => { this.setStep(4); document.querySelector('#modal-ios .signing-status').style.display = 'flex'; }, 3000);
        setTimeout(() => this._showInstallReady('itms-services://demo'), 6500);
    },

    _pollStatus(session) {
        let attempts = 0;
        APP.pollInterval = setInterval(async () => {
            attempts++;
            if (attempts > 72) { clearInterval(APP.pollInterval); this._updateStatusSection('timeout'); return; }
            try {
                const res = await fetch(`${APP.apiBase}/udid/status?session=${session}`);
                const data = await res.json();

                if (data.status === 'udid_received' || data.status === 'signing') {
                    this.setStep(3);
                    this._updateStatusSection('signing');
                }
                if (data.status === 'signed' && data.installUrl) {
                    clearInterval(APP.pollInterval);
                    this.setStep(4);
                    this._showInstallReady(data.installUrl);
                    this._updateStatusSection('ready', data.installUrl);
                }
                if (data.status === 'sign_error' || data.status === 'no_ipa') {
                    clearInterval(APP.pollInterval);
                    this._updateStatusSection('error', null, data.error || 'Lỗi không xác định');
                }
            } catch (e) { /* keep polling */ }
        }, 5000);
    },

    _updateStatusSection(state, installUrl, error) {
        const section = document.getElementById('install-status-section');
        const icon = document.getElementById('status-icon');
        const title = document.getElementById('status-title');
        const desc = document.getElementById('status-desc');
        const prog = document.getElementById('status-progress');
        if (!section) return;
        section.style.display = 'block';

        if (state === 'signing') {
            icon.textContent = '⚙️'; title.textContent = 'Đang ký IPA…'; desc.textContent = 'Máy chủ đang xử lý. Vui lòng giữ trang này mở.';
        } else if (state === 'ready') {
            icon.textContent = '✅'; title.textContent = 'IPA sẵn sàng!'; prog.style.width = '100%';
            desc.innerHTML = `<a href="${installUrl}" class="btn btn-ios" style="display:inline-flex;margin-top:12px;text-decoration:none"><span>📲</span> Cài ngay trên iPhone</a>`;
        } else if (state === 'error') {
            icon.textContent = '❌'; title.textContent = 'Lỗi ký IPA'; desc.textContent = error || 'Vui lòng liên hệ admin.';
        } else if (state === 'timeout') {
            icon.textContent = '⏰'; title.textContent = 'Hết thời gian'; desc.textContent = 'Thử tải lại trang và thực hiện lại.';
        }
    },

    _showInstallReady(installUrl) {
        document.getElementById('ios-steps').style.display = 'none';
        const ready = document.getElementById('ios-install-ready');
        if (ready) { ready.style.display = 'block'; }
        const btn = document.getElementById('btn-install-now');
        if (btn && installUrl !== 'itms-services://demo') btn.href = installUrl;
        document.querySelector('#modal-ios .progress-fill').style.width = '100%';
        document.getElementById('ios-profile-btn-area').style.display = 'none';
        document.querySelector('#modal-ios .signing-status').style.display = 'none';
        showToast('✅', 'IPA đã ký xong! Bấm "Cài ngay" để cài app.', 6000);
    }
};

// ============================================================
// ANDROID & WINDOWS
// ============================================================
function startAndroidInstall() {
    showToast('📥', 'Đang tải APK…');
    window.location.href = `${APP.apiBase}/download/apk`;
}
function startWindowsInstall() {
    showToast('💾', 'Đang tải TuPhim cho Windows…');
    window.location.href = `${APP.apiBase}/download/windows`;
}

// ============================================================
// SMART INSTALL BUTTON
// ============================================================
function handleMainInstall() {
    const device = detectDevice();
    if (device === 'ios') { iOSFlow.start(); }
    else if (device === 'android') { startAndroidInstall(); }
    else { Modal.open('modal-platforms'); }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const device = detectDevice();

    // Check if returning from UDID registration
    checkReturnSession();

    // Modal close handlers
    document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => Modal.closeAll());
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) { Modal.closeAll(); if (APP.pollInterval) clearInterval(APP.pollInterval); }
        });
    });

    document.getElementById('btn-main-install')?.addEventListener('click', handleMainInstall);
    document.getElementById('btn-download-profile')?.addEventListener('click', () => iOSFlow.downloadProfile());
    document.getElementById('btn-ios-install')?.addEventListener('click', () => { Modal.close('modal-platforms'); iOSFlow.start(); });
    document.getElementById('btn-android-install')?.addEventListener('click', () => { Modal.close('modal-platforms'); startAndroidInstall(); });
    document.getElementById('btn-windows-install')?.addEventListener('click', () => { Modal.close('modal-platforms'); startWindowsInstall(); });

    // Update install button based on device
    const map = {
        ios: { icon: '🍎', label: 'Cài đặt cho iPhone', cls: 'btn-ios' },
        android: { icon: '🤖', label: 'Tải APK Android', cls: 'btn-android' },
        windows: { icon: '🪟', label: 'Tải cho Windows', cls: 'btn-windows' },
        desktop: { icon: '⬇️', label: 'Tải ứng dụng', cls: 'btn-primary' },
    };
    const cfg = map[device] || map.desktop;
    const mainBtn = document.getElementById('btn-main-install');
    if (mainBtn) {
        mainBtn.innerHTML = `<span>${cfg.icon}</span> ${cfg.label}`;
        mainBtn.className = `btn btn-lg ${cfg.cls}`;
    }

    // Animate stats counters
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        let current = 0;
        const step = target / 40;
        const timer = setInterval(() => {
            current += step; if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = Math.floor(current).toLocaleString('vi-VN') + suffix;
        }, 30);
    });
});
