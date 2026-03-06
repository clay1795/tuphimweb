// ============================================================
// Admin Panel JS
// ============================================================

// --- TAB NAVIGATION ---
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    document.getElementById('panel-' + id).classList.add('active');
    if (el) el.classList.add('active');

    // Update topbar title
    const titles = {
        dashboard: '📊 Dashboard',
        devices: '📱 Quản lý thiết bị (UDID)',
        certs: '🔐 Chứng chỉ & Profiles',
        releases: '📦 Releases & Upload',
        analytics: '📈 Analytics',
        settings: '⚙️ Cài đặt hệ thống',
    };
    document.getElementById('topbar-title').textContent = titles[id] || id;
}

// --- UPLOAD AREA DRAG & DROP ---
function initUploadArea(areaId, inputId) {
    const area = document.getElementById(areaId);
    const input = document.getElementById(inputId);
    if (!area || !input) return;

    area.addEventListener('click', () => input.click());
    area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = 'var(--accent-blue)'; });
    area.addEventListener('dragleave', () => area.style.borderColor = '');
    area.addEventListener('drop', e => {
        e.preventDefault();
        area.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file, areaId);
    });
    input.addEventListener('change', () => {
        if (input.files[0]) handleFileSelect(input.files[0], areaId);
    });
}

function handleFileSelect(file, areaId) {
    const area = document.getElementById(areaId);
    if (area) {
        area.querySelector('h3').textContent = file.name;
        area.querySelector('p').textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
        area.style.borderColor = 'var(--accent-green)';
        area.style.background = 'rgba(16,185,129,0.04)';
    }
    // Show progress simulation
    const progressId = areaId.replace('area', 'progress');
    const progressEl = document.getElementById(progressId);
    if (progressEl) {
        progressEl.classList.add('show');
        let pct = 0;
        const fill = progressEl.querySelector('.progress-bar-fill');
        const tim = setInterval(() => {
            pct += Math.random() * 8;
            if (pct >= 100) { pct = 100; clearInterval(tim); showToast('✅', file.name + ' đã upload thành công!'); }
            if (fill) fill.style.width = pct + '%';
        }, 120);
    }
}

// --- TOAST ---
function showToast(icon, message, duration = 3500) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.className = 'toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2000;background:#0d1022;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:10px;box-shadow:0 4px 24px rgba(0,0,0,0.4);min-width:260px;transform:translateY(80px);opacity:0;transition:all .4s cubic-bezier(.4,0,.2,1);font-size:14px;font-family:Inter,sans-serif;color:#f1f5f9;';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size:20px">${icon}</span><span>${message}</span>`;
    setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 10);
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.transform = 'translateY(80px)'; toast.style.opacity = '0'; }, duration);
}

// --- SIGN IPA (DEMO) ---
function signIPA(certId) {
    showToast('🔄', `Đang ký IPA bằng ${certId}…`);
    setTimeout(() => showToast('✅', 'IPA đã ký thành công! Manifest đã cập nhật.'), 3000);
}

// --- DELETE DEVICE ---
function deleteDevice(udid) {
    if (confirm(`Xoá thiết bị ${udid}?`)) {
        const row = document.querySelector(`[data-udid="${udid}"]`);
        if (row) { row.style.opacity = '0'; row.style.transform = 'translateX(20px)'; setTimeout(() => row.remove(), 300); }
        showToast('🗑️', 'Đã xoá thiết bị khỏi danh sách.');
    }
}

// --- REVOKE CERT ---
function revokeCert(certId) { showToast('⚠️', `Chứng chỉ ${certId} đã bị thu hồi. Cần ký lại tất cả IPA.`); }
function renewCert(certId) { showToast('🔄', `Đang gia hạn chứng chỉ ${certId}…`); setTimeout(() => showToast('✅', 'Chứng chỉ đã được gia hạn!'), 2000); }

// --- ANIMATE BARS ---
function animateBars() {
    document.querySelectorAll('.bar[data-height]').forEach(bar => {
        setTimeout(() => { bar.style.height = bar.dataset.height + '%'; }, Math.random() * 300);
    });
    document.querySelectorAll('.ring-fill[data-pct]').forEach(ring => {
        const r = 38; const circ = 2 * Math.PI * r;
        const pct = parseInt(ring.dataset.pct);
        ring.setAttribute('stroke-dasharray', circ);
        ring.setAttribute('stroke-dashoffset', circ - (pct / 100) * circ);
    });
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    showPanel('dashboard', document.querySelector('.sidebar-item'));
    initUploadArea('upload-area-ipa', 'upload-input-ipa');
    initUploadArea('upload-area-provision', 'upload-input-provision');
    animateBars();

    // Animate stat counters
    document.querySelectorAll('[data-count]').forEach(el => {
        const target = parseInt(el.dataset.count);
        let c = 0; const step = target / 35;
        const t = setInterval(() => {
            c += step; if (c >= target) { c = target; clearInterval(t); }
            el.textContent = Math.floor(c).toLocaleString('vi-VN');
        }, 25);
    });

    // Simulate live installs counter
    const liveEl = document.getElementById('live-installs');
    if (liveEl) {
        setInterval(() => {
            const v = parseInt(liveEl.textContent.replace(/\D/g, '')) + Math.floor(Math.random() * 3);
            liveEl.textContent = v.toLocaleString('vi-VN');
        }, 4000);
    }
});
