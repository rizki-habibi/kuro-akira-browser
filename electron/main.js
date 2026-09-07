const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  session,
  Menu,
  shell,
  dialog,
  nativeTheme,
} = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')

// ─── Store (persisted settings) ───────────────────────────────────────────────
const store = new Store({
  defaults: {
    privacyLevel: 'high',       // 'standard' | 'high' | 'paranoid'
    useTor: false,
    torHost: '127.0.0.1',
    torPort: 9050,
    adBlockEnabled: true,
    fingerprintProtection: true,
    userAgent: 'random',        // 'random' | 'chrome' | 'firefox' | 'custom'
    customUserAgent: '',
    theme: 'dark',
    homepage: 'https://search.brave.com',
    windowBounds: { width: 1280, height: 800 },
    blockedCount: 0,
  },
})

// ─── User-Agent pool (anti-detection) ─────────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
]

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

// ─── Ad-block filter loader ────────────────────────────────────────────────────
let blockedDomains = new Set()

function loadFilters() {
  const filterDir = path.join(__dirname, '..', 'filters')
  if (!fs.existsSync(filterDir)) return

  fs.readdirSync(filterDir).forEach((file) => {
    if (!file.endsWith('.txt')) return
    const lines = fs.readFileSync(path.join(filterDir, file), 'utf8').split('\n')
    lines.forEach((line) => {
      line = line.trim()
      if (!line || line.startsWith('!') || line.startsWith('[')) return
      // Extract domain from ||domain^ pattern
      const match = line.match(/^\|\|([a-z0-9.-]+)\^/)
      if (match) blockedDomains.add(match[1])
      // Plain domain lines
      else if (/^[a-z0-9.-]+$/.test(line) && line.includes('.')) {
        blockedDomains.add(line)
      }
    })
  })
  console.log(`[KuroAkira] Loaded ${blockedDomains.size} blocked domains from filters`)
}

// ─── Privacy session setup ─────────────────────────────────────────────────────
function configureSession(ses) {
  const privacy = store.get('privacyLevel')
  const adBlockEnabled = store.get('adBlockEnabled')

  // Spoof / rotate user-agent
  const uaPref = store.get('userAgent')
  let ua = getRandomUA()
  if (uaPref === 'chrome') ua = USER_AGENTS[0]
  else if (uaPref === 'firefox') ua = USER_AGENTS[1]
  else if (uaPref === 'custom') ua = store.get('customUserAgent') || getRandomUA()
  ses.setUserAgent(ua)

  // Block trackers & ads via request interception
  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!adBlockEnabled) return callback({ cancel: false })

    const url = new URL(details.url)
    const host = url.hostname.replace(/^www\./, '')

    // Check blocklist
    if (blockedDomains.has(host)) {
      store.set('blockedCount', store.get('blockedCount') + 1)
      return callback({ cancel: true })
    }

    // Block known tracker patterns
    const trackerPatterns = [
      /google-analytics\.com/,
      /googletagmanager\.com/,
      /doubleclick\.net/,
      /facebook\.com\/tr/,
      /connect\.facebook\.net/,
      /ads\.twitter\.com/,
      /analytics\.twitter\.com/,
      /pixel\.quantserve\.com/,
      /scorecardresearch\.com/,
      /cdn\.taboola\.com/,
      /outbrain\.com/,
      /criteo\.com/,
      /amazon-adsystem\.com/,
      /pagead2\.googlesyndication\.com/,
      /adservice\.google\.com/,
      /mc\.yandex\.ru/,
      /hotjar\.com/,
      /mouseflow\.com/,
      /fullstory\.com/,
      /segment\.com\/v1/,
      /mixpanel\.com/,
    ]

    if (trackerPatterns.some((p) => p.test(details.url))) {
      store.set('blockedCount', store.get('blockedCount') + 1)
      return callback({ cancel: true })
    }

    callback({ cancel: false })
  })

  // Strip tracking headers
  ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const headers = { ...details.requestHeaders }

    // Remove tracking/fingerprinting headers
    delete headers['X-Forwarded-For']
    delete headers['X-Real-IP']

    if (privacy === 'high' || privacy === 'paranoid') {
      delete headers['Referer']
      headers['DNT'] = '1'
      headers['Sec-GPC'] = '1'
    }

    if (privacy === 'paranoid') {
      // Remove all hints that reveal OS/platform
      delete headers['sec-ch-ua']
      delete headers['sec-ch-ua-mobile']
      delete headers['sec-ch-ua-platform']
      delete headers['sec-ch-ua-platform-version']
      delete headers['sec-ch-ua-arch']
      delete headers['sec-ch-ua-model']
      delete headers['sec-ch-ua-full-version']
      delete headers['sec-ch-ua-full-version-list']
    }

    callback({ requestHeaders: headers })
  })

  // Block response headers that set tracking cookies
  ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const headers = { ...details.responseHeaders }

    if (privacy === 'high' || privacy === 'paranoid') {
      // Remove fingerprinting response headers
      delete headers['X-Powered-By']
      delete headers['Server']
    }

    callback({ responseHeaders: headers })
  })

  // Clear data based on privacy level
  if (privacy === 'paranoid') {
    ses.clearStorageData()
  }
}

// ─── Proxy / Tor ───────────────────────────────────────────────────────────────
async function applyProxy(ses) {
  const useTor = store.get('useTor')
  if (useTor) {
    const host = store.get('torHost')
    const port = store.get('torPort')
    await ses.setProxy({ proxyRules: `socks5://${host}:${port}` })
    console.log(`[KuroAkira] Tor proxy active: socks5://${host}:${port}`)
  } else {
    await ses.setProxy({ proxyRules: '' })
  }
}

// ─── Main Window ───────────────────────────────────────────────────────────────
let mainWindow = null

function createWindow() {
  const bounds = store.get('windowBounds')

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 800,
    minHeight: 600,
    frame: false,           // Custom title bar
    transparent: false,
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,       // Allow <webview> tag for embedded browser
      // Security hardening
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    show: false,
    titleBarStyle: 'hidden',
  })

  // Load app
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Save window size on close
  mainWindow.on('close', () => {
    const [width, height] = mainWindow.getSize()
    store.set('windowBounds', { width, height })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Configure the default session
  configureSession(session.defaultSession)
  applyProxy(session.defaultSession)

  // Remove default menu
  Menu.setApplicationMenu(null)
}

// ─── App lifecycle ─────────────────────────────────────────────────────────────
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy')
app.commandLine.appendSwitch('disable-background-networking')
app.commandLine.appendSwitch('disable-sync')
app.commandLine.appendSwitch('metrics-recording-only')
app.commandLine.appendSwitch('disable-default-apps')
app.commandLine.appendSwitch('no-first-run')
app.commandLine.appendSwitch('disable-extensions-file-access-check')
// Disable WebRTC IP leak
app.commandLine.appendSwitch('disable-webrtc')
// Force dark mode
app.commandLine.appendSwitch('force-dark-mode')

app.whenReady().then(() => {
  loadFilters()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Clear session data on exit for paranoid mode
  if (store.get('privacyLevel') === 'paranoid') {
    session.defaultSession.clearStorageData()
    session.defaultSession.clearCache()
  }
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

// Window controls
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.on('window:is-maximized', (e) => {
  e.returnValue = mainWindow?.isMaximized() ?? false
})

// Settings
ipcMain.handle('settings:get', () => store.store)
ipcMain.handle('settings:set', (_, key, value) => {
  store.set(key, value)
  // Re-apply session config if privacy settings changed
  if (['privacyLevel', 'adBlockEnabled', 'userAgent', 'customUserAgent'].includes(key)) {
    configureSession(session.defaultSession)
  }
  if (['useTor', 'torHost', 'torPort'].includes(key)) {
    applyProxy(session.defaultSession)
  }
  return true
})
ipcMain.handle('settings:reset', () => {
  store.clear()
  return store.store
})

// Stats
ipcMain.handle('stats:blocked', () => store.get('blockedCount'))
ipcMain.handle('stats:reset', () => {
  store.set('blockedCount', 0)
  return 0
})

// Clear browsing data
ipcMain.handle('privacy:clear', async (_, types) => {
  const options = {}
  if (types.includes('cookies')) options.storages = ['cookies']
  if (types.includes('cache')) await session.defaultSession.clearCache()
  if (types.includes('storage')) options.storages = ['localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
  if (Object.keys(options).length > 0) {
    await session.defaultSession.clearStorageData(options)
  }
  return true
})

// Open external links safely
ipcMain.handle('shell:open', (_, url) => {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    shell.openExternal(url)
  }
})

// Webview navigation proxy (for URL bar updates)
ipcMain.on('webview:navigate', (e, url) => {
  if (mainWindow) {
    mainWindow.webContents.send('webview:navigate', url)
  }
})

console.log('[KuroAkira] Browser started')
