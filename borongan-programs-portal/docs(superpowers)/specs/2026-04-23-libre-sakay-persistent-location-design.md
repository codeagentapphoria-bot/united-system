# Libre Sakay — Persistent Auto-Location Design

**Date:** 2026-04-23
**Status:** Approved
**Scope:** `borongan-programs-portal` — LibreSakay page

---

## Problem

User location (`userLocation`) is stored as plain React state in `LibreSakay.tsx`. It resets to `null` on every page load, forcing the user to manually click "Get My Location" to see ETAs. This is poor UX for a feature that depends on continuous location awareness.

---

## Solution

Two-layer location strategy:

1. **`localStorage`** — persists the last known location across sessions; serves as an immediate placeholder on mount so ETAs appear instantly
2. **`watchPosition`** — continuously tracks GPS location; updates state on every position change so ETAs stay live and accurate as the user moves

The browser's geolocation permission is remembered across visits, so on subsequent page loads there is **no permission prompt** — `watchPosition` starts silently and ETAs are live within seconds.

---

## Data Flow

```
Page mount
  ├── Read localStorage 'libre_sakay_user_location'
  │       └── Set userLocation state → ETAs show last known position immediately
  │
  └── Start navigator.geolocation.watchPosition()
          ├── [First GPS fix] → setUserLocation(coords)
          │       └── Overwrite localStorage
          │       └── ETAs recalculate with real position
          │
          └── [User moves] → watchPosition fires new coords
                  └── setUserLocation(coords) → ETAs update live

Page unmount
  └── navigator.geolocation.clearWatch(watchId)  → no background drain
```

---

## localStorage Schema

**Key:** `libre_sakay_user_location`
**Value:** JSON string of `[latitude, longitude]`

```typescript
type UserLocationCoords = [number, number]; // [lat, lng]
```

---

## Implementation Details

### LibreSakay.tsx

Add a `useEffect` that:

1. **On mount:** reads from `localStorage`, sets initial state for instant display
2. **Starts `watchPosition`**, stores the `watchId`
3. **On each position update:** calls `setUserLocation` + writes to `localStorage`
4. **On unmount:** calls `clearWatch(watchId)` to stop tracking

```typescript
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

  // 2. Start continuous tracking
  if (!navigator.geolocation) {
    setLocateError('Geolocation not supported');
    return;
  }

  let watchId: number;
  let setLocating: (v: boolean) => void;
  let setLocateError: (e: string) => void;
  let onUserLocation: (coords: [number, number]) => void;

  // get these from props or refs as needed

  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      onUserLocation(coords);
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords));
      setLocating(false);
    },
    () => {
      setLocateError('Unable to get location');
      setLocating(false);
    },
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
  );

  // 3. Cleanup on unmount
  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}, []);
```

### BusMap.tsx — Button change

The crosshair button label changes from "Get My Location" to **"Refresh Location"**. The behavior stays as `getCurrentPosition` — it forces a new GPS fix on demand, useful if GPS has drifted.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Permission denied | Amber notice: "Location access denied. Enable in browser settings to see ETAs." |
| GPS unavailable / error | `watchPosition` error callback → set `locateError`; ETAs show "needs location" |
| localStorage empty or corrupt | Skip placeholder; proceed with normal GPS flow |
| Geolocation not supported | Set `locateError('Geolocation not supported')`; no tracking started |

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/LibreSakay.tsx` | Add `watchPosition` `useEffect` with localStorage hydration/placeholder; add `LOCATION_STORAGE_KEY` constant |
| `src/components/libre-sakay/BusMap.tsx` | Relabel crosshair button to "Refresh Location"; `getCurrentPosition` stays for manual refresh |

---

## Success Criteria

- [ ] On page load, ETAs display immediately using last known location (no waiting for GPS)
- [ ] After first GPS fix, ETAs update to real position
- [ ] As user moves (if on mobile), ETAs update live without any action
- [ ] On return visit, no permission prompt (browser remembers grant)
- [ ] Manual refresh button still works for GPS drift scenarios
- [ ] Page unmount stops all tracking (no battery drain)
