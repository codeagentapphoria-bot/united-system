// Generates iOS PWA splash screen images
// Usage: node scripts/generate-splashes.mjs

import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

// Ensure public dir exists
if (!existsSync(PUBLIC_DIR)) mkdirSync(PUBLIC_DIR, { recursive: true });

const LOGO_PATH = join(PUBLIC_DIR, 'lgu-borongan-512.png');

const splashes = [
  { w: 640,  h: 920,  file: 'splash-640x920.png' },
  { w: 828,  h: 1472, file: 'splash-828x1472.png' },
  { w: 1125, h: 2436, file: 'splash-1125x2436.png' },
  { w: 1170, h: 2532, file: 'splash-1170x2532.png' },
  { w: 1284, h: 2778, file: 'splash-1284x2778.png' },
  { w: 1536, h: 2048, file: 'splash-1536x2048.png' },
  { w: 2048, h: 2732, file: 'splash-2048x2732.png' },
];

async function main() {
  // Load logo image
  let logo;
  try {
    logo = await loadImage(LOGO_PATH);
    console.log('Loaded logo from:', LOGO_PATH);
  } catch (err) {
    console.error('Failed to load logo:', LOGO_PATH, err.message);
    // Create a fallback blue circle as placeholder
    console.log('Using fallback placeholder');
  }

  for (const { w, h, file } of splashes) {
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    // Blue background
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(0, 0, w, h);

    // Draw logo centered (30% of min dimension)
    const logoSize = Math.min(w, h) * 0.30;
    const cx = w / 2;
    const cy = h / 2 - logoSize * 0.15; // Slightly above center

    if (logo) {
      // Draw logo maintaining aspect ratio, cropped to square center
      const logoW = logo.width;
      const logoH = logo.height;
      const logoAspect = logoW / logoH;
      const destW = logoSize;
      const destH = logoSize;

      // Center crop to square
      const cropSize = Math.min(logoW, logoH);
      const sx = (logoW - cropSize) / 2;
      const sy = (logoH - cropSize) / 2;

      ctx.drawImage(logo, sx, sy, cropSize, cropSize, cx - destW / 2, cy - destH / 2, destW, destH);
    } else {
      // Fallback: white circle
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // App name text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(Math.min(w, h) * 0.055)}px Poppins, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Borongan Portal', cx, cy + logoSize * 0.75);

    const outPath = join(PUBLIC_DIR, file);
    writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`Created ${file} (${w}x${h})`);
  }

  console.log('\nAll splash screens generated!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
