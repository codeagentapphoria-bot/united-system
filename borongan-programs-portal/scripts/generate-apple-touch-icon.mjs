// Generates apple-touch-icon.png at 1024x1024 (Apple's recommended size for iOS home screen icons)
// iOS uses this as the app icon AND as the fallback startup image when no
// apple-touch-startup-image matches the device — so it must be 1024x1024 to look crisp
import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const LOGO_PATH = join(PUBLIC_DIR, 'favicon.png');
const OUT_PATH = join(PUBLIC_DIR, 'apple-touch-icon.png');

async function main() {
  const logo = await loadImage(LOGO_PATH);
  const size = 1024; // Apple recommends 1024x1024 for iOS app icons
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // White background (iOS adds its own rounded corners + gloss)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Center-crop logo to square, scaled to 55% of icon size for clean padding
  const cropSize = Math.min(logo.width, logo.height);
  const sx = (logo.width - cropSize) / 2;
  const sy = (logo.height - cropSize) / 2;
  const drawSize = size * 0.55;

  ctx.drawImage(
    logo,
    sx, sy, cropSize, cropSize,
    (size - drawSize) / 2, (size - drawSize) / 2, drawSize, drawSize
  );

  writeFileSync(OUT_PATH, canvas.toBuffer('image/png'));
  console.log(`Created apple-touch-icon.png (${size}x${size})`);
}

main().catch(err => { console.error(err); process.exit(1); });
