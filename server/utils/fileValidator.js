// ============================================================
// File Upload Security — Magic Byte Validator
// Validates actual file content, not just extension
// ============================================================

/**
 * Magic byte signatures for allowed file types
 * IPA = ZIP (PK header)
 * APK = ZIP (PK header)
 * EXE = MZ header
 * MSIX = ZIP (PK header)
 */
const MAGIC_BYTES = {
    ipa: { bytes: [0x50, 0x4B, 0x03, 0x04], ext: ['ipa'] },
    apk: { bytes: [0x50, 0x4B, 0x03, 0x04], ext: ['apk'] },
    exe: { bytes: [0x4D, 0x5A], ext: ['exe'] },
    msix: { bytes: [0x50, 0x4B, 0x03, 0x04], ext: ['msix'] },
};

/**
 * Check file content matches expected magic bytes
 * @param {string} filePath - path to the uploaded file
 * @param {string} platform - 'ios' | 'android' | 'windows'
 * @returns {boolean}
 */
const fs = require('fs');

function validateMagicBytes(filePath, platform) {
    try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);

        if (platform === 'ios' || platform === 'android') {
            // ZIP: PK\x03\x04
            return buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04;
        }
        if (platform === 'windows') {
            const ext = filePath.split('.').pop().toLowerCase();
            if (ext === 'exe') {
                // MZ header
                return buf[0] === 0x4D && buf[1] === 0x5A;
            }
            if (ext === 'msix') {
                // ZIP/MSIX: PK\x03\x04
                return buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04;
            }
        }
        return false;
    } catch (err) {
        console.error('[SECURITY] Magic byte check failed:', err.message);
        return false;
    }
}

/**
 * Validate uploaded filename is safe — no path traversal
 * @param {string} filename
 * @returns {boolean}
 */
function isSafeFilename(filename) {
    if (!filename) return false;
    // No path separators, no null bytes, no double dots
    if (/[/\\]/.test(filename)) return false;
    if (/\.\./.test(filename)) return false;
    if (/\0/.test(filename)) return false;
    // Only allow safe characters
    if (!/^[\w\-. ]+$/.test(filename)) return false;
    return true;
}

/**
 * Validate version string
 * @param {string} version
 * @returns {boolean}
 */
function isValidVersion(version) {
    return /^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/.test(version);
}

module.exports = { validateMagicBytes, isSafeFilename, isValidVersion };
