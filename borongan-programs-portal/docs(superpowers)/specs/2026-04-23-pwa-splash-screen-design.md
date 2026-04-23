# PWA Splash Screen Design

**Date:** 2026-04-23
**Status:** Approved
**Stack:** Vite + React + vite-plugin-pwa

---

## 1. Concept & Vision

A polished, branded launch experience across all platforms when the PWA is opened. The splash screen communicates "Borongan City Government Residents Portal" with the city's identity — logo, official colors, and clean typography — giving users confidence the app is loading, not broken. It covers three distinct surfaces: Android Chrome auto-generated splash, iOS Safari static splashes, and a branded HTML overlay for both platforms.

---

## 2. Design Language

**Brand colors:**
- Primary: `#1d4ed8` (blue — matches existing `theme_color`)
- Secondary: `#1e40af` (darker blue for depth)
- Accent: `#fbbf24` (amber — matches existing accent in LibreSakay)
- Background: `#ffffff` (white)
- Text on colored background: `#ffffff` (white)

**Typography:** Same as app — Poppins (already loaded in index.html)

**Icon/Logo:** `lgu-borongan-512.png` (existing LGU Borongan logo)

**Layout:** Centered, vertically and horizontally

---

## 3. Platform Strategy

### Android PWA — Auto-generated Splash (Chrome)
Chrome auto-generates a splash from:
- `theme_color` → background color of splash
- `background_color` → fallback background
- `icons[0]` (192×192 `any` icon) → centered icon
- App name from `short_name` or `name`

**Changes needed:**
- No new images required
- Tune manifest `theme_color`, `background_color`, `icons` to look great
- Add `theme-color` meta tag in `index.html` for maximum Chrome coverage

### iOS Safari — Static Splash Images
iOS requires static PNG images per device resolution. We will generate:
| Device | Size | Filename |
|--------|------|----------|
| iPhone 6/7/8 (standard) | 640×920 | `splash-640x920.png` |
| iPhone 6/7/8 Plus | 828×1472 | `splash-828x1472.png` |
| iPhone X/XS/11 Pro | 1125×2436 | `splash-1125x2436.png` |
| iPhone 12/13/14 (6.1") | 1170×2532 | `splash-1170x2532.png` |
| iPhone 14 Plus/13 Pro Max | 1284×2778 | `splash-1284x2778.png` |
| iPad (standard) | 1536×2048 | `splash-1536x2048.png` |
| iPad Pro 12.9" | 2048×2732 | `splash-2048x2732.png` |

Each image: centered LGU logo on `#1d4ed8` blue background with "Borongan Portal" text below the logo.

**Changes needed:**
- Generate 7 splash PNG images (can use existing `lgu-borongan-512.png` as base)
- Add `apple-touch-startup-image` media queries to `index.html`
- Fix `apple-touch-icon` to point to proper 180×180 icon
- Add `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` meta tags

### Branded HTML Overlay — Cross-Platform
A React component (`SplashScreen.tsx`) rendered at app entry that shows immediately on cold load, then auto-hides.

**Behavior:**
- Mounts instantly (before React hydration) via a `<div id="splash">` rendered in `index.html` body
- CSS-only animation: fade out after 1.5s OR when `window.__appReady` is set
- Shows: centered logo, "Borongan Portal" text, loading indicator (CSS spinner)
- Disappears with opacity fade (300ms CSS transition)

---

## 4. Components

### `SplashScreen.tsx`
A simple `div` overlay (not a React component that mounts into the React tree) — injected directly into `index.html` as static HTML, styled via `splash.css`. This ensures it shows before any JS runs.

**Static HTML in index.html:**
```html
<div id="splash">
  <img src="/lgu-borongan-512.png" alt="Borongan City" />
  <p class="splash-name">Borongan Portal</p>
  <div class="splash-spinner"></div>
</div>
```

**splash.css:**
```css
#splash {
  position: fixed;
  inset: 0;
  background: #1d4ed8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 300ms ease-out;
}
#splash.hide { opacity: 0; pointer-events: none; }
#splash img { width: 120px; height: 120px; object-fit: contain; }
#splash-name { color: #fff; font-family: 'Poppins', sans-serif; font-size: 1.5rem; font-weight: 600; margin-top: 16px; }
#splash-spinner {
  width: 32px; height: 32px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  margin-top: 24px;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

**Auto-hide logic (in `main.tsx`):**
```typescript
// Hide splash once React mounts and app is ready
const hideSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) splash.classList.add('hide');
  setTimeout(() => splash?.remove(), 300);
};
// Hide after 1.5s max (fallback)
setTimeout(hideSplash, 1500);
```

---

## 5. File Changes

| File | Change |
|------|--------|
| `index.html` | Add `theme-color` meta, iOS meta tags (`apple-touch-startup-image` links), static splash HTML div, splash CSS link |
| `public/splash-*.png` (×7) | New iOS splash screen images |
| `public/apple-touch-icon.png` | New 180×180 icon |
| `vite.config.ts` | Update `theme_color`, `background_color` in manifest; ensure `appleTouchIcon` configured |
| `src/main.tsx` | Add splash hide logic |
| `src/components/ui/SplashScreen.css` | CSS for the HTML overlay splash |

---

## 6. Out of Scope

- Custom splash screen images for Android (Chrome controls this)
- Dark mode splash variants
- Per-page/section splash screens
- Animated logo/brand animations (static only)
