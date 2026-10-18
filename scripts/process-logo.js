const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:/Users/USER/.gemini/antigravity/brain/63a1d2d9-c290-4f45-a100-3e662fb82d7d/school_system_logo_icon_1792310561739.jpg';
const outDir = path.join(__dirname, '..', 'public', 'images');

async function processLogo() {
  const maskSvg = Buffer.from(
    '<svg width="256" height="256"><rect x="0" y="0" width="256" height="256" rx="54" ry="54" fill="#ffffff"/></svg>'
  );

  // 1. Transparent squircle app logo
  await sharp(src)
    .extract({ left: 155, top: 155, width: 714, height: 714 })
    .resize(256, 256)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toFile(path.join(outDir, 'app-logo.png'));

  fs.copyFileSync(path.join(outDir, 'app-logo.png'), path.join(__dirname, '..', 'public', 'app-logo.png'));
  fs.copyFileSync(path.join(outDir, 'app-logo.png'), path.join(outDir, 'logo.png'));
  fs.copyFileSync(path.join(outDir, 'app-logo.png'), path.join(__dirname, '..', 'public', 'logo.png'));

  // 2. Favicon icon (32x32 and 64x64)
  await sharp(path.join(outDir, 'app-logo.png'))
    .resize(64, 64)
    .png()
    .toFile(path.join(outDir, 'favicon-64.png'));

  console.log('Successfully created app-logo.png with transparent squircle corners');
}

processLogo().catch(console.error);
