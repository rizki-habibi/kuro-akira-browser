const { contextBridge, ipcRenderer } = require('electron')

// ─── Expose safe APIs to renderer ─────────────────────────────────────────────
contextBridge.exposeInMainWorld('kuroAPI', {
  // ── Window controls ──────────────────────────────────────────────────────
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.sendSync('window:is-maximized'),
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: {
    getBlocked: () => ipcRenderer.invoke('stats:blocked'),
    resetBlocked: () => ipcRenderer.invoke('stats:reset'),
  },

  // ── Privacy ───────────────────────────────────────────────────────────────
  privacy: {
    clearData: (types) => ipcRenderer.invoke('privacy:clear', types),
  },

  // ── Shell ─────────────────────────────────────────────────────────────────
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  },

  // ── Event listeners ───────────────────────────────────────────────────────
  on: (channel, callback) => {
    const allowed = ['webview:navigate', 'webview:title-update', 'webview:favicon']
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args))
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },
})

// ─── Anti-fingerprinting injected into renderer ────────────────────────────────
// This runs in the RENDERER context before any page JS
window.addEventListener('DOMContentLoaded', () => {
  injectAntiFingerprint()
})

function injectAntiFingerprint() {
  // Spoof screen resolution slightly
  try {
    Object.defineProperty(screen, 'width', { get: () => 1920 })
    Object.defineProperty(screen, 'height', { get: () => 1080 })
    Object.defineProperty(screen, 'availWidth', { get: () => 1920 })
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 })
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 })
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24 })
  } catch (_) {}

  // Spoof timezone
  try {
    const origDateTimeFormat = Intl.DateTimeFormat
    const patchedDateTimeFormat = function (locale, options = {}) {
      options.timeZone = options.timeZone || 'America/New_York'
      return new origDateTimeFormat(locale, options)
    }
    patchedDateTimeFormat.prototype = origDateTimeFormat.prototype
    patchedDateTimeFormat.supportedLocalesOf = origDateTimeFormat.supportedLocalesOf
    Intl.DateTimeFormat = patchedDateTimeFormat
  } catch (_) {}

  // Spoof hardware concurrency (CPU cores)
  try {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 })
  } catch (_) {}

  // Spoof device memory
  try {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
  } catch (_) {}

  // Remove battery API
  try {
    delete navigator.getBattery
  } catch (_) {}

  // Spoof language
  try {
    Object.defineProperty(navigator, 'language', { get: () => 'en-US' })
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
  } catch (_) {}

  // Block WebRTC IP leak
  try {
    Object.defineProperty(navigator, 'mediaDevices', {
      get: () => ({
        getUserMedia: () => Promise.reject(new Error('Blocked by Kuro Akira')),
        enumerateDevices: () => Promise.resolve([]),
      }),
    })
  } catch (_) {}
}
