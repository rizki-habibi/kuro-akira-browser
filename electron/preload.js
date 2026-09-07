const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('kuroAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.sendSync('window:is-maximized'),
    openNew: () => ipcRenderer.invoke('window:new'),
    getCount: () => ipcRenderer.invoke('window:count'),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (k, v) => ipcRenderer.invoke('settings:set', k, v),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },
  stats: {
    getBlocked: () => ipcRenderer.invoke('stats:blocked'),
    resetBlocked: () => ipcRenderer.invoke('stats:reset'),
    getCoins: () => ipcRenderer.invoke('stats:coins'),
    addCoins: (n) => ipcRenderer.invoke('stats:coins:add', n),
  },
  privacy: {
    clearData: (types) => ipcRenderer.invoke('privacy:clear', types),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  },
  search: {
    fetch: (opts) => ipcRenderer.invoke('search:fetch', opts),
    images: (q) => ipcRenderer.invoke('search:images', q),
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
  },
  on: (channel, cb) => {
    const allowed = ['webview:navigate', 'updater:available', 'updater:progress', 'updater:downloaded', 'updater:error', 'updater:not-available']
    if (allowed.includes(channel)) ipcRenderer.on(channel, (_, ...args) => cb(...args))
  },
  off: (channel, cb) => ipcRenderer.removeListener(channel, cb),
})

// Anti-fingerprinting
window.addEventListener('DOMContentLoaded', () => {
  try {
    Object.defineProperty(screen, 'width', { get: () => 1920 })
    Object.defineProperty(screen, 'height', { get: () => 1080 })
    Object.defineProperty(screen, 'availWidth', { get: () => 1920 })
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 })
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 })
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
    Object.defineProperty(navigator, 'language', { get: () => 'id-ID' })
    Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US', 'en'] })
    delete navigator.getBattery
    delete navigator.connection
  } catch (_) { }
})
