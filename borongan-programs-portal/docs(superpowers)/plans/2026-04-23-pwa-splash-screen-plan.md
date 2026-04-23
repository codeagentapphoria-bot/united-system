# PWA Splash Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a branded PWA splash screen experience covering Android (manifest tuning), iOS (static splash images + meta tags), and a cross-platform HTML overlay that shows on cold load.

**Architecture:** Three-layer approach: (1) Android gets improved manifest colors/icons so Chrome's auto-generated splash looks great, (2) iOS gets 7 static PNG splash images + meta tags for Safari's native splash, (3) Both platforms get a CSS/HTML splash overlay injected directly into `index.html` body that shows before any JS and auto-hides after 1.5s or when the app mounts.

**Tech Stack:** vite-plugin-pwa, static HTML/CSS (no React component tree), `main.tsx` splash hide logic

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add static splash HTML div, splash CSS link, `theme-color` meta, iOS `apple-mobile-web-app-*` meta tags, `apple-touch-startup-image` media queries |
| `public/apple-touch-icon.png` | New 180×180 icon |
| `public/splash-*.png` (×7) | New iOS splash images (see task 3) |
| `vite.config.ts` | Tune `theme_color`, `background_color`, `display`, `orientation` in manifest; add `appleTouchIcon`; remove duplicate `includeAssets` entries |
| `src/components/ui/SplashScreen.css` | Create: CSS for the HTML overlay splash |
| `src/main.tsx` | Add splash hide logic |

---

## Tasks

### Task 1: Tune vite.config.ts manifest for best Android splash

**Files:**
- Modify: `vite.config.ts`

- [ ] **Step 1: Update vite.config.ts manifest fields**

Replace the `manifest` block in the `VitePWA()` config with this tuned version:

```typescript
manifest: {
  name: 'Borongan Residents Portal',
  short_name: 'Borongan Portal',
  description: 'Access government services and programs for Borongan City residents.',
  theme_color: '#1d4ed8',
  background_color: '#ffffff',
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  start_url: '/',
  icons: [
    { src: 'lgu-borongan-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'lgu-borongan-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
},
```

Also remove the duplicate `includeAssets` line — change:
```typescript
includeAssets: ['favicon.png', 'favicon.png', 'favicon.png', 'assets/**/*.png'],
```
to:
```typescript
includeAssets: ['favicon.png', 'assets/**/*.png'],
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add vite.config.ts
git commit -m "fix(pwa): tune manifest theme_color/background_color and clean up includeAssets"
```

---

### Task 2: Add iOS meta tags and theme-color to index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update index.html head section**

In `index.html`, add these meta tags inside the `<head>` block (after the existing `meta charset` and before the `title`):

```html
  <!-- PWA theme and iOS meta tags -->
  <meta name="theme-color" content="#1d4ed8" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Borongan Portal" />
```

After the `apple-touch-icon` link, add the startup images. Find this line in your current `index.html`:
```html
<link rel="apple-touch-icon" href="/favicon.png" />
```
Replace it with:
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

Then add the splash screen startup images after the closing `</head>` opening tag but before the body content. Actually — iOS `apple-touch-startup-image` MUST be inside `<head>` as `<link rel="apple-touch-startup-image" href="...">`. Add this block right after the `apple-touch-icon` link:

```html
  <!-- iOS PWA splash screens -->
  <link rel="apple-touch-startup-image" href="/splash-640x920.png" media="(device-width: 320px) and (device-height: 480px) and (-webkit-device-pixel-ratio: 2)" />
  <link rel="apple-touch-startup-image" href="/splash-828x1472.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash-1284x2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" />
  <link rel="apple-touch-startup-image" href="/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
  <link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
```

Also add a `manifest` link for full PWA compliance:
```html
  <link rel="manifest" href="/manifest.webmanifest" />
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(pwa): add iOS meta tags, theme-color, and splash startup image links"
```

---

### Task 3: Create splash screen PNG images for iOS

**Files:**
- Create: `public/splash-640x920.png`
- Create: `public/splash-828x1472.png`
- Create: `public/splash-1125x2436.png`
- Create: `public/splash-1170x2532.png`
- Create: `public/splash-1284x2778.png`
- Create: `public/splash-1536x2048.png`
- Create: `public/splash-2048x2732.png`

**Important:** These are raster PNG images. Since we cannot generate actual PNG files from code, create these as follows:

- [ ] **Step 1: Check what image editing tools are available**

Run: `where /r "C:\Program Files" firealpaca.exe 2>nul || where /r "C:\Program Files" gimp.exe 2>nul || where /r "C:\Program Files" photoshop.exe 2>nul || echo no-image-editor`

If you have an image editor (FireAlpaca, GIMP, Photoshop), use it to create the splashes. If not, use the following approach with a Node.js canvas script.

- [ ] **Step 2: Use Node.js canvas to generate splash images**

Run: `npm list canvas 2>nul` in the project directory

If `canvas` is installed, create a script `scripts/generate-splashes.mjs`:

```javascript
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

const splashes = [
  { w: 640,  h: 920,  file: 'public/splash-640x920.png' },
  { w: 828,  h: 1472, file: 'public/splash-828x1472.png' },
  { w: 1125, h: 2436, file: 'public/splash-1125x2436.png' },
  { w: 1170, h: 2532, file: 'public/splash-1170x2532.png' },
  { w: 1284, h: 2778, file: 'public/splash-1284x2778.png' },
  { w: 1536, h: 2048, file: 'public/splash-1536x2048.png' },
  { w: 2048, h: 2732, file: 'public/splash-2048x2732.png' },
];

splashes.forEach(({ w, h, file }) => {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // Blue background
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(0, 0, w, h);

  // Draw logo centered (use existing logo as background image)
  // For now, draw a white circle as placeholder for the logo area
  const logoSize = Math.min(w, h) * 0.25;
  const cx = w / 2, cy = h / 2 - 40;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // App name text
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.round(logoSize * 0.35)}px Poppins, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Borongan Portal', cx, cy + logoSize * 0.75);

  writeFileSync(file, canvas.toBuffer('image/png'));
  console.log(`Created ${file}`);
});
```

Run: `node scripts/generate-splashes.mjs`

**If `canvas` is NOT installed**, install it first:
Run: `npm install canvas`

Or if installation fails on Windows, use an alternative approach: create the splash images manually using a screenshot tool or PowerShell to composite the existing logo over a blue background.

- [ ] **Step 3: Verify files exist**

Run: `dir public\splash-*.png /b` (Windows)
Expected: 7 PNG files listed

- [ ] **Step 4: Commit**

```bash
git add public/splash-*.png
git commit -m "feat(pwa): add iOS static splash screen images"
```

---

### Task 4: Create 180×180 apple-touch-icon.png

**Files:**
- Create: `public/apple-touch-icon.png`

- [ ] **Step 1: Create 180×180 icon**

The existing `lgu-borongan-192.png` can serve as the apple-touch-icon since iOS will resize it. Copy it:

```bash
copy public\lgu-borongan-192.png public\apple-touch-icon.png
```

Or if you want a proper 180×180 icon that matches iOS conventions, use the canvas script from Task 3 to create it.

- [ ] **Step 2: Commit**

```bash
git add public/apple-touch-icon.png
git commit -m "feat(pwa): add dedicated 180x180 apple-touch-icon"
```

---

### Task 5: Build the HTML overlay splash screen

**Files:**
- Create: `src/components/ui/SplashScreen.css`

- [ ] **Step 1: Create SplashScreen.css**

```css
/* Full-viewport branded splash — rendered before any JS module loads */
#splash {
  position: fixed;
  inset: 0;
  background-color: #1d4ed8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  transition: opacity 300ms ease-out;
}

#splash.hide {
  opacity: 0;
  pointer-events: none;
}

#splash .splash-logo {
  width: 120px;
  height: 120px;
  object-fit: contain;
  border-radius: 16px;
  /* subtle shadow for depth on blue background */
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.25));
}

#splash .splash-name {
  font-family: 'Poppins', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  margin-top: 16px;
  letter-spacing: 0.02em;
}

#splash .splash-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #ffffff;
  border-radius: 50%;
  margin-top: 24px;
  animation: splash-spin 0.8s linear infinite;
}

@keyframes splash-spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/SplashScreen.css
git commit -m "feat(pwa): add branded splash CSS overlay styles"
```

---

### Task 6: Wire splash into index.html and main.tsx

**Files:**
- Modify: `index.html`
- Modify: `src/main.tsx`

- [ ] **Step 1: Add static splash HTML to index.html body**

In `index.html`, add the splash div and CSS link right after the `<body>` opening tag and before the `beforeinstallprompt` script:

```html
  <link rel="stylesheet" href="/src/components/ui/SplashScreen.css" />
  <div id="splash">
    <img class="splash-logo" src="/lgu-borongan-512.png" alt="Borongan City" />
    <p class="splash-name">Borongan Portal</p>
    <div class="splash-spinner"></div>
  </div>
```

The `<link rel="stylesheet">` for SplashScreen.css should be in `<head>`, not body. Move it there:

```html
  <link rel="stylesheet" href="/src/components/ui/SplashScreen.css" />
</head>
<body>
  <div id="splash">
    ...
```

**Final index.html body should look like:**

```html
<body>
  <link rel="stylesheet" href="/src/components/ui/SplashScreen.css" />
  <div id="splash">
    <img class="splash-logo" src="/lgu-borongan-512.png" alt="Borongan City" />
    <p class="splash-name">Borongan Portal</p>
    <div class="splash-spinner"></div>
  </div>
  <!-- Capture beforeinstallprompt as early as possible — before any module loads -->
  <script>
    window.__pwaInstallPrompt = null;
    ...
```

- [ ] **Step 2: Add splash hide logic to main.tsx**

In `src/main.tsx`, add this at the top of the `render()` call or right after `createRoot`:

```typescript
import './components/ui/SplashScreen.css';

// Hide splash on mount
const hideSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 300);
  }
};

// Max wait: hide after 2s regardless
setTimeout(hideSplash, 2000);

// Hide immediately when React renders
hideSplash();
```

The full `main.tsx` should look like:

```typescript
import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import App from './App';
import './index.css';
import './components/ui/SplashScreen.css';

const hideSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 300);
  }
};

setTimeout(hideSplash, 2000);
hideSplash();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add index.html src/main.tsx
git commit -m "feat(pwa): wire branded HTML splash overlay into app entry"
```

---

### Task 7: Build and verify

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: `✓ built in X.XXs`, no errors

- [ ] **Step 2: Verify dist contents**

Run: `dir dist\*.png /b` (Windows) — check for splash PNGs
Expected: 7 splash PNG files + apple-touch-icon.png

Run: `type dist\manifest.webmanifest` — verify theme_color is #1d4ed8
Expected: `"theme_color":"#1d4ed8"` in output

- [ ] **Step 3: Commit**

```bash
git add -A
git status
# Only dist/ should show as changed (generated files)
git commit -m "chore(pwa): add generated dist assets"
```

---

## Self-Review Checklist

- [ ] All 7 iOS splash PNG sizes covered
- [ ] `apple-touch-icon.png` created as 180×180
- [ ] `theme-color` meta tag added to `index.html`
- [ ] `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` added
- [ ] `apple-touch-startup-image` media queries cover all 7 sizes
- [ ] Splash overlay shows before React mounts (static HTML in body)
- [ ] Splash auto-hides after 2s or on React mount (whichever comes first)
- [ ] CSS transition provides smooth fade-out (not jarring disappear)
- [ ] Android manifest tuned with correct `theme_color` and `background_color`
- [ ] `display: standalone` preserves PWA app-like feel
