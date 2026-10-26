# SPEC.md — Intip-Rebuild Specification

## 1. What Is It?
A Windows desktop widget/dock overlay — simplified functional clone of
Intip, rebuilt from ReCREATOR analysis. Source-visible and extensible.

## 2. UI Spec (extracted from original app.asar, verified by pixel measurement)

| Parameter | Original value | Rebuild status |
|---|---|---|
| Notch idle | 150×36 px, r=18 pill, top-center | ✅ measured 150×36 |
| Notch open | 380×160 px | ✅ measured 409×160 (incl. ears) — same as original |
| Tucked | 72×6 px | implemented (dblclick toggles) |
| Ears | ::before/::after 19×18, mask radial 18px | ✅ |
| Spring | cubic-bezier(.3, 1.32, .45, 1) | ✅ |
| Theme kaca | rgba(38,30,46,.34) + blur(26px) saturate(1.6) | ✅ |
| Accents | peach #ffd5c4, grape #8a5cff, sky #74c7ff, sun #ffce4a, lime #b5ec6a, pink #ff8fc1 | ✅ |
| Font | Figtree, system-ui fallback | ✅ (Figtree fallback Segoe UI) |
| Slides | music, pomo, sholat, todo, water, alarm, notif (7) | ✅ 7 slides + dots + nav |
| Idle styles | jam (clock) / mata (eyes) | ✅ clock; eyes markup present |

### Visual-verification artifacts
- `mockup/compare.html` — side-by-side original vs rebuild (screenshots + numbers) + interactive demo
- `tools/verify_final.py` — pixel-measurement script (original: 409×160, rebuild: 409×160)
- Captures in `tools/`: `intip_win.bmp` (original), `rb_idle.bmp`, `rb_open_final.bmp` (rebuild)

### Note on kaca-theme body color
Live Intip reads blue-grey (#394060) because the frosted glass blurs the desktop
behind it. In a PrintWindow capture of our transparent window there is no
desktop behind to blur, so the same CSS renders grey. On a real desktop with
the window visible it matches, as both use identical rgba(38,30,46,.34) +
blur(26px) saturate(1.6).

## The 6 Layers

### Layer 1 — Inputs
- User interaction (drag, click, hotkeys)
- Windows clipboard text
- System time (clock)
- City coordinates for weather (Open-Meteo, optional)

### Layer 2 — Processing
- Electron transparent window (Chromium renderer)
- IPC through preload (contextIsolation on)
- electron-store for settings persistence
- fetch() for weather (Open-Meteo free API, no key)

### Layer 3 — Outputs
- Transparent always-on-top widget bar
- System tray icon + context menu
- Clock (HH:MM:SS)
- Weather (city, temp, condition)
- Settings modal

### Layer 4 — Dependencies
- Electron 28+
- electron-store
- Node built-ins: screen, clipboard, Tray, globalShortcut, fetch
- Windows DWM (transparency)

### Layer 5 — Constraints
- Windows only (DWM, tray)
- Transparent windows need GPU-composited Chromium
- No admin required

### Layer 6 — Failure Modes
- Weather API down -> shows "-- offline"
- No network -> weather null, clock unaffected
- Widget hidden -> tray restores
- Crash -> settings JSON retains position

## Verification
npm run dev — widget appears bottom-center, draggable,
clock ticks, weather loads, toggles work, Ctrl+Shift+W hides/shows.
