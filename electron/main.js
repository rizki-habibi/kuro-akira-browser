const {
  app, BrowserWindow, ipcMain, session, Menu, shell, dialog
} = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')
const Store = require('electron-store')

// ═══════════════════════════════════════════════════════
// KURO AKIRA BROWSER v2.1 — Main Process
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
  }
})

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
    callback({ responseHeaders: headers })
  })

  if (privacy === 'paranoid') ses.clearStorageData()
}

// ── Proxy / VPN / Tor ───────────────────────────────────
async function applyProxy(ses) {
  const useTor = store.get('useTor')
  const vpnEnabled = store.get('vpnEnabled')
  const vpnServer = store.get('vpnServer')

  if (useTor) {
    const h = store.get('torHost', '127.0.0.1')
    const p = store.get('torPort', 9050)
    await ses.setProxy({ proxyRules: `socks5://${h}:${p}` })
    console.log(`[KuroAkira] Tor AKTIF: socks5://${h}:${p}`)
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
      allowRunningInsecureContent: false,
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
  configureSession(session.defaultSession)
  applyProxy(session.defaultSession)
  Menu.setApplicationMenu(null)
  return win
}

// ── Auto Updater ────────────────────────────────────────
function setupAutoUpdater(win) {
  autoUpdater.autoDownload = false
  autoUpdater.on('update-available', (info) => {
    win.webContents.send('updater:available', info)
  })
  autoUpdater.on('update-not-available', () => {
    win.webContents.send('updater:not-available')
  })
  autoUpdater.on('download-progress', (p) => {
    win.webContents.send('updater:progress', p)
  })
  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('updater:downloaded', info)
  })
  autoUpdater.on('error', (e) => {
    win.webContents.send('updater:error', e.message)
  })
  // Cek update setiap 30 menit
  setTimeout(() => { try { autoUpdater.checkForUpdates() } catch (_) { } }, 5000)
  setInterval(() => { try { autoUpdater.checkForUpdates() } catch (_) { } }, 30 * 60 * 1000)
}

// ── App Switches ────────────────────────────────────────
app.commandLine.appendSwitch('disable-background-networking')
app.commandLine.appendSwitch('disable-sync')
app.commandLine.appendSwitch('metrics-recording-only')
app.commandLine.appendSwitch('no-first-run')
app.commandLine.appendSwitch('disable-webrtc')
app.commandLine.appendSwitch('force-dark-mode')
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy')

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
ipcMain.handle('settings:set', (_, key, value) => {
  store.set(key, value)
  if (['privacyLevel', 'adBlockEnabled', 'userAgent', 'customUserAgent'].includes(key)) configureSession(session.defaultSession)
  if (['useTor', 'torHost', 'torPort', 'vpnEnabled', 'vpnServer'].includes(key)) applyProxy(session.defaultSession)
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
ipcMain.handle('updater:check', () => { try { autoUpdater.checkForUpdates() } catch (_) { } return true })
ipcMain.handle('updater:download', () => { autoUpdater.downloadUpdate() })
ipcMain.handle('updater:install', () => { autoUpdater.quitAndInstall() })

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
    // ── Layer 1: SearXNG (best real results) ──────────────
    const SEARX_INSTANCES = [
      'https://searx.be',
      'https://search.sapti.me',
      'https://searx.tiekoetter.com',
      'https://paulgo.io',
      'https://search.bus-hit.me',
    ]
    for (const base of SEARX_INSTANCES) {
      try {
        const cat = category === 'berita' ? 'news' : category === 'gambar' ? 'images' : 'general'
        const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&language=id-ID&categories=${cat}&pageno=1`
        const res = await doFetch(url, { 'Accept': 'application/json' }, 8000)
        if (res.status === 200) {
          let data
          try { data = JSON.parse(res.body) } catch (_) { continue }
          if (data?.results?.length > 0) {
            // Also grab DDG instant answer for abstract/answer box
            let abstract = null, answer = '', suggestions = data.suggestions?.slice(0, 8) || []
            try {
              const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=id-id`
              const ddgRes = await doFetch(ddgUrl, {}, 5000)
              if (ddgRes.status === 200) {
                const ddg = JSON.parse(ddgRes.body)
                if (ddg.AbstractText) abstract = { text: ddg.AbstractText, url: ddg.AbstractURL, source: ddg.AbstractSource, img: ddg.Image }
                if (ddg.Answer) answer = ddg.Answer
                if (!suggestions.length) suggestions = (ddg.RelatedTopics || []).slice(0, 8).map(t => t.Text?.split(' - ')[0]).filter(Boolean)
              }
            } catch (_) { }
            return {
              ok: true,
              results: data.results.slice(0, 25).map(r => ({
                title: r.title || r.url, url: r.url,
                desc: r.content || r.snippet || '',
                source: r.engine || 'searx',
                img: r.thumbnail || r.img_src || ''
              })),
              abstract, answer, suggestions,
              engine_used: base
            }
          }
        }
      } catch (_) { continue }
    }

    // ── Layer 2: DuckDuckGo Instant Answer + HTML scrape ──
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1&kl=id-id`
    const ddgRes = await doFetch(ddgUrl, {}, 8000)
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
      }
      if (results.length > 0) {
        return {
          ok: true, results: results.slice(0, 20),
          abstract: { text: data.AbstractText, url: data.AbstractURL, source: data.AbstractSource, img: data.Image },
          answer: data.Answer,
          suggestions: (data.RelatedTopics || []).slice(0, 8).map(t => t.Text?.split(' - ')[0]).filter(Boolean)
        }
      }
    }

    // ── Layer 3: Mojeek (real web index, no JS needed) ────
    try {
      const url = `https://www.mojeek.com/search?q=${encodeURIComponent(query)}&fmt=json`
      const res = await doFetch(url, { 'Accept': 'application/json' }, 8000)
      if (res.status === 200) {
        const data = JSON.parse(res.body)
        if (data?.response?.results?.length) {
          return {
            ok: true,
            results: data.response.results.slice(0, 20).map(r => ({ title: r.title, url: r.url, desc: r.desc || '', source: 'mojeek' })),
            suggestions: []
          }
        }
      }
    } catch (_) { }

    return { ok: false, results: [], suggestions: [] }
  } catch (e) {
    return { ok: false, error: e.message, results: [], suggestions: [] }
  }
})

// Onion search dedicated handler
ipcMain.handle('search:onion', async (_, query) => {
  return ipcMain._events['search:fetch']?.(null, { query, onion: true })
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

console.log('[KuroAkira] v2.3 Browser started')
