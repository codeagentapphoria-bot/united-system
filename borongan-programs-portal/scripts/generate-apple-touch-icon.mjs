// Generates 180x180 apple-touch-icon.png
import { createCanvas, loadImage } from 'canvas';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');
const LOGO_PATH = join(PUBLIC_DIR, 'lgu-borongan-512.png');
const OUT_PATH = join(PUBLIC_DIR, 'apple-touch-icon.png');

async function main() {
  const logo = await loadImage(LOGO_PATH);
  const size = 180;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // White background (iOS adds its own rounded corners + gloss)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Center-crop logo to square, scaled to 70% of icon size
  const cropSize = Math.min(logo.width, logo.height);
  const sx = (logo.width - cropSize) / 2;
  const sy = (logo.height - cropSize) / 2;
  const drawSize = size * 0.70;

  ctx.drawImage(
    logo,
    sx, sy, cropSize, cropSize,
    (size - drawSize) / 2, (size - drawSize) / 2, drawSize, drawSize
  );

  writeFileSync(OUT_PATH, canvas.toBuffer('image/png'));
  console.log(`Created apple-touch-icon.png (${size}x${size})`);
}

main().catch(err => { console.error(err); process.exit(1); });
