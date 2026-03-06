const { execSync, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * Sign an IPA file using zsign (Linux) or fall back to mock mode.
 * Uses cert_legacy.p12 with password from .env
 */
async function signIPA({ ipaPath, udid, session, outputDir }) {
    return new Promise((resolve) => {
        const certPath = path.resolve(process.env.CERT_PATH || '../certificate/cert_legacy.p12');
        const certPassword = process.env.CERT_PASSWORD || '1';
        const provisionPath = path.resolve(process.env.PROVISION_PATH || '../certificate/cert.mobileprovision');
        const domain = process.env.APP_DOMAIN || 'https://tuphim.online';

        // Check required files
        if (!fs.existsSync(certPath)) {
            return resolve({ success: false, error: `Certificate file not found: ${certPath}` });
        }
        if (!fs.existsSync(ipaPath)) {
            return resolve({ success: false, error: `IPA file not found: ${ipaPath}` });
        }

        // Output signed IPA path
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const outputFileName = `signed-${session}-${Date.now()}.ipa`;
        const outputPath = path.join(outputDir, outputFileName);

        // Try zsign (requires zsign installed on Linux server)
        const zsignCmd = `zsign -k "${certPath}" -p "${certPassword}" -m "${provisionPath}" -o "${outputPath}" -z 9 "${ipaPath}"`;

        exec(zsignCmd, { timeout: 120000 }, (err, stdout, stderr) => {
            if (err) {
                console.error('[ZSIGN ERROR]', stderr || err.message);

                // Try isign as fallback
                const isignCmd = `isign -c "${certPath}" -p "${certPassword}" -m "${provisionPath}" -o "${outputPath}" "${ipaPath}"`;
                exec(isignCmd, { timeout: 120000 }, (err2, stdout2, stderr2) => {
                    if (err2) {
                        console.error('[ISIGN ERROR]', stderr2 || err2.message);

                        // MOCK MODE: Copy original IPA as "signed" for development/testing
                        console.warn('[SIGNING] Fallback to mock mode — copying original IPA');
                        try {
                            fs.copyFileSync(ipaPath, outputPath);
                            const signedUrl = `${domain}/api/download/ipa/${outputFileName}`;
                            return resolve({ success: true, signedPath: outputPath, signedUrl, mock: true });
                        } catch (copyErr) {
                            return resolve({ success: false, error: `Không thể ký IPA: ${copyErr.message}` });
                        }
                    }
                    const signedUrl = `${domain}/api/download/ipa/${outputFileName}`;
                    console.log(`[ISIGN] Signed: ${outputPath}`);
                    resolve({ success: true, signedPath: outputPath, signedUrl });
                });
                return;
            }
            const signedUrl = `${domain}/api/download/ipa/${outputFileName}`;
            console.log(`[ZSIGN] Signed: ${outputPath}`);
            resolve({ success: true, signedPath: outputPath, signedUrl });
        });
    });
}

module.exports = { signIPA };
