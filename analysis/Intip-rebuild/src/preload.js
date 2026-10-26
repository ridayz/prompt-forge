/**
 * preload.js — Secure IPC bridge between main and renderer
 * Runs in an isolated context. Exposes a safe API via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('intipAPI', {
  // Settings
  getSettings:  () => ipcRenderer.invoke('get-settings'),
  saveSettings: (patch) => ipcRenderer.invoke('save-settings', patch),

  // Data
  getWeather:   () => ipcRenderer.invoke('get-weather'),
  getClipboard: () => ipcRenderer.invoke('get-clipboard'),
  getBattery:   () => ipcRenderer.invoke('get-battery'),

  // Actions
  setAlwaysOnTop: (val) => ipcRenderer.invoke('set-always-on-top', val),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),

  // Mouse forwarding: notch hover/click must punch through the click-through
  // sheet — renderer reports whether the pointer is over the notch region
  notchHit: (inside) => ipcRenderer.invoke('notch-hit', inside),

  // Events
  onOpenSettings: (cb) => ipcRenderer.on('open-settings', () => cb()),
});
