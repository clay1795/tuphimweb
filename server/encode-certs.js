// Run: node encode-certs.js
// Encodes certificate files as base64 and outputs them for Render.com env vars

const fs = require('fs');
const path = require('path');

const files = [
    { name: 'CERT_P12_BASE64', path: '../../TuPhim-Ophim-Backup/certificate/cert_legacy.p12' },
    { name: 'PROVISION_BASE64', path: '../../TuPhim-Ophim-Backup/certificate/cert.mobileprovision' },
];

console.log('\n=== BASE64 ENCODED CERTS FOR RENDER.COM ===');
console.log('Copy các giá trị này vào Environment Variables trên Render.com\n');

files.forEach(({ name, path: filePath }) => {
    const absPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(absPath)) {
        console.error(`❌ ${name}: File not found: ${absPath}`);
        return;
    }
    const b64 = fs.readFileSync(absPath).toString('base64');
    const outFile = path.join(__dirname, `${name}.txt`);
    fs.writeFileSync(outFile, b64, 'utf8');
    console.log(`✅ ${name}: ${b64.length} chars — saved to server/${name}.txt`);
    console.log(`   (Mở file và copy toàn bộ nội dung vào Render env var "${name}")\n`);
});
