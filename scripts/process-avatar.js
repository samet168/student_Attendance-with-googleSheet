const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const src = 'C:/Users/USER/.gemini/antigravity/brain/63a1d2d9-c290-4f45-a100-3e662fb82d7d/.user_uploaded/media_1792308542622_b634482a.png';
const outDir = path.join(__dirname, '..', 'public', 'images');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function processImages() {
  // 1. Head crop: centered horizontally (212), top: 10, width: 290, height: 290
  // This nicely captures the cute robot head with its cyan ears and chin
  const cropWidth = 290;
  const cropHeight = 290;
  const left = Math.round((424 - cropWidth) / 2); // 67
  const top = 10;

  // Circular mask with subtle smooth anti-aliased edge
  const circleMask = Buffer.from(
    '<svg width="256" height="256"><circle cx="128" cy="128" r="126" fill="#fff"/></svg>'
  );

  // Circular border ring (glowing cyan / teal gradient outline)
  const ringSvg = Buffer.from(
    `<svg width="256" height="256">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.9"/>
        </linearGradient>
      </defs>
      <circle cx="128" cy="128" r="125" fill="none" stroke="url(#grad)" stroke-width="5"/>
    </svg>`
  );

  // Create circular masked avatar with glossy ring
  await sharp(src)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(256, 256)
    .composite([
      { input: circleMask, blend: 'dest-in' },
      { input: ringSvg, blend: 'over' }
    ])
    .png()
    .toFile(path.join(outDir, 'ai-bot.png'));

  // Also write to public/ai-bot.png
  fs.copyFileSync(path.join(outDir, 'ai-bot.png'), path.join(__dirname, '..', 'public', 'ai-bot.png'));

  // Create square head portrait
  await sharp(src)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(256, 256)
    .png()
    .toFile(path.join(outDir, 'ai-bot-head.png'));

  // Create full body version
  await sharp(src)
    .resize(320, 320)
    .png()
    .toFile(path.join(outDir, 'ai-bot-full.png'));

  console.log('Successfully generated ai-bot.png (circular avatar with ring), ai-bot-head.png, and ai-bot-full.png');
}

processImages().catch(console.error);
