// ============================================================
// TuPhim Admin Panel — admin.js (qltv-tp8x2024)
// ============================================================

const ADMIN_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api/admin'
    : '/api/admin';

let adminToken = sessionStorage.getItem('admin_token') || '';

function authHeaders(extra = {}) {
    return { 'Authorization': 'Bearer ' + adminToken, ...extra };
}

// ---- Panel nav ----
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    const panel = document.getElementById('panel-' + id);
    if (panel) panel.classList.add('active');
    if (el) el.classList.add('active');
    const titles = { dashboard: 'Dashboard', releases: 'Upload & Releases', settings: 'Cai dat' };
    const titleEl = document.getElementById('topbar-title');
    if (titleEl) titleEl.textContent = titles[id] || id;
    if (id === 'dashboard') loadDashboard();
    if (id === 'releases') loadReleases();
    if (id === 'settings') loadGuideUrls();
}

// ---- Toast ----
function showToast(msg, type) {
    type = type || 'info';
    let t = document.getElementById('admin-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'admin-toast';
        t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#101828;border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:14px 20px;font-size:14px;color:#f1f5f9;font-family:Inter,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:240px;transform:translateY(80px);opacity:0;transition:all .35s cubic-bezier(.4,0,.2,1);display:flex;align-items:center;gap:10px';
        document.body.appendChild(t);
    }
    const colors = { success: '#10b981', error: '#ef4444', info: '#4f8ef7', warn: '#f59e0b' };
    const icons = { success: 'OK', error: 'X', info: 'i', warn: '!' };
    t.innerHTML = '<span style="color:' + (colors[type] || '#4f8ef7') + ';font-size:18px;font-weight:bold">' + (icons[type] || 'i') + '</span><span>' + msg + '</span>';
    setTimeout(function () { t.style.transform = 'translateY(0)'; t.style.opacity = '1'; }, 10);
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.style.transform = 'translateY(80px)'; t.style.opacity = '0'; }, 4000);
}

// ---- Logout ----
function logout() {
    sessionStorage.removeItem('admin_token');
    window.location.href = '/qltv-tp8x2024/login.html';
}

// ============================================================
// DASHBOARD
// ============================================================
function loadDashboard() {
    Promise.all([
        fetch(ADMIN_API + '/stats', { headers: authHeaders() }),
        fetch(ADMIN_API + '/releases', { headers: authHeaders() }),
    ]).then(function (results) {
        var statsRes = results[0];
        var releasesRes = results[1];

        if (statsRes.ok) {
            statsRes.json().then(function (s) {
                setText('stat-total-releases', s.totalReleases !== undefined ? String(s.totalReleases) : 'N/A');
                setText('stat-active-releases', s.activeReleases !== undefined ? String(s.activeReleases) : 'N/A');
                setText('stat-latest-ver', s.latestVersion || 'N/A');
                var ss = document.getElementById('server-status');
                if (ss) { ss.textContent = 'Hoat dong'; ss.style.color = 'var(--accent-green)'; }
            });
        }

        if (releasesRes.ok) {
            releasesRes.json().then(function (releases) {
                function active(p) { return releases.find(function (x) { return x.platform === p && x.active; }); }
                var iosR = active('ios'), andR = active('android'), winR = active('windows');
                setStatus('psi-ios-status', iosR, iosR ? 'v' + iosR.version + ' - ' + fmtSize(iosR.fileSize) : 'Chua co IPA');
                setStatus('psi-android-status', andR, andR ? 'v' + andR.version + ' - ' + fmtSize(andR.fileSize) : 'Chua co APK');
                setStatus('psi-windows-status', winR, winR ? 'v' + winR.version + ' - ' + fmtSize(winR.fileSize) : 'Chua co EXE');
                var sorted = releases.slice().sort(function (a, b) { return new Date(b.uploadedAt) - new Date(a.uploadedAt); });
                if (sorted[0]) setText('stat-last-upload', new Date(sorted[0].uploadedAt).toLocaleDateString('vi-VN'));
                else setText('stat-last-upload', 'N/A');
            });
        }
    }).catch(function () {
        var ss = document.getElementById('server-status');
        if (ss) { ss.textContent = 'Mat ket noi'; ss.style.color = 'var(--accent-orange)'; }
    });
}

// ============================================================
// RELEASES TABLE
// ============================================================
function loadReleases() {
    var tbody = document.getElementById('releases-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">Dang tai...</td></tr>';
    fetch(ADMIN_API + '/releases', { headers: authHeaders() })
        .then(function (res) {
            if (!res.ok) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--accent-orange);padding:32px">Loi tai danh sach</td></tr>'; return; }
            res.json().then(function (releases) {
                if (!releases.length) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">Chua co release nao.</td></tr>';
                    return;
                }
                releases.sort(function (a, b) { return new Date(b.uploadedAt) - new Date(a.uploadedAt); });
                var platLabels = { ios: 'iOS', android: 'Android', windows: 'Windows' };
                var platCls = { ios: 'badge-blue', android: 'badge-green', windows: 'badge-purple' };
                tbody.innerHTML = releases.map(function (r) {
                    var date = new Date(r.uploadedAt).toLocaleDateString('vi-VN');
                    return '<tr>' +
                        '<td><span class="badge ' + (platCls[r.platform] || '') + '">' + (platLabels[r.platform] || r.platform) + '</span></td>' +
                        '<td><strong>v' + r.version + '</strong></td>' +
                        '<td style="color:var(--text-secondary);font-size:13px">' + fmtSize(r.fileSize) + '</td>' +
                        '<td>' + (r.active ? '<span class="badge badge-green"><span class="badge-dot"></span>Live</span>' : '<span class="badge badge-gray">Cu</span>') + '</td>' +
                        '<td style="font-size:12px;color:var(--text-secondary)">' + date + '</td>' +
                        '<td><button class="btn btn-sm btn-danger" onclick="deleteRelease(\'' + r.id + '\')">Xoa</button></td>' +
                        '</tr>';
                }).join('');
            });
        })
        .catch(function () {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--accent-orange);padding:32px">Loi ket noi server</td></tr>';
        });
}

function deleteRelease(id) {
    if (!confirm('Xoa release nay?')) return;
    fetch(ADMIN_API + '/releases/' + id, { method: 'DELETE', headers: authHeaders() })
        .then(function (res) {
            if (res.ok) { showToast('Da xoa release!', 'success'); loadReleases(); loadDashboard(); }
            else showToast('Loi khi xoa', 'error');
        })
        .catch(function () { showToast('Khong ket noi duoc server', 'error'); });
}

// ============================================================
// FILE SELECT & UPLOAD
// ============================================================
var selectedFiles = {};

function handleFile(input, type) {
    var file = input.files[0];
    if (!file) return;
    selectedFiles[type] = file;
    var drop = document.getElementById('drop-' + type);
    if (drop) {
        drop.querySelector('.dz-text').innerHTML = '<strong>' + file.name + '</strong>';
        drop.querySelector('.dz-sub').textContent = fmtSize(file.size);
        drop.style.borderColor = 'var(--accent-blue)';
    }
    var btn = document.getElementById('btn-upload-' + type);
    if (btn) btn.disabled = false;
}

function initDragDrop(type) {
    var drop = document.getElementById('drop-' + type);
    if (!drop) return;
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.style.borderColor = 'var(--accent-blue)'; });
    drop.addEventListener('dragleave', function () { drop.style.borderColor = ''; });
    drop.addEventListener('drop', function (e) {
        e.preventDefault(); drop.style.borderColor = '';
        var file = e.dataTransfer.files[0];
        if (file) {
            var input = document.getElementById('file-' + type);
            try { var dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; } catch (e2) { }
            selectedFiles[type] = file;
            drop.querySelector('.dz-text').innerHTML = '<strong>' + file.name + '</strong>';
            drop.querySelector('.dz-sub').textContent = fmtSize(file.size);
            drop.style.borderColor = 'var(--accent-blue)';
            var btn = document.getElementById('btn-upload-' + type);
            if (btn) btn.disabled = false;
        }
    });
}

var BTN_LABELS = { ipa: 'Upload IPA', apk: 'Upload APK', win: 'Upload EXE' };
var VALID_EXTS = { ipa: ['ipa'], apk: ['apk'], win: ['exe', 'msix'] };

function uploadFile(type) {
    var file = selectedFiles[type];
    if (!file) { showToast('Chon file truoc!', 'warn'); return; }
    var verInput = document.getElementById('ver-' + type);
    var version = verInput && verInput.value.trim() ? verInput.value.trim() : '1.0.0';
    var setActive = document.getElementById('active-' + type) ? document.getElementById('active-' + type).checked : true;

    var ext = file.name.split('.').pop().toLowerCase();
    if (VALID_EXTS[type].indexOf(ext) === -1) { showToast('File khong hop le (.' + ext + ')', 'error'); return; }

    var formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('setActive', setActive ? 'true' : 'false');

    var prog = document.getElementById('prog-' + type);
    var progFill = document.getElementById('prog-' + type + '-fill');
    var progPct = document.getElementById('prog-' + type + '-pct');
    var progName = document.getElementById('prog-' + type + '-name');
    if (prog) { prog.style.display = 'block'; if (progName) progName.textContent = file.name; }

    var btn = document.getElementById('btn-upload-' + type);
    if (btn) { btn.disabled = true; btn.textContent = 'Dang upload...'; }

    var xhr = new XMLHttpRequest();
    xhr.open('POST', ADMIN_API + '/upload');
    xhr.setRequestHeader('Authorization', 'Bearer ' + adminToken);
    xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
            var pct = Math.round((e.loaded / e.total) * 100);
            if (progFill) progFill.style.width = pct + '%';
            if (progPct) progPct.textContent = pct + '%';
        }
    };
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            showToast('Upload thanh cong! v' + version, 'success');
            selectedFiles[type] = null;
            var input = document.getElementById('file-' + type);
            if (input) input.value = '';
            var drop = document.getElementById('drop-' + type);
            if (drop) {
                drop.style.borderColor = '';
                drop.querySelector('.dz-text').innerHTML = 'Keo tha file <strong>.' + VALID_EXTS[type][0] + '</strong> vao day';
                drop.querySelector('.dz-sub').textContent = 'hoac bam de chon file';
            }
            setTimeout(function () { if (prog) prog.style.display = 'none'; }, 1500);
            loadReleases(); loadDashboard();
        } else {
            try { showToast(JSON.parse(xhr.responseText).error || 'Upload that bai', 'error'); }
            catch (e) { showToast('Upload that bai', 'error'); }
        }
        if (btn) { btn.disabled = false; btn.textContent = BTN_LABELS[type]; }
    };
    xhr.onerror = function () {
        showToast('Loi mang', 'error');
        if (btn) { btn.disabled = false; btn.textContent = BTN_LABELS[type]; }
    };
    xhr.send(formData);
}

// ============================================================
// GUIDE URL SETTINGS
// ============================================================
function loadGuideUrls() {
    fetch(ADMIN_API + '/settings', { headers: authHeaders() })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (d) {
            if (!d) return;
            var ios = document.getElementById('input-ios-guide');
            var and = document.getElementById('input-android-guide');
            if (ios) ios.value = d.iosGuideUrl || '';
            if (and) and.value = d.androidGuideUrl || '';
        })
        .catch(function () { });
}

function saveGuideUrls() {
    var iosUrl = (document.getElementById('input-ios-guide') || {}).value || '';
    var androidUrl = (document.getElementById('input-android-guide') || {}).value || '';
    fetch(ADMIN_API + '/settings', {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ iosGuideUrl: iosUrl.trim(), androidGuideUrl: androidUrl.trim() })
    }).then(function (res) {
        if (res.ok) showToast('Da luu cai dat!', 'success');
        else showToast('Loi khi luu', 'error');
    }).catch(function () { showToast('Khong ket noi duoc server', 'error'); });
}

// ============================================================
// UTILS
// ============================================================
function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
function fmtSize(bytes) {
    if (!bytes) return 'N/A';
    var mb = bytes / 1024 / 1024;
    return mb >= 1 ? mb.toFixed(1) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
}
function setStatus(id, release, label) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = label;
    el.style.color = release ? 'var(--accent-green)' : 'var(--text-muted)';
}
function refreshData() {
    var active = document.querySelector('.panel.active');
    var id = active ? active.id.replace('panel-', '') : 'dashboard';
    if (id === 'dashboard') loadDashboard();
    if (id === 'releases') loadReleases();
    if (id === 'settings') loadGuideUrls();
    showToast('Da lam moi du lieu', 'info');
}
function updateClock() {
    var el = document.getElementById('topbar-clock');
    if (el) el.textContent = new Date().toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    showPanel('dashboard', document.querySelector('.sidebar-item'));
    initDragDrop('ipa'); initDragDrop('apk'); initDragDrop('win');
    updateClock(); setInterval(updateClock, 30000);
    loadDashboard();
});
