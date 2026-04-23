# LibreSakay Persistent Auto-Location — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** User location auto-starts on page load (no manual click needed) and persists across sessions via localStorage, with live ETAs updating as user moves.

**Architecture:** `watchPosition` runs for the session's lifetime. localStorage holds the last known coords as a placeholder until first GPS fix arrives. Cleanup via `clearWatch` on unmount.

**Tech Stack:** Browser Geolocation API, React `useEffect`, localStorage. No new dependencies.

---

## File Inventory

| File | Responsibility |
|---|---|
| `src/pages/LibreSakay.tsx` | Owns `userLocation` state; add `watchPosition` useEffect + localStorage key constant |
| `src/components/libre-sakay/BusMap.tsx` | Owns `locating`/`locateError`; change button label to "Refresh Location" |

---

## Task 1: LibreSakay.tsx — watchPosition + localStorage

**Files:**
- Modify: `src/pages/LibreSakay.tsx`

**Changes at a glance:**
1. Add `LOCATION_STORAGE_KEY` constant at module level
2. Add `useEffect` that hydrates from localStorage on mount, starts `watchPosition`, persists coords to localStorage on each update, cleans up with `clearWatch` on unmount

---

- [ ] **Step 1: Add `LOCATION_STORAGE_KEY` constant**

After the imports in `LibreSakay.tsx`, add:

```typescript
const LOCATION_STORAGE_KEY = 'libre_sakay_user_location';
```

---

- [ ] **Step 2: Add `useEffect` for watchPosition + localStorage persistence**

After the existing `useEffect` that calls `fetchLibreSakayProgram` (around line 172), add:

```typescript
  // Auto-start location tracking with localStorage placeholder
  useEffect(() => {
    // 1. Hydrate from localStorage immediately (no flash of "needs location")
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      try {
        const coords = JSON.parse(stored) as [number, number];
        setUserLocation(coords);
      } catch {
        // ignore corrupt storage
      }
    }

    // 2. Start continuous GPS tracking
    if (!navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords));
      },
      () => {
        // GPS error — userLocation stays as localStorage value or null
        // No error state needed here; ETAs will show "needs location" if null
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );

    // 3. Cleanup on unmount — stop watching
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);
```

**Note on state:** `setUserLocation` is already passed into `BusMap` as `onUserLocation` — the `useEffect` above updates the same state. `locating` and `locateError` remain managed inside `BusMap`; the auto-started `watchPosition` runs silently in the background without touching those states.

---

- [ ] **Step 3: Verify LibreSakay.tsx compiles**

Run a quick type check (if LSP available) or confirm the file has no obvious syntax errors by reviewing the modified section.

---

## Task 2: BusMap.tsx — Relabel crosshair button to "Refresh Location"

**Files:**
- Modify: `src/components/libre-sakay/BusMap.tsx:241-242`

The `aria-label` and `title` on the crosshair button currently say "Get My Location". Change both to **"Refresh Location"** (no change to the `onClick` handler — it stays as `handleLocate` which calls `getCurrentPosition` for manual refresh).

---

- [ ] **Step 4: Change aria-label and title**

In `BusMap.tsx`, find the crosshair button (around lines 238–249) and change:

```tsx
// BEFORE
aria-label={locateError ?? 'Get my location'}
title={locateError ?? 'Get My Location'}

// AFTER
aria-label={locateError ?? 'Refresh location'}
title={locateError ?? 'Refresh Location'}
```

The `handleLocate` behavior (one-shot `getCurrentPosition`) stays unchanged — this button is now a manual override/refresh on top of the auto-tracking.

---

- [ ] **Step 5: Commit**

```bash
git add src/pages/LibreSakay.tsx src/components/libre-sakay/BusMap.tsx
git commit -m "feat(libre-sakay): auto-start location tracking with localStorage placeholder"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| `watchPosition` on mount | Task 1, Step 2 |
| localStorage placeholder on mount | Task 1, Step 2 |
| Persist to localStorage on each position update | Task 1, Step 2 |
| clearWatch on unmount | Task 1, Step 2 |
| Button relabeled to "Refresh Location" | Task 2, Step 4 |
| Error handling (GPS unavailable) | Task 1, Step 2 (no-op on error — existing state preserved) |
| localStorage key defined | Task 1, Step 1 |

**No gaps found.**

---

## Post-Implementation Verification

1. Open LibreSakay page — map should center and ETAs should appear **without** clicking anything (if localStorage has a previous location, it shows immediately; otherwise waits for first GPS fix)
2. Move device — ETAs should update live
3. Refresh page — same behavior, no permission prompt (browser remembers grant)
4. Click crosshair button — forces a new GPS fix (manual refresh still works)
5. Page unmount → open DevTools → no `watchPosition` active in background
