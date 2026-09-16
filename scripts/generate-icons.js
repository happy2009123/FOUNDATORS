// Icon Generation Script
// Run: node scripts/generate-icons.js
// Requires: npm install sharp --save-dev

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.join(__dirname, '..', 'public', 'icon.svg');
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

const SIZES = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512, 1024];

async function generate() {
  console.log('Generating PNG icons from icon.svg...\n');

  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const size of SIZES) {
    const filename = size === 1024 ? 'icon.png' : `icon-${size}.png`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`  ✓ ${filename} (${size}x${size})`);
  }

  // Generate splash screen (1080x1920 with logo centered)
  const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="#020202"/>
    <g transform="translate(540, 960) scale(1.5)">
      <rect x="-170" y="-170" width="340" height="340" rx="64" fill="#020202"/>
      <path d="M-110 -140 H110 L50 -60 H-50 V30 H90 L30 110 H-50 V192 H-110 Z" fill="#D9AC3D"/>
      <path d="M40 90 l16 32 32 16 -32 16 -16 32 -16-32 -32-16 32-16Z" fill="#D9AC3D"/>
    </g>
    <text x="540" y="1200" text-anchor="middle" fill="#D9AC3D" font-family="system-ui" font-size="48" font-weight="900" letter-spacing="0.1em">FOUNDATORS</text>
  </svg>`;

  const splashPath = path.join(OUTPUT_DIR, 'splash.png');
  await sharp(Buffer.from(splashSvg))
    .resize(1080, 1920)
    .png()
    .toFile(splashPath);

  console.log(`  ✓ splash.png (1080x1920)`);
  console.log('\nDone! All icons generated.');
}

generate().catch(console.error);
