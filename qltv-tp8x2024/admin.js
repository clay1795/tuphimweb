// ============================================================
// TuPhim Admin Panel â€” admin.js
// Real API-connected: upload, releases list, guide settings
// ============================================================

const ADMIN_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3001/api/admin'
    : '/api/admin';

let adminToken = sessionStorage.getItem('admin_token') || '';

// ---- Auth headers ----
function authHeaders(extra = {}) {
    return { 'Authorization': 'Bearer ' + adminToken, ...extra };
}

// ---- Panel nav ----
function showPanel(id, el) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));
    document.getElementById('panel-' + id).classList.add('active');
    if (el) el.classList.add('active');
    const titles = { dashboard: 'Dashboard', releases: 'Upload & Releases', settings: 'CÃ i Ä‘áº·t' };
    document.getElementById('topbar-title').textContent = titles[id] || id;
    if (id === 'dashboard') loadDashboard();
    if (id === 'releases') loadReleases();
    if (id === 'settings') loadGuideUrls();
}

// ---- Toast ----
function showToast(msg, type = 'info') {
    let t = document.getElementById('admin-toast');
    if (!t) {
        t = document.createElement('div'); t.id = 'admin-toast';
        t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;
      background:#101828;border:1px solid rgba(255,255,255,0.1);border-radius:12px;
      padding:14px 20px;font-size:14px;color:#f1f5f9;font-family:Inter,sans-serif;
      box-shadow:0 4px 24px rgba(0,0,0,.5);min-width:240px;
      transform:translateY(80px);opacity:0;transition:all .35s cubic-bezier(.4,0,.2,1);
      display:flex;align-items:center;gap:10px`;
        document.body.appendChild(t);
    }
    const colors = { success: '#10b981', error: '#ef4444', info: '#4f8ef7', warn: '#f59e0b' };
    const icons = { success: 'âœ“', error: 'âœ—', info: 'â„¹', warn: 'âš ' };
    t.innerHTML = `<span style="color:${colors[type]};font-size:18px;font-weight:bold">${icons[type]}</span><span>${msg}</span>`;
    setTimeout(() => { t.style.transform = 'translateY(0)'; t.style.opacity = '1'; }, 10);
    clearTimeout(t._timer);
    t._timer = setTimeout(() => { t.style.transform = 'translateY(80px)'; t.style.opacity = '0'; }, 4000);
}

// ---- Logout ----
function logout() {
    sessionStorage.removeItem('admin_token');
    window.location.href = '/qltv-tp8x2024/login.html';
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
    try {
        const [statsRes, releasesRes] = await Promise.all([
            fetch(`${ADMIN_API}/stats`, { headers: authHeaders() }),
            fetch(`${ADMIN_API}/releases`, { headers: authHeaders() }),
        ]);
        // Stats
        if (statsRes.ok) {
            const s = await statsRes.json();
            setText('stat-total-releases', s.totalReleases ?? 'â€”');
            setText('stat-active-releases', s.activeReleases ?? 'â€”');
            setText('stat-latest-ver', s.latestVersion || 'â€”');
            document.getElementById('server-status').textContent = 'â— Hoáº¡t Ä‘á»™ng';
            document.getElementById('server-status').style.color = 'var(--accent-green)';
        }

        // Platform status
        if (releasesRes.ok) {
            const releases = await releasesRes.json();
            const active = r => releases.find(x => x.platform === r && x.active);
            const iosR = active('ios'), andR = active('android'), winR = active('windows');
            setStatus('psi-ios-status', iosR, iosR ? `v${iosR.version} Â· ${fmtSize(iosR.fileSize)}` : 'ChÆ°a cÃ³ IPA');
            setStatus('psi-android-status', andR, andR ? `v${andR.version} Â· ${fmtSize(andR.fileSize)}` : 'ChÆ°a cÃ³ APK');
            setStatus('psi-windows-status', winR, winR ? `v${winR.version} Â· ${fmtSize(winR.fileSize)}` : 'ChÆ°a cÃ³ EXE');

            // Last upload date
            const sorted = [...releases].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
            if (sorted[0]) {
                const d = new Date(sorted[0].uploadedAt);
                setText('stat-last-upload', d.toLocaleDateString('vi-VN'));
            } else {
                setText('stat-last-upload', 'â€”');
            }
        }
    } catch (e) {
        document.getElementById('server-status').textContent = 'â— Máº¥t káº¿t ná»‘i';
        document.getElementById('server-status').style.color = 'var(--accent-orange)';
    }
}

// ============================================================
// RELEASES TABLE
// ============================================================
async function loadReleases() {
    const tbody = document.getElementById('releases-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">Äang táº£iâ€¦</td></tr>`;
    try {
        const res = await fetch(`${ADMIN_API}/releases`, { headers: authHeaders() });
        if (!res.ok) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--accent-orange);padding:32px">Lá»—i táº£i danh sÃ¡ch</td></tr>`; return; }
        const releases = await res.json();
        if (!releases.length) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px">ChÆ°a cÃ³ release nÃ o. Upload file á»Ÿ trÃªn Ä‘á»ƒ báº¯t Ä‘áº§u.</td></tr>`;
            return;
        }
        // Sort newest first
        releases.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        tbody.innerHTML = releases.map(r => {
            const platIcons = { ios: 'ðŸŽ', android: 'ðŸ¤–', windows: 'ðŸªŸ' };
            const platLabels = { ios: 'iOS', android: 'Android', windows: 'Windows' };
            const platColors = { ios: 'badge-blue', android: 'badge-green', windows: 'badge-purple' };
            const date = new Date(r.uploadedAt).toLocaleDateString('vi-VN');
            return `<tr>
        <td><span class="badge ${platColors[r.platform]}">${platIcons[r.platform]} ${platLabels[r.platform]}</span></td>
        <td><strong>v${r.version}</strong></td>
        <td style="color:var(--text-secondary);font-size:13px">${fmtSize(r.fileSize)}</td>
        <td>${r.active ? '<span class="badge badge-green"><span class="badge-dot"></span>Live</span>' : '<span class="badge badge-gray">CÅ©</span>'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${date}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteRelease('${r.id}')">XoÃ¡</button>
        </td>
      </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--accent-orange);padding:32px">Lá»—i káº¿t ná»‘i server</td></tr>`;
    }
}

async function deleteRelease(id) {
    if (!confirm('XoÃ¡ release nÃ y?')) return;
    try {
        const res = await fetch(`${ADMIN_API}/releases/${id}`, { method: 'DELETE', headers: authHeaders() });
        if (res.ok) { showToast('ÄÃ£ xoÃ¡ release!', 'success'); loadReleases(); loadDashboard(); }
        else showToast('Lá»—i khi xoÃ¡', 'error');
    } catch { showToast('KhÃ´ng káº¿t ná»‘i Ä‘Æ°á»£c server', 'error'); }
}

// ============================================================
// FILE SELECT & UPLOAD
// ============================================================
const selectedFiles = {};

function handleFile(input, type) {
    const file = input.files[0];
    if (!file) return;
    selectedFiles[type] = file;
    const drop = document.getElementById('drop-' + type);
    if (drop) {
        drop.querySelector('.dz-text').innerHTML = `<strong>${file.name}</strong>`;
        drop.querySelector('.dz-sub').textContent = fmtSize(file.size);
        drop.style.borderColor = 'var(--accent-blue)';
        drop.style.background = 'rgba(79,142,247,0.04)';
    }
    document.getElementById('btn-upload-' + type).disabled = false;
}

function initDragDrop(type) {
    const drop = document.getElementById('drop-' + type);
    if (!drop) return;
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.style.borderColor = 'var(--accent-blue)'; });
    drop.addEventListener('dragleave', () => drop.style.borderColor = '');
    drop.addEventListener('drop', e => {
        e.preventDefault(); drop.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file) {
            const input = document.getElementById('file-' + type);
            const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
            handleFile(input, type);
        }
    });
}

async function uploadFile(type) {
    const file = selectedFiles[type];
    if (!file) return showToast('Chá»n file trÆ°á»›c!', 'warn');
    const verInput = document.getElementById('ver-' + type);
    const version = verInput?.value?.trim() || '1.0.0';
    const setActive = document.getElementById('active-' + type)?.checked;

    const ext = file.name.split('.').pop().toLowerCase();
    const validMap = { ipa: ['ipa'], apk: ['apk'], win: ['exe', 'msix'] };
    if (!validMap[type]?.includes(ext)) return showToast(`File khÃ´ng há»£p lá»‡ (.${ext})`, 'error');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('setActive', setActive ? 'true' : 'false');

    // Show progress
    const prog = document.getElementById('prog-' + type);
    const progFill = document.getElementById('prog-' + type + '-fill');
    const progPct = document.getElementById('prog-' + type + '-pct');
    const progName = document.getElementById('prog-' + type + '-name');
    if (prog) { prog.style.display = 'block'; progName.textContent = file.name; }

    const btn = document.getElementById('btn-upload-' + type);
    btn.disabled = true; btn.textContent = 'Äang uploadâ€¦';

    try {
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${ADMIN_API}/upload`);
            xhr.setRequestHeader('Authorization', 'Bearer ' + adminToken);
            xhr.upload.onprogress = e => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    if (progFill) progFill.style.width = pct + '%';
                    if (progPct) progPct.textContent = pct + '%';
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
                else reject(new Error(JSON.parse(xhr.responseText)?.error || 'Upload tháº¥t báº¡i'));
            };
            xhr.onerror = () => reject(new Error('Lá»—i máº¡ng'));
            xhr.send(formData);
        });
        showToast(`Upload thÃ nh cÃ´ng! v${version}`, 'success');
        if (prog) { progFill.style.width = '100%'; progPct.textContent = '100%'; }
        // Reset
        selectedFiles[type] = null;
        const input = document.getElementById('file-' + type);
        if (input) input.value = '';
        const drop = document.getElementById('drop-' + type);
        if (drop) {
            drop.style.borderColor = ''; drop.style.background = '';
            drop.querySelector('.dz-text').innerHTML = `KÃ©o tháº£ file <strong>.${validMap[type][0]}</strong> vÃ o Ä‘Ã¢y`;
            drop.querySelector('.dz-sub').textContent = 'hoáº·c báº¥m Ä‘á»ƒ chá»n file';
        }
        setTimeout(() => { if (prog) prog.style.display = 'none'; }, 1500);
        loadReleases(); loadDashboard();
    } catch (e) {
        showToast(e.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = { ipa: 'Upload IPA', apk: 'Upload APK', win: 'Upload EXE' }[type];
}

// ============================================================
// GUIDE URL SETTINGS
// ============================================================
async function loadGuideUrls() {
    try {
        const res = await fetch(`${ADMIN_API}/settings`, { headers: authHeaders() });
        if (!res.ok) return;
        const d = await res.json();
        const ios = document.getElementById('input-ios-guide');
        const and = document.getElementById('input-android-guide');
        if (ios) ios.value = d.iosGuideUrl || '';
        if (and) and.value = d.androidGuideUrl || '';
    } catch { }
}

async function saveGuideUrls() {
    const iosUrl = document.getElementById('input-ios-guide')?.value?.trim() || '';
    const androidUrl = document.getElementById('input-android-guide')?.value?.trim() || '';
    try {
        const res = await fetch(`${ADMIN_API}/settings`, {
            method: 'PUT',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ iosGuideUrl: iosUrl, androidGuideUrl: androidUrl })
        });
        if (res.ok) showToast('ÄÃ£ lÆ°u cÃ i Ä‘áº·t!', 'success');
        else showToast('Lá»—i khi lÆ°u', 'error');
    } catch { showToast('KhÃ´ng káº¿t ná»‘i Ä‘Æ°á»£c server', 'error'); }
}

// ============================================================
// MISC UTILS
// ============================================================
function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
function fmtSize(bytes) {
    if (!bytes) return 'â€”';
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? mb.toFixed(1) + ' MB' : (bytes / 1024).toFixed(0) + ' KB';
}
function setStatus(id, release, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = label;
    el.style.color = release ? 'var(--accent-green)' : 'var(--text-muted)';
}
function refreshData() {
    const active = document.querySelector('.panel.active')?.id?.replace('panel-', '');
    if (active === 'dashboard') loadDashboard();
    if (active === 'releases') loadReleases();
    if (active === 'settings') loadGuideUrls();
    showToast('ÄÃ£ lÃ m má»›i dá»¯ liá»‡u', 'info');
}

// ---- Clock ----
function updateClock() {
    const el = document.getElementById('topbar-clock');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
    }
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    showPanel('dashboard', document.querySelector('.sidebar-item'));
    initDragDrop('ipa'); initDragDrop('apk'); initDragDrop('win');
    updateClock(); setInterval(updateClock, 30000);
    loadDashboard();
});

