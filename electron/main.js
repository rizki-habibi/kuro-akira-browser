const {
  app, BrowserWindow, ipcMain, session, Menu, shell, dialog
} = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')
const Store = require('electron-store')
const { spawn, execFile } = require('child_process')

// ═══════════════════════════════════════════════════════
// KURO AKIRA BROWSER v2.5 — Main Process
// ═══════════════════════════════════════════════════════

const store = new Store({
  defaults: {
    privacyLevel: 'high',
    useTor: false, torHost: '127.0.0.1', torPort: 9050,
    adBlockEnabled: true, fingerprintProtection: true,
    userAgent: 'random', customUserAgent: '',
    theme: 'dark', homepage: 'kuro://newtab',
    windowBounds: { width: 1360, height: 860 },
    blockedCount: 0, kuroCoins: 0,
    searchEngine: 'kuro', onionEnabled: false,
    vpnEnabled: false, vpnServer: '',
    rewardEnabled: true, activeProfile: 'Profil Utama',
    // Tor executable path — default ke Tor Browser user punya
    torExePath: '',
    torDataPath: '',
  }
})

// ── Tor Process Manager ──────────────────────────────────
let torProcess = null
let torReady = false
let torLog = []
let mainWindow = null  // referensi window utama

// Lokasi tor.exe default (Tor Browser portable)
function findTorExe() {
  const stored = store.get('torExePath', '')
  if (stored && fs.existsSync(stored)) return stored

  // Cari di lokasi umum Windows
  const candidates = [
    // Tor Browser di Desktop (user ini)
    path.join(app.getPath('desktop'), 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
    // Tor Browser di Program Files
    'C:\\Program Files\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
    // Tor standalone
    'C:\\Program Files\\Tor\\tor.exe',
    'C:\\tor\\tor.exe',
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      store.set('torExePath', c)
      return c
    }
  }
  return null
}

function findTorDataDir() {
  const stored = store.get('torDataPath', '')
  if (stored && fs.existsSync(stored)) return stored

  const desktop = app.getPath('desktop')
  const candidates = [
    path.join(desktop, 'Tor Browser', 'Browser', 'TorBrowser', 'Data', 'Tor'),
    path.join(app.getPath('userData'), 'tor-data'),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) { store.set('torDataPath', c); return c }
  }
  // Buat folder data tor di userData
  const newPath = path.join(app.getPath('userData'), 'tor-data')
  fs.mkdirSync(newPath, { recursive: true })
  store.set('torDataPath', newPath)
  return newPath
}

async function startTor() {
  if (torProcess) return { ok: true, already: true }

  const torExe = findTorExe()
  if (!torExe) {
    return { ok: false, error: 'tor.exe tidak ditemukan. Instal Tor Browser terlebih dahulu.' }
  }

  const dataDir = findTorDataDir()
  const host = store.get('torHost', '127.0.0.1')
  const port = store.get('torPort', 9050)
  const ctrlPort = port + 1  // control port = 9051

  // Buat torrc minimal
  const torrc = path.join(dataDir, 'torrc-kuro')
  fs.writeFileSync(torrc, [
    `SocksPort ${host}:${port}`,
    `ControlPort ${ctrlPort}`,
    `DataDirectory ${dataDir}`,
    `Log notice stdout`,
    `DisableNetwork 0`,
    `CookieAuthentication 0`,
    `MaxCircuitDirtiness 600`,
  ].join('\n'))

  return new Promise((resolve) => {
    torLog = []
    torProcess = spawn(torExe, ['-f', torrc], {
      detached: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) { resolved = true; resolve({ ok: false, error: 'Tor timeout (30s)' }) }
    }, 30000)

    torProcess.stdout.on('data', (data) => {
      const line = data.toString().trim()
      torLog.push(line)
      if (line.includes('Bootstrapped 100%') || line.includes('Done')) {
        torReady = true
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          // Set proxy setelah Tor siap
          applyProxy(session.defaultSession)
          if (mainWindow) mainWindow.webContents.send('tor:status', { running: true, bootstrapped: true })
          resolve({ ok: true, pid: torProcess.pid })
        }
      }
      if (line.includes('Bootstrapped')) {
        const m = line.match(/Bootstrapped (\d+)%/)
        if (m && mainWindow) {
          mainWindow.webContents.send('tor:progress', { percent: parseInt(m[1]), line })
        }
      }
    })

    torProcess.stderr.on('data', (data) => {
      const line = data.toString().trim()
      torLog.push('[err] ' + line)
    })

    torProcess.on('exit', (code) => {
      torProcess = null
      torReady = false
      if (mainWindow) mainWindow.webContents.send('tor:status', { running: false, code })
      console.log('[Tor] process exited, code:', code)
    })

    torProcess.on('error', (e) => {
      torProcess = null
      torReady = false
      if (!resolved) { resolved = true; clearTimeout(timeout); resolve({ ok: false, error: e.message }) }
    })
  })
}

function stopTor() {
  if (!torProcess) return { ok: true, already: true }
  try {
    process.platform === 'win32'
      ? spawn('taskkill', ['/pid', torProcess.pid, '/f', '/t'])
      : torProcess.kill('SIGTERM')
    torProcess = null
    torReady = false
    applyProxy(session.defaultSession)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── User-Agent Pool ─────────────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
]
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

// ── Ad-block Filter Loader ──────────────────────────────
let blockedDomains = new Set()

function loadFilters() {
  const filterDir = path.join(__dirname, '..', 'filters')
  if (!fs.existsSync(filterDir)) return
  fs.readdirSync(filterDir).forEach(f => {
    if (!f.endsWith('.txt')) return
    const lines = fs.readFileSync(path.join(filterDir, f), 'utf8').split('\n')
    lines.forEach(line => {
      line = line.trim()
      if (!line || line.startsWith('!') || line.startsWith('[')) return
      const m = line.match(/^\|\|([a-z0-9.-]+)\^/)
      if (m) blockedDomains.add(m[1])
      else if (/^[a-z0-9.-]+$/.test(line) && line.includes('.')) blockedDomains.add(line)
    })
  })
  console.log(`[KuroAkira] Loaded ${blockedDomains.size} blocked domains`)
}

// ── Session Privacy Config ──────────────────────────────
function configureSession(ses) {
  const privacy = store.get('privacyLevel')
  const adBlockEnabled = store.get('adBlockEnabled')
  const uaPref = store.get('userAgent')
  let ua = getRandomUA()
  if (uaPref === 'chrome') ua = USER_AGENTS[0]
  else if (uaPref === 'firefox') ua = USER_AGENTS[1]
  else if (uaPref === 'custom') ua = store.get('customUserAgent') || getRandomUA()
  ses.setUserAgent(ua)

  // Tracker patterns
  const TRACKERS = [
    /google-analytics\.com/, /googletagmanager\.com/, /doubleclick\.net/,
    /facebook\.com\/tr/, /connect\.facebook\.net/, /ads\.twitter\.com/,
    /pixel\.quantserve\.com/, /scorecardresearch\.com/, /cdn\.taboola\.com/,
    /outbrain\.com/, /criteo\.com/, /amazon-adsystem\.com/,
    /pagead2\.googlesyndication\.com/, /adservice\.google\.com/,
    /mc\.yandex\.ru/, /hotjar\.com/, /mouseflow\.com/, /fullstory\.com/,
    /segment\.com\/v1/, /mixpanel\.com/, /amplitude\.com/,
    /heap\.io/, /intercom\.io/, /hubspot\.com\/hs-analytics/,
    /bat\.bing\.com/, /snap\.licdn\.com/, /ads\.linkedin\.com/,
    /tiktok\.com\/i18n\/pixel/, /analytics\.tiktok\.com/,
  ]

  // Remove old listeners first
  try { ses.webRequest.onBeforeRequest(null) } catch (_) { }

  ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!adBlockEnabled) return callback({ cancel: false })
    try {
      const urlObj = new URL(details.url)
      const host = urlObj.hostname.replace(/^www\./, '')
      if (blockedDomains.has(host)) {
        const cur = store.get('blockedCount', 0)
        store.set('blockedCount', cur + 1)
        // Reward: setiap 10 iklan diblokir = 1 koin
        if ((cur + 1) % 10 === 0 && store.get('rewardEnabled', true)) {
          store.set('kuroCoins', store.get('kuroCoins', 0) + 1)
        }
        return callback({ cancel: true })
      }
      if (TRACKERS.some(p => p.test(details.url))) {
        const cur = store.get('blockedCount', 0)
        store.set('blockedCount', cur + 1)
        return callback({ cancel: true })
      }
    } catch (_) { }
    callback({ cancel: false })
  })

  ses.webRequest.onBeforeSendHeaders({ urls: ['*://*/*'] }, (details, callback) => {
    const headers = { ...details.requestHeaders }
    delete headers['X-Forwarded-For']
    delete headers['X-Real-IP']
    if (privacy === 'high' || privacy === 'paranoid') {
      delete headers['Referer']
      headers['DNT'] = '1'
      headers['Sec-GPC'] = '1'
    }
    if (privacy === 'paranoid') {
      ['sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-ch-ua-platform-version',
        'sec-ch-ua-arch', 'sec-ch-ua-model', 'sec-ch-ua-full-version', 'sec-ch-ua-full-version-list']
        .forEach(h => delete headers[h])
    }
    callback({ requestHeaders: headers })
  })

  ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, (details, callback) => {
    const headers = { ...details.responseHeaders }
    if (privacy === 'high' || privacy === 'paranoid') {
      delete headers['X-Powered-By']
      delete headers['Server']
    }
    // Hapus CSP agar situs bisa dimuat dalam webview
    delete headers['content-security-policy']
    delete headers['content-security-policy-report-only']
    delete headers['x-frame-options']
    delete headers['X-Frame-Options']
    callback({ responseHeaders: headers })
  })

  if (privacy === 'paranoid') ses.clearStorageData()
}

// ── Proxy / VPN / Tor ───────────────────────────────────
let torRunning = false // cache status

async function checkTorRunning() {
  const net = require('net')
  return new Promise(resolve => {
    const h = store.get('torHost', '127.0.0.1')
    const p = store.get('torPort', 9050)
    const socket = net.createConnection({ host: h, port: p, timeout: 2000 })
    socket.on('connect', () => { socket.destroy(); resolve(true) })
    socket.on('error', () => resolve(false))
    socket.on('timeout', () => { socket.destroy(); resolve(false) })
  })
}

async function applyProxy(ses) {
  const useTor = store.get('useTor')
  const vpnEnabled = store.get('vpnEnabled')
  const vpnServer = store.get('vpnServer')

  if (useTor && torReady) {
    const h = store.get('torHost', '127.0.0.1')
    const p = store.get('torPort', 9050)
    await ses.setProxy({ proxyRules: `socks5://${h}:${p}` })
    console.log(`[KuroAkira] Tor AKTIF (embedded): socks5://${h}:${p}`)
  } else if (useTor && !torReady) {
    // Tor dipilih tapi belum siap — cek apakah port terbuka (Tor Browser eksternal?)
    const externalRunning = await checkTorRunning()
    if (externalRunning) {
      const h = store.get('torHost', '127.0.0.1')
      const p = store.get('torPort', 9050)
      await ses.setProxy({ proxyRules: `socks5://${h}:${p}` })
      console.log(`[KuroAkira] Tor eksternal terdeteksi: socks5://${h}:${p}`)
    } else {
      await ses.setProxy({ proxyRules: '' })
      console.warn('[KuroAkira] Tor dipilih tapi tidak berjalan, proxy tidak diset')
    }
  } else if (vpnEnabled && vpnServer) {
    await ses.setProxy({ proxyRules: `socks5://${vpnServer}` })
    console.log(`[KuroAkira] VPN AKTIF: ${vpnServer}`)
  } else {
    await ses.setProxy({ proxyRules: '' })
  }
}

// ── Windows registry ────────────────────────────────────
const windows = new Map()
let windowIdCounter = 1

function createWindow(opts = {}) {
  const bounds = store.get('windowBounds', { width: 1360, height: 860 })
  const id = windowIdCounter++

  const win = new BrowserWindow({
    width: opts.width || bounds.width,
    height: opts.height || bounds.height,
    minWidth: 900, minHeight: 600,
    frame: false,
    backgroundColor: '#0d0d0d',
    icon: path.join(__dirname, '..', 'public', 'icons', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true,
      allowRunningInsecureContent: true,
      webSecurity: false,
    },
    show: false,
  })

  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  win.once('ready-to-show', () => win.show())
  win.on('close', () => {
    const [w, h] = win.getSize()
    store.set('windowBounds', { width: w, height: h })
    windows.delete(id)
  })

  windows.set(id, win)
  if (id === 1) mainWindow = win  // simpan ref window utama
  configureSession(session.defaultSession)
  applyProxy(session.defaultSession)
  Menu.setApplicationMenu(null)
  return win
}

// ── Auto Updater ────────────────────────────────────────
function setupAutoUpdater(win) {
  // Silent: auto-download di background, pasang saat quit
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'rizki-habibi',
    repo: 'kuro-akira-browser',
    releaseType: 'release',
  })

  autoUpdater.logger = {
    info: (...a) => console.log('[updater]', ...a),
    warn: (...a) => console.warn('[updater]', ...a),
    error: (...a) => console.error('[updater]', ...a),
    debug: () => { },
  }

  autoUpdater.on('checking-for-update', () => { console.log('[updater] Memeriksa...') })
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] Update tersedia:', info.version, '— mengunduh diam-diam...')
    win.webContents.send('updater:available', info)
    // Silent download langsung
    autoUpdater.downloadUpdate().catch(e => console.error('[updater] download err:', e.message))
  })
  autoUpdater.on('update-not-available', (info) => {
    console.log('[updater] Sudah terbaru:', info?.version)
    win.webContents.send('updater:not-available')
  })
  autoUpdater.on('download-progress', (p) => {
    win.webContents.send('updater:progress', p)
  })
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] Unduhan selesai, akan dipasang saat restart:', info.version)
    win.webContents.send('updater:downloaded', info)
  })
  autoUpdater.on('error', (e) => {
    console.error('[updater] Error:', e.message)
    win.webContents.send('updater:error', e.message)
  })

  setTimeout(() => { try { autoUpdater.checkForUpdates() } catch (e) { console.error('[updater]', e.message) } }, 8000)
  setInterval(() => { try { autoUpdater.checkForUpdates() } catch (_) { } }, 30 * 60 * 1000)
}

// ── App Switches ────────────────────────────────────────
app.commandLine.appendSwitch('disable-background-networking')
app.commandLine.appendSwitch('disable-sync')
app.commandLine.appendSwitch('metrics-recording-only')
app.commandLine.appendSwitch('no-first-run')
app.commandLine.appendSwitch('disable-webrtc')
app.commandLine.appendSwitch('force-dark-mode')
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy,CrossOriginEmbedderPolicy,IsolateOrigins,site-per-process')
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('allow-running-insecure-content')
app.commandLine.appendSwitch('disable-web-security')

app.whenReady().then(() => {
  loadFilters()
  const win = createWindow()
  setupAutoUpdater(win)
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => {
  if (store.get('privacyLevel') === 'paranoid') {
    session.defaultSession.clearStorageData()
    session.defaultSession.clearCache()
  }
  if (process.platform !== 'darwin') app.quit()
})

// ══════════════════════════════════════════════════════
// IPC HANDLERS
// ══════════════════════════════════════════════════════

// Window
ipcMain.on('window:minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window:maximize', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender)
  if (w?.isMaximized()) w.unmaximize(); else w?.maximize()
})
ipcMain.on('window:close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
ipcMain.on('window:is-maximized', (e) => { e.returnValue = BrowserWindow.fromWebContents(e.sender)?.isMaximized() ?? false })
ipcMain.handle('window:new', () => { createWindow(); return true })

// Settings
ipcMain.handle('settings:get', () => store.store)
ipcMain.handle('settings:set', async (_, key, value) => {
  store.set(key, value)
  if (['privacyLevel', 'adBlockEnabled', 'userAgent', 'customUserAgent'].includes(key)) configureSession(session.defaultSession)
  if (['useTor', 'torHost', 'torPort', 'vpnEnabled', 'vpnServer'].includes(key)) {
    if (key === 'useTor') {
      if (value === true) {
        // Auto-start Tor embedded
        if (!torProcess) {
          startTor().then(r => {
            if (mainWindow) mainWindow.webContents.send('tor:status', { running: r.ok, error: r.error })
          })
        } else {
          applyProxy(session.defaultSession)
        }
      } else {
        // Stop Tor embedded
        stopTor()
        applyProxy(session.defaultSession)
      }
    } else {
      applyProxy(session.defaultSession)
    }
  }
  return true
})
ipcMain.handle('settings:reset', () => { store.clear(); return store.store })

// Stats & Reward
ipcMain.handle('stats:blocked', () => store.get('blockedCount', 0))
ipcMain.handle('stats:reset', () => { store.set('blockedCount', 0); return 0 })
ipcMain.handle('stats:coins', () => store.get('kuroCoins', 0))
ipcMain.handle('stats:coins:add', (_, n) => {
  const cur = store.get('kuroCoins', 0)
  store.set('kuroCoins', cur + n)
  return cur + n
})

// Privacy
ipcMain.handle('privacy:clear', async (_, types) => {
  const opts = {}
  if (types.includes('cookies')) opts.storages = ['cookies']
  if (types.includes('cache')) await session.defaultSession.clearCache()
  if (types.includes('storage')) opts.storages = ['localstorage', 'indexdb', 'websql', 'serviceworkers', 'cachestorage']
  if (Object.keys(opts).length > 0) await session.defaultSession.clearStorageData(opts)
  return true
})

// Shell
ipcMain.handle('shell:open', (_, url) => {
  if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url)
})

// Multi-window
ipcMain.handle('window:count', () => BrowserWindow.getAllWindows().length)

// Updater
ipcMain.handle('updater:check', () => {
  try {
    autoUpdater.checkForUpdates()
  } catch (e) {
    console.error('[updater] manual check error:', e.message)
  }
  return true
})
ipcMain.handle('updater:download', () => { autoUpdater.downloadUpdate() })
ipcMain.handle('updater:install', () => { autoUpdater.quitAndInstall(true, true) })
ipcMain.handle('updater:version', () => app.getVersion())

// ── Tor Status & Utils ──────────────────────────────────
ipcMain.handle('tor:check', async () => {
  const running = torReady || (await checkTorRunning())
  return {
    running,
    embedded: torReady && !!torProcess,
    pid: torProcess?.pid || null,
    host: store.get('torHost', '127.0.0.1'),
    port: store.get('torPort', 9050),
    exePath: findTorExe() || ''
  }
})

ipcMain.handle('tor:start', async () => {
  store.set('useTor', true)
  const result = await startTor()
  if (result.ok) applyProxy(session.defaultSession)
  return result
})

ipcMain.handle('tor:stop', () => {
  store.set('useTor', false)
  const result = stopTor()
  applyProxy(session.defaultSession)
  return result
})

ipcMain.handle('tor:log', () => torLog.slice(-50))

ipcMain.handle('tor:set-path', (_, exePath) => {
  if (fs.existsSync(exePath)) {
    store.set('torExePath', exePath)
    return { ok: true }
  }
  return { ok: false, error: 'File tidak ditemukan' }
})

// Convert .onion URL ke Tor2Web gateway
ipcMain.handle('tor:tor2web', (_, onionUrl) => {
  const GATEWAYS = ['https://onion.ws', 'https://onion.pet', 'https://onion.ly', 'https://onion.moe']
  try {
    const u = new URL(onionUrl)
    const converted = `${GATEWAYS[0]}/${u.hostname}${u.pathname}${u.search}`
    return { ok: true, url: converted, gateway: GATEWAYS[0], alternatives: GATEWAYS.slice(1).map(g => `${g}/${u.hostname}${u.pathname}`) }
  } catch (_) { return { ok: false, error: 'URL tidak valid' } }
})

// System memory info
ipcMain.handle('system:memory', () => {
  const os = require('os')
  const total = os.totalmem()
  const free = os.freemem()
  const process_mem = process.memoryUsage()
  return {
    total: Math.round(total / 1024 / 1024),
    free: Math.round(free / 1024 / 1024),
    used: Math.round((total - free) / 1024 / 1024),
    app: Math.round(process_mem.rss / 1024 / 1024),
    heap: Math.round(process_mem.heapUsed / 1024 / 1024),
  }
})

// Download file helper
ipcMain.handle('download:start', async (e, url) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) win.webContents.downloadURL(url)
  return true
})

// ── Search Proxy (KuroSearch) ───────────────────────────
ipcMain.handle('search:fetch', async (_, { engine, query, category, onion }) => {
  const https = require('https')
  const http = require('http')
  const zlib = require('zlib')

  // Generic HTTP fetch helper (supports gzip)
  const doFetch = (url, headers = {}, timeoutMs = 9000) => new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url)
      const proto = parsed.protocol === 'https:' ? https : http
      const options = {
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          ...headers
        },
        timeout: timeoutMs
      }
      const req = proto.request(options, res => {
        const chunks = []
        res.on('data', c => chunks.push(c))
        res.on('end', () => {
          const buf = Buffer.concat(chunks)
          const enc = res.headers['content-encoding']
          if (enc === 'gzip') {
            zlib.gunzip(buf, (e, d) => e ? reject(e) : resolve({ status: res.statusCode, body: d.toString('utf8'), headers: res.headers }))
          } else if (enc === 'deflate') {
            zlib.inflate(buf, (e, d) => e ? reject(e) : resolve({ status: res.statusCode, body: d.toString('utf8'), headers: res.headers }))
          } else {
            resolve({ status: res.statusCode, body: buf.toString('utf8'), headers: res.headers })
          }
        })
      })
      req.on('error', reject)
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
      req.end()
    } catch (e) { reject(e) }
  })

  // ── Onion / Tor search via Ahmia ──────────────────────
  if (onion) {
    try {
      const url = `https://ahmia.fi/search/?q=${encodeURIComponent(query)}`
      const res = await doFetch(url, { 'Accept': 'text/html' }, 12000)
      if (res.status === 200) {
        const results = []
        // Parse Ahmia HTML results
        const re = /<li class="result"[\s\S]*?<a href="(http[^"]+)">([\s\S]*?)<\/a>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/g
        let m
        while ((m = re.exec(res.body)) !== null && results.length < 20) {
          const rawUrl = m[1].replace(/^https?:\/\/ahmia\.fi\/redirect\/\?.*?url=/, '')
          const title = m[2].replace(/<[^>]+>/g, '').trim()
          const desc = m[3].replace(/<[^>]+>/g, '').trim()
          if (title && rawUrl) results.push({ title, url: decodeURIComponent(rawUrl), desc, source: 'ahmia', onion: true })
        }
        // Simpler fallback regex
        if (results.length === 0) {
          const re2 = /href="(https?:\/\/[a-z2-7]{16,56}\.onion[^"]*)"[^>]*>([\s\S]{1,120}?)<\/a>/g
          while ((re2.exec(res.body)) !== null && results.length < 20) {
            results.push({ title: RegExp.$2.replace(/<[^>]+>/g, '').trim(), url: RegExp.$1, desc: '', source: 'ahmia', onion: true })
          }
        }
        return { ok: true, results, suggestions: [], onion: true }
      }
    } catch (e) {
      console.error('[KuroSearch] Ahmia error:', e.message)
    }
    // Fallback onion index
    return {
      ok: true,
      results: [
        { title: 'DuckDuckGo Onion', url: 'https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion/', desc: 'Mesin pencari anonim via Tor', source: 'onion' },
        { title: 'ProPublica Onion', url: 'https://p53lf57qovyuvwsc6xnrppyply3vtqm7l6pcobkmyqg2nd5ruggzdvyd.onion/', desc: 'Berita investigatif', source: 'onion' },
        { title: 'The Intercept Onion', url: 'https://27m3p2uv7igmj6kvd4ql3cct5h3sdwrsajovkkndeufumzyfhlfev6qd.onion/', desc: 'Jurnalisme independen', source: 'onion' },
        { title: 'BBC Onion', url: 'https://bbcnewsd73hkzno2ini43t4gblxvycyac5aw4gnv7t2rccijh7745uqd.onion/', desc: 'Berita internasional BBC', source: 'onion' },
        { title: 'Facebook Onion', url: 'https://facebookwkhpilnemxj7ascrwwwear5gblkk4hm3yfqo3bcyvvqcijb3id.onion/', desc: 'Facebook via Tor', source: 'onion' },
      ],
      suggestions: [],
      onion: true
    }
  }

  try {
    // ═══════════════════════════════════════════════════
    // KURO SEARCH ENGINE — Multi-layer fallback
    // Layer 1: Brave Search API (gratis, no key, reliable)
    // Layer 2: DDG HTML scraping
    // Layer 3: Wikipedia + DuckDuckGo Instant Answer
    // Layer 4: SearXNG instances (sering timeout, last resort)
    // ═══════════════════════════════════════════════════

    // ── Layer 1: Brave Search API ──────────────────────
    // Brave punya free tier tanpa API key untuk hasil terbatas
    try {
      const braveUrl = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web&format=json`
      const res = await doFetch(braveUrl, {
        'Accept': 'application/json',
        'X-Subscription-Token': 'no-key',
      }, 7000)
      if (res.status === 200) {
        try {
          const data = JSON.parse(res.body)
          if (data?.web?.results?.length) {
            return {
              ok: true,
              results: data.web.results.slice(0, 20).map(r => ({
                title: r.title, url: r.url,
                desc: r.description || '',
                source: 'brave',
              })),
              suggestions: data.query?.spellcheck_off ? [] : []
            }
          }
        } catch (_) { }
      }
    } catch (_) { }

    // ── Layer 2: DDG HTML scraping (sangat reliable) ────
    try {
      // DDG HTML endpoint — tidak butuh JS, bisa di-scrape
      const vqd = await (async () => {
        try {
          const r = await doFetch(`https://duckduckgo.com/?q=${encodeURIComponent(query)}`, {}, 5000)
          const m = r.body.match(/vqd=([\d-]+)/)
          return m?.[1] || ''
        } catch { return '' }
      })()

      if (vqd) {
        const ddgApiUrl = `https://links.duckduckgo.com/d.js?q=${encodeURIComponent(query)}&vqd=${vqd}&kl=id-id&l=id-id&p=1&s=0&df=&ex=-1`
        const res = await doFetch(ddgApiUrl, {
          'Accept': '*/*',
          'Referer': 'https://duckduckgo.com/',
        }, 8000)
        if (res.status === 200) {
          // Parse DDG result JSON embedded in JS
          const jsonMatch = res.body.match(/DDG\.pageLayout\.load\('d',(\[.+\])\)/)
          if (jsonMatch) {
            const items = JSON.parse(jsonMatch[1])
            const results = items.filter(i => i.u && i.t).slice(0, 20).map(i => ({
              title: i.t || '',
              url: i.u || '',
              desc: i.a || i.e || '',
              source: 'ddg'
            }))
            if (results.length > 0) {
              return { ok: true, results, suggestions: [] }
            }
          }
        }
      }
    } catch (_) { }

    // ── Layer 3: DDG Instant Answer + enrichment ────────
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=id-id`
    const ddgRes = await doFetch(ddgUrl, {}, 8000)
    let ddgAbstract = null, ddgAnswer = '', ddgSuggestions = []
    if (ddgRes.status === 200) {
      const data = JSON.parse(ddgRes.body)
      const results = []
        ; (data.RelatedTopics || []).forEach(t => {
          if (t.FirstURL && t.Text) {
            results.push({ title: t.Text.split(' - ')[0] || t.Text.substring(0, 80), url: t.FirstURL, desc: t.Text, source: 'ddg' })
          } else if (t.Topics) {
            t.Topics.forEach(sub => {
              if (sub.FirstURL) results.push({ title: sub.Text?.substring(0, 80) || sub.FirstURL, url: sub.FirstURL, desc: sub.Text || '', source: 'ddg' })
            })
          }
        })
      if (data.AbstractURL) {
        results.unshift({ title: data.Heading || query, url: data.AbstractURL, desc: data.AbstractText || '', source: data.AbstractSource || 'ddg', img: data.Image || '', isAbstract: true })
        ddgAbstract = { text: data.AbstractText, url: data.AbstractURL, source: data.AbstractSource, img: data.Image }
      }
      if (data.Answer) ddgAnswer = data.Answer
      ddgSuggestions = (data.RelatedTopics || []).slice(0, 8).map(t => t.Text?.split(' - ')[0]).filter(Boolean)
      if (results.length > 0) {
        return { ok: true, results: results.slice(0, 20), abstract: ddgAbstract, answer: ddgAnswer, suggestions: ddgSuggestions }
      }
    }

    // ── Layer 4: Wikipedia (selalu berfungsi) ───────────
    try {
      const wikiUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=10&srprop=snippet`
      const wikiRes = await doFetch(wikiUrl, { 'Accept': 'application/json', 'Origin': 'https://id.wikipedia.org' }, 6000)
      if (wikiRes.status === 200) {
        const data = JSON.parse(wikiRes.body)
        const wikiResults = (data.query?.search || []).map(r => ({
          title: r.title,
          // PENTING: jangan double-encode — title sudah plain text dari API
          url: `https://id.wikipedia.org/wiki/${r.title.replace(/ /g, '_')}`,
          desc: r.snippet?.replace(/<[^>]+>/g, '') || '',
          source: 'wikipedia'
        }))
        if (wikiResults.length > 0) {
          // Tambah GitHub & Reddit juga
          const extra = []
          try {
            const ghRes = await doFetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=3`, { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'KuroSearch/2.5' }, 5000)
            if (ghRes.status === 200) {
              const gh = JSON.parse(ghRes.body)
                ; (gh.items || []).slice(0, 3).forEach(r => extra.push({ title: r.full_name, url: r.html_url, desc: `${r.description || ''} ⭐${(r.stargazers_count || 0).toLocaleString()} ${r.language || ''}`, source: 'github', community: 'github' }))
            }
          } catch (_) { }
          try {
            const rdRes = await doFetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=3&t=year`, { 'Accept': 'application/json' }, 5000)
            if (rdRes.status === 200) {
              const rd = JSON.parse(rdRes.body)
                ; (rd.data?.children || []).slice(0, 3).forEach(r => extra.push({ title: r.data.title, url: `https://www.reddit.com${r.data.permalink}`, desc: `r/${r.data.subreddit} • ${(r.data.score || 0).toLocaleString()} upvotes`, source: 'reddit', community: 'reddit' }))
            }
          } catch (_) { }
          return { ok: true, results: [...wikiResults, ...extra], abstract: ddgAbstract, answer: ddgAnswer, suggestions: ddgSuggestions }
        }
      }
    } catch (_) { }

    // ── Layer 5: SearXNG (last resort) ──────────────────
    const SEARX_INSTANCES = [
      'https://searx.be',
      'https://search.sapti.me',
      'https://searx.tiekoetter.com',
      'https://paulgo.io',
      'https://search.bus-hit.me',
    ]
    for (const base of SEARX_INSTANCES) {
      try {
        const cat = category === 'berita' ? 'news' : 'general'
        const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&language=id-ID&categories=${cat}&pageno=1`
        const res = await doFetch(url, { 'Accept': 'application/json' }, 6000)
        if (res.status === 200) {
          let data
          try { data = JSON.parse(res.body) } catch (_) { continue }
          if (data?.results?.length > 0) {
            return {
              ok: true,
              results: data.results.slice(0, 20).map(r => ({ title: r.title || r.url, url: r.url, desc: r.content || '', source: r.engine || 'searx', img: r.thumbnail || '' })),
              suggestions: data.suggestions?.slice(0, 8) || []
            }
          }
        }
      } catch (_) { continue }
    }

    return { ok: false, results: [], suggestions: [] }
  } catch (e) {
    return { ok: false, error: e.message, results: [], suggestions: [] }
  }
})

// Onion search dedicated handler
ipcMain.handle('search:onion', async (_, query) => {
  return ipcMain._events['search:fetch']?.(null, { query, onion: true })
})

// Saran pencarian real-time
ipcMain.handle('search:suggest', async (_, query) => {
  const https = require('https')
  const doGet = (url) => new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': getRandomUA() }, timeout: 3000 }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
  })
  try {
    // DDG autocomplete
    const url = `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=list`
    const raw = await doGet(url)
    const data = JSON.parse(raw)
    const phrases = Array.isArray(data) ? (data[1] || []) : []
    return phrases.slice(0, 8)
  } catch (_) {
    return []
  }
})

// Image search proxy
ipcMain.handle('search:images', async (_, query) => {
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iar=images&iax=images&ia=images`
  return { ok: true, images: [{ url, isLink: true }] }
})

// ── Terminal Injection IPC ──────────────────────────────
// These run JS in the focused BrowserWindow's webContents
// (the webview inside the renderer forwards results back)
ipcMain.handle('terminal:inject', async (e, script) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return { ok: false, error: 'No window' }
  // Execute in the renderer; the renderer's TerminalPanel calls this
  // The actual webview execution is done client-side via webview.executeJavaScript
  return { ok: true, note: 'Use webview.executeJavaScript from renderer' }
})

ipcMain.handle('terminal:cookies', async (e) => {
  try {
    const cookies = await session.defaultSession.cookies.get({})
    return { ok: true, cookies: cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path, secure: c.secure, httpOnly: c.httpOnly })) }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

ipcMain.handle('terminal:clearsite', async (e, url) => {
  try {
    if (url) await session.defaultSession.clearStorageData({ origin: url })
    else await session.defaultSession.clearStorageData()
    await session.defaultSession.clearCache()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
})

// ── Kuro AI via Gemini IPC (main process bypass CORS) ──
ipcMain.handle('ai:gemini', async (_, { key, model, messages, systemPrompt }) => {
  const https = require('https')
  const gModel = model || 'gemini-2.0-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${key}`

  const body = JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt || 'Kamu adalah Kuro AI, asisten browser Kuro Akira. Jawab dalam Bahasa Indonesia.' }] },
    contents: messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
  })

  return new Promise((resolve) => {
    const parsed = new URL(url)
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 20000
    }, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => {
        try {
          const data = JSON.parse(d)
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
          resolve({ ok: !!text, text, status: res.statusCode })
        } catch (e) { resolve({ ok: false, error: e.message, raw: d.substring(0, 200) }) }
      })
    })
    req.on('error', e => resolve({ ok: false, error: e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Timeout 20s' }) })
    req.write(body)
    req.end()
  })
})

console.log('[KuroAkira] v2.6 Browser started')
