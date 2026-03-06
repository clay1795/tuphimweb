const plist = require('plist');
const path = require('path');
const fs = require('fs');

/**
 * Generate a manifest.plist for OTA iOS install.
 * The manifest tells iOS where to download the IPA and what app info it contains.
 */
async function generate({ session, ipaUrl, bundleId, version, appName }) {
    const domain = process.env.APP_DOMAIN || 'https://tuphim.online';
    const manifestDir = path.join(process.env.STORAGE_PATH || './storage', 'manifests');
    if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });

    const manifestData = {
        items: [
            {
                assets: [
                    {
                        kind: 'software-package',
                        url: ipaUrl
                    },
                    {
                        kind: 'display-image',
                        url: `${domain}/assets/logo.png`,
                        'needs-shine': false
                    },
                    {
                        kind: 'full-size-image',
                        url: `${domain}/assets/logo.png`,
                        'needs-shine': false
                    }
                ],
                metadata: {
                    'bundle-identifier': bundleId || 'com.tophim.app',
                    'bundle-version': version || '2.1.0',
                    kind: 'software',
                    title: appName || 'TuPhim'
                }
            }
        ]
    };

    const plistXML = plist.build(manifestData);
    const manifestPath = path.join(manifestDir, `${session}.plist`);
    fs.writeFileSync(manifestPath, plistXML, 'utf-8');

    console.log(`[MANIFEST] Generated: ${manifestPath}`);
    return manifestPath;
}

module.exports = { generate };
