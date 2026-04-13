const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

function createSvg(size, bgType) {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const eyeSpread = size * 0.14;
  const eyeRx = size * 0.12;
  const eyeRy = size * 0.155;
  const pupilR = size * 0.065;
  const sparkleR = size * 0.024;
  const lpx = cx - eyeSpread + size * 0.02;
  const lpy = cy + size * 0.015;
  const rpx = cx + eyeSpread + size * 0.02;
  const rpy = cy + size * 0.015;
  const smileY = cy + size * 0.2;
  const smileW = size * 0.06;
  const sw = Math.max(2, size * 0.022);

  const bg = bgType === 'gradient'
    ? `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#5B4BC7"/><stop offset="100%" stop-color="#7E6EE8"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#bg)"/>`
    : `<rect width="${size}" height="${size}" fill="#6C5CE7"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg}
    <ellipse cx="${cx - size*0.08}" cy="${cy - size*0.1}" rx="${size*0.25}" ry="${size*0.15}" fill="rgba(255,255,255,0.06)"/>
    <ellipse cx="${cx - eyeSpread}" cy="${cy}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
    <ellipse cx="${cx + eyeSpread}" cy="${cy}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
    <circle cx="${lpx}" cy="${lpy}" r="${pupilR}" fill="#1A1A18"/>
    <circle cx="${rpx}" cy="${rpy}" r="${pupilR}" fill="#1A1A18"/>
    <circle cx="${lpx + size*0.02}" cy="${lpy - size*0.03}" r="${sparkleR}" fill="white"/>
    <circle cx="${rpx + size*0.02}" cy="${rpy - size*0.03}" r="${sparkleR}" fill="white"/>
    <path d="M${cx - smileW},${smileY} Q${cx},${smileY + smileW * 1.2} ${cx + smileW},${smileY}" fill="none" stroke="#1A1A18" stroke-width="${sw}" stroke-linecap="round"/>
  </svg>`;
}

async function generate() {
  // icon.png — 1024x1024, gradient bg
  await sharp(Buffer.from(createSvg(1024, 'gradient')))
    .png()
    .toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ icon.png (1024×1024)');

  // splash-icon.png — 512x512, solid purple bg
  await sharp(Buffer.from(createSvg(512, 'solid')))
    .png()
    .toFile(path.join(assetsDir, 'splash-icon.png'));
  console.log('✓ splash-icon.png (512×512)');

  // favicon.png — 48x48, gradient bg
  await sharp(Buffer.from(createSvg(48, 'gradient')))
    .png()
    .toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ favicon.png (48×48)');

  console.log('\nAll icons generated in assets/');
}

generate().catch(console.error);
