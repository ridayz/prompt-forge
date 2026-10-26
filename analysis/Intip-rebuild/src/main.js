/**
 * main.js — Intip-Rebuild main process
 * Desktop widget overlay: transparent, always-on-top, draggable widget bar
 */
const { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');

// GPU compositing breaks PrintWindow/screen capture of the transparent
// overlay in some remote-desktop sessions — force software rendering.
app.disableHardwareAcceleration();

const store = new Store({ name: 'intip-settings' });

let tray = null;
let overlayWindow = null;

// Default settings
const DEFAULTS = {
  position: { x: null, y: null },       // null = auto (bottom of primary display)
  widgetWidth: 320,
  widgetHeight: 60,
  weatherCity: 'Jakarta',
  weatherLat: -6.2,
  weatherLon: 106.8,
  opacity: 0.92,
  startMinimized: false,
  alwaysOnTop: true,
  showClock: true,
  showWeather: true,
  showClipboard: false,
  clipboardHistory: 20,
};

function getSettings() {
  return { ...DEFAULTS, ...store.get('settings', {}) };
}

function saveSettings(patch) {
  const s = getSettings();
  Object.assign(s, patch);
  store.set('settings', s);
  return s;
}

// ── Create transparent overlay window (small sheet at top-center) ──
function createOverlayWindow() {
  const settings = getSettings();
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();

  // Small transparent window hugging the top edge, wide enough for the open
  // state (380px notch + 19px ears each side + margin) and 180px tall.
  const width = 460;
  const height = 180;
  const x = primary.bounds.x + Math.round((primary.bounds.width - width) / 2);
  const y = primary.bounds.y;

  overlayWindow = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,                // frameless — no title bar
    transparent: true,           // transparent background
    alwaysOnTop: settings.alwaysOnTop,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    fullscreenable: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // ?open=1 force-opens the notch on load (visual verification of the open
  // state; same idea as the original's ?tahan=10000)
  const forceOpen = process.env.INTIP_FORCE_OPEN || process.argv.includes('--open=1');
  overlayWindow.loadFile(path.join(__dirname, 'ui', 'overlay.html'),
    forceOpen ? { query: { open: '1' } } : undefined);
  // Make whole window draggable via IPC from renderer
  overlayWindow.on('moved', () => {
    const [nx, ny] = overlayWindow.getPosition();
    saveSettings({ position: { x: nx, y: ny } });
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });

  console.log('[Intip-Rebuild] Overlay notch window', width + 'x180', 'at', x, y);
}

// ── System tray ────────────────────────────────────────────────────────────────
function createTray() {
  // 16x16 tray icon — simple SVG rendered as PNG data URL
  const iconData = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAGlJREFUOI3tjjEOgCAQBGd5gImBhY2FPcRKb2BnYeEB2Fl5hZ2VhYUXYGNj4QFYWRlYWXkBNjb+AysrAwsLL8DGxsLCE1jZWFhYeAJ2NhYWFp5AZGxsLDyByNjYWHgCEcPGxsJDYGNjYWHhCdjZ2NjYWHiCzgcA9wAAARz0JZMAAAAASUVORK5CYII='
  );

  tray = new Tray(iconData);
  tray.setToolTip('Intip-Rebuild');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Widget', click: () => overlayWindow?.show() },
    { label: 'Settings', click: () => openSettings() },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: getSettings().alwaysOnTop,
      click: (item) => {
        saveSettings({ alwaysOnTop: item.checked });
        overlayWindow?.setAlwaysOnTop(item.checked);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    overlayWindow?.show();
    overlayWindow?.focus();
  });

  console.log('[Intip-Rebuild] Tray created');
}

// ── Settings window ───────────────────────────────────────────────────────────
function openSettings() {
  if (overlayWindow) {
    overlayWindow.webContents.send('open-settings');
    overlayWindow.show();
    overlayWindow.focus();
  }
}

// ── IPC handlers ───────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('get-settings', () => getSettings());

  ipcMain.handle('save-settings', (_, patch) => saveSettings(patch));

  ipcMain.handle('get-weather', async () => {
    const s = getSettings();
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.weatherLat}&longitude=${s.weatherLon}&current_weather=true&timezone=auto`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const data = await resp.json();
      return {
        temp: Math.round(data.current_weather.temperature),
        code: data.current_weather.weathercode,
        wind: Math.round(data.current_weather.windspeed),
      };
    } catch (e) {
      console.error('[Weather] Failed:', e.message);
      return null;
    }
  });

  ipcMain.handle('get-clipboard', () => {
    const { clipboard } = require('electron');
    return clipboard.readText();
  });

  // real battery percentage via WMI (graceful fallback in main)
  ipcMain.handle('get-battery', () => {
    try {
      const { execSync } = require('child_process');
      const out = execSync('powershell -NoProfile -Command "(Get-WmiObject Win32_Battery).EstimatedChargeRemaining"').toString().trim();
      const pct = parseInt(out, 10);
      return Number.isFinite(pct) ? pct / 100 : 0.85;
    } catch { return 0.85; }
  });

  ipcMain.handle('set-always-on-top', (_, val) => {
    overlayWindow?.setAlwaysOnTop(val);
    return val;
  });

  ipcMain.handle('minimize-to-tray', () => {
    overlayWindow?.hide();
  });

  // Punch-through handler kept as a no-op (small window needs no forwarding)
  ipcMain.handle('notch-hit', () => {});

  console.log('[Intip-Rebuild] IPC handlers registered');
}

// ── App lifecycle ──────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createOverlayWindow();
  createTray();
  setupIPC();

  // Register global shortcut to toggle widget visibility
  globalShortcut.register('CommandOrControl+Shift+W', () => {
    if (overlayWindow?.isVisible()) {
      overlayWindow.hide();
    } else {
      overlayWindow?.show();
    }
  });

  const settings = getSettings();
  if (settings.startMinimized) {
    overlayWindow?.hide();
  }

  console.log('[Intip-Rebuild] Ready — Ctrl+Shift+W to toggle widget');
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  // Keep running in tray on Windows
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
});
