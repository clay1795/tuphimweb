/**
 * Lightweight JSON file database.
 * Stores: devices, sessions, releases.
 * No external DB required — just JSON files on disk.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILES = {
    devices: path.join(DATA_DIR, 'devices.json'),
    sessions: path.join(DATA_DIR, 'sessions.json'),
    releases: path.join(DATA_DIR, 'releases.json'),
    settings: path.join(DATA_DIR, 'settings.json'),
};

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
// Array files
[FILES.devices, FILES.sessions, FILES.releases].forEach(f => { if (!fs.existsSync(f)) fs.writeFileSync(f, '[]', 'utf-8'); });
// Settings file (object)
if (!fs.existsSync(FILES.settings)) fs.writeFileSync(FILES.settings, JSON.stringify({
    iosGuideUrl: '',
    androidGuideUrl: ''
}, null, 2), 'utf-8');

function read(file) {
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
    catch { return []; }
}
function write(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================
// DEVICES
// ============================================================
function getDevices() { return read(FILES.devices); }

function addDevice({ udid, version, product, session, status = 'pending' }) {
    const devices = getDevices();
    const existing = devices.find(d => d.udid === udid);
    if (existing) {
        existing.lastSeen = new Date().toISOString();
        existing.status = status;
        write(FILES.devices, devices);
        return existing;
    }
    const device = {
        id: uuidv4(),
        udid,
        product: product || 'Unknown iPhone',
        iosVersion: version || 'unknown',
        session,
        status,
        certId: null,
        registeredAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
    };
    devices.push(device);
    write(FILES.devices, devices);
    return device;
}

function updateDeviceStatus(udid, status) {
    const devices = getDevices();
    const d = devices.find(d => d.udid === udid);
    if (d) { d.status = status; d.lastSeen = new Date().toISOString(); write(FILES.devices, devices); }
}

function deleteDevice(udid) {
    const devices = getDevices().filter(d => d.udid !== udid && d.id !== udid);
    write(FILES.devices, devices);
}

// ============================================================
// SESSIONS
// ============================================================
function getSessions() { return read(FILES.sessions); }

function getSession(sessionId) {
    return getSessions().find(s => s.sessionId === sessionId) || null;
}

function createSession(sessionId) {
    const sessions = getSessions();
    if (!sessions.find(s => s.sessionId === sessionId)) {
        sessions.push({
            sessionId,
            status: 'waiting_udid',
            udid: null,
            installUrl: null,
            manifestPath: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        write(FILES.sessions, sessions);
    }
}

function updateSession(sessionId, updates) {
    const sessions = getSessions();
    const s = sessions.find(s => s.sessionId === sessionId);
    if (s) { Object.assign(s, updates, { updatedAt: new Date().toISOString() }); write(FILES.sessions, sessions); }
}

// ============================================================
// RELEASES
// ============================================================
function getReleases() { return read(FILES.releases); }

function addRelease({ platform, version, fileName, filePath, fileSize, active, downloadUrl }) {
    const releases = getReleases();
    const release = {
        id: uuidv4(),
        platform,
        version,
        fileName,
        filePath,
        fileSize,
        active: !!active,
        downloadUrl,
        certUsed: 'cert_legacy.p12',
        uploadedAt: new Date().toISOString()
    };
    releases.push(release);
    write(FILES.releases, releases);
    return release;
}

function deactivateReleases(platform) {
    const releases = getReleases();
    releases.forEach(r => { if (r.platform === platform) r.active = false; });
    write(FILES.releases, releases);
}

function deleteRelease(id) {
    const releases = getReleases().filter(r => r.id !== id);
    write(FILES.releases, releases);
}

// ============================================================
// SETTINGS
// ============================================================
function getSettings() {
    try { return JSON.parse(fs.readFileSync(FILES.settings, 'utf-8')); }
    catch { return {}; }
}
function saveSettings(updates) {
    const current = getSettings();
    const merged = Object.assign(current, updates);
    fs.writeFileSync(FILES.settings, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
}

module.exports = {
    getDevices, addDevice, updateDeviceStatus, deleteDevice,
    getSessions, getSession, createSession, updateSession,
    getReleases, addRelease, deactivateReleases, deleteRelease,
    getSettings, saveSettings
};
