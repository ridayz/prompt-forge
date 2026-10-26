# Intip-Rebuild

Simplified functional clone of **Intip** (desktop widget/dock app),
rebuilt from the ReCREATOR analysis, respecting the original license's
no-reverse-engineering clause by writing fresh, original code.

## Quick Start

```
npm install
npm run dev
```

Press **Ctrl+Shift+W** to toggle the widget visibility.

## Commands

| Script | What It Does |
|---|---|
| `npm run dev` | Run in dev mode (fastest iteration) |
| `npm run build` | Package as portable .exe |
| `npm run build-installer` | Package as NSIS installer **Setup** |
| `npm start` | Run minimized to tray |

## Rebuilt Features
- ✅ Transparent always-on-top overlay widget
- ✅ Draggable widget bar (`-webkit-app-region: drag`)
- ✅ System tray with menu (show / hide / quit)
- ✅ Clock widget (live HH:MM:SS)
- ✅ Weather widget (Open-Meteo API, city coords)
- ✅ Settings modal (city, lat/lon, clock/weather/always-on-top toggles)
- ✅ Global shortcut (Ctrl+Shift+W)
- ✅ Settings persistence (electron-store)

## Which Windows APIs are used (via Electron built-ins)
| API | Purpose |
|---|---|
| `screen` module | Display enumeration (monitor detection) |
| `transparent: true` | DWM composition for transparency |
| `alwaysOnTop` | Window level |
| `setVisibleOnAllWorkspaces` | Multi-monitor support |
| `clipboard` module | Clipboard read |
| `Tray` | System tray integration |
| `globalShortcut` | Global hotkey |

## Architecture

```
src/main.js          Electron main process
src/preload.js       Secure IPC bridge (contextIsolation)
src/ui/overlay.html  Widget UI (transparent window)
src/ui/overlay.js    Renderer logic (clock, weather, settings)
src/ui/styles.css    Styling (dark glass)
build/               Installer config
dist/                Built artifacts (generated)
```

## Files

```
Intip-rebuild/
├── SPEC.md                        # 6-Layer concept spec
├── README.md                      # This file
├── package.json                   # Dependencies + build config
├── src/
│   ├── main.js                    # Main process
│   ├── preload.js                 # IPC bridge
│   ├── ui/
│   │   ├── overlay.html           # Widget UI
│   │   ├── overlay.js             # Renderer logic
│   │   └── styles.css             # Styling
│   ├── windows/
│   │   └── transparent-overlay.js # (optional) window manager
│   └── services/
│       ├── clipboard.js           # (optional) clipboard watcher
│       └── weather.js             # (optional) weather service
└── build/
    └── icon.ico                    # App icon (generate)
```

## Recreator Comparison

| Feature | Intip (original) | Intip-Rebuild |
|---|---|---|
| Runtime | Electron 45 + Rust/WASM | Electron 28 (port) |
| Windows API | koffi FFI | Electron built-ins |
| Installer | NSIS (custom) | electron-builder NSIS |
| Source | Encrypted asar | Open (this repo) |
| Privacy | No telemetry | No telemetry |
| Weather | Open-Meteo | Open-Meteo (same) |

## Generate Icon

```bash
py build/make_icon.py
```
