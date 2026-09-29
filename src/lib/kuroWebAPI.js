// Kuro Akira Browser — Web Runtime Engine & KuroAPI Polyfill
// Menghubungkan antarmuka React dengan backend Express & sistem multi-container cookies/IP
import { safeStorage } from './storage'

const DEFAULT_SETTINGS = {
  privacyLevel: 'high',
  useTor: false,
  torHost: '127.0.0.1',
  torPort: 9050,
  adBlockEnabled: true,
  fingerprintProtection: true,
  userAgent: 'random',
  customUserAgent: '',
  theme: 'dark',
  homepage: 'kuro://newtab',
  windowBounds: { width: 1360, height: 860 },
  blockedCount: 42,
  kuroCoins: 15,
  searchEngine: 'kuro',
  onionEnabled: false,
  vpnEnabled: false,
  vpnServer: 'sg-node-1',
  rewardEnabled: true,
  activeProfile: 'Profil Utama',
  activeContainerId: 'proton-1',
  torExePath: '',
  torDataPath: '',
  aiProvider: 'gemini',
  geminiModel: 'gemini-2.5-flash',
}

// Data awal Multi-Container & Kukis
const INITIAL_CONTAINERS = [
  {
    id: 'default',
    name: 'Tab Standar',
    color: '#9e9e9e',
    icon: '🌐',
    ip: '104.28.19.42',
    country: 'Indonesia',
    flag: '🇮🇩',
    city: 'Jakarta',
    isp: 'Cloudflare Network',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    cookies: [
      { name: 'pref_lang', value: 'id', domain: 'all', path: '/', secure: false, httpOnly: false, expires: '2027-01-01' }
    ]
  },
  {
    id: 'proton-1',
    name: 'Akun Proton #1 (Alice)',
    color: '#4caf50',
    icon: '🛡️',
    ip: '185.70.41.12',
    country: 'Switzerland',
    flag: '🇨🇭',
    city: 'Zurich',
    isp: 'Proton AG Datacenter',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
    cookies: [
      { name: 'AUTH_USER', value: 'alice.smith@proton.me', domain: 'proton.me', path: '/', secure: true, httpOnly: true, expires: '2027-12-31' },
      { name: 'SessionToken', value: 'pro_sess_ch_881920aa7f3b', domain: 'proton.me', path: '/', secure: true, httpOnly: true, expires: '2027-12-31' },
      { name: 'AUTH_UID', value: 'usr_ch_001_alice', domain: 'proton.me', path: '/', secure: true, httpOnly: false, expires: '2027-12-31' },
      { name: 'cf_clearance', value: 'v7zz_ch_alice_cf_89', domain: 'proton.me', path: '/', secure: true, httpOnly: true, expires: '2027-12-31' }
    ]
  },
  {
    id: 'proton-2',
    name: 'Akun Proton #2 (Bob)',
    color: '#2196f3',
    icon: '💼',
    ip: '194.126.177.8',
    country: 'Netherlands',
    flag: '🇳🇱',
    city: 'Amsterdam',
    isp: 'Proton AG Exit Route NL',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Chrome/126.0.0.0',
    cookies: [
      { name: 'AUTH_USER', value: 'bob.crypto@proton.me', domain: 'proton.me', path: '/', secure: true, httpOnly: true, expires: '2027-12-31' },
      { name: 'SessionToken', value: 'pro_sess_nl_994112cc4e2a', domain: 'proton.me', path: '/', secure: true, httpOnly: true, expires: '2027-12-31' },
      { name: 'AUTH_UID', value: 'usr_nl_002_bob', domain: 'proton.me', path: '/', secure: true, httpOnly: false, expires: '2027-12-31' },
      { name: 'cf_clearance', value: 'v7zz_nl_bob_cf_12', domain: 'proton.me', path: '/', secure: true, httpOnly: true, expires: '2027-12-31' }
    ]
  },
  {
    id: 'proton-fresh',
    name: 'Akun Proton #3 (Kukis Bersih)',
    color: '#ff9800',
    icon: '✨',
    ip: '185.70.40.88',
    country: 'Switzerland',
    flag: '🇨🇭',
    city: 'Geneva',
    isp: 'Proton AG Datacenter Geneva',
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
    cookies: []
  },
  {
    id: 'tor-onion',
    name: 'Tor Anonim (.onion)',
    color: '#9c27b0',
    icon: '🧅',
    ip: '185.220.101.5',
    country: 'Germany',
    flag: '🇩🇪',
    city: 'Frankfurt (Tor Exit Node)',
    isp: 'Tor Exit Relay Association',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0',
    cookies: []
  }
]

// Simpan/baca local state
function getStoredSettings() {
  const raw = safeStorage.getJSON('kuro_settings', null)
  return raw ? { ...DEFAULT_SETTINGS, ...raw } : { ...DEFAULT_SETTINGS }
}

function saveStoredSettings(s) {
  safeStorage.setJSON('kuro_settings', s)
}

function getStoredContainers() {
  const raw = safeStorage.getJSON('kuro_containers', null)
  return Array.isArray(raw) && raw.length ? raw : INITIAL_CONTAINERS
}

function saveStoredContainers(list) {
  safeStorage.setJSON('kuro_containers', list)
}

const listeners = new Map()

export function initKuroWebAPI() {
  if (typeof window === 'undefined') return

  let settingsState = getStoredSettings()
  let containersState = getStoredContainers()
  let blockedCount = Number(safeStorage.getItem('kuro_blocked_count')) || 42
  let coins = Number(safeStorage.getItem('kuro_coins')) || 15
  let isTorRunning = false
  const torLogs = [
    '[Tor] Inisialisasi sirkuit virtual...',
    '[Tor] 10%: Connecting to directory servers',
    '[Tor] 45%: Loading relay descriptors',
    '[Tor] 80%: Connecting to entry guards',
    '[Tor] 100%: Done. 127.0.0.1:9050 siap digunakan.'
  ]

  // IP pool generator per negara
  const IP_POOLS = {
    Switzerland: ['185.70.41.12', '185.70.41.44', '185.70.40.88', '185.70.40.105', '195.176.255.9'],
    Netherlands: ['194.126.177.8', '194.126.177.22', '194.126.176.51', '185.107.56.88'],
    Germany: ['185.220.101.5', '185.220.101.99', '185.220.102.8', '194.26.29.112'],
    Iceland: ['185.159.158.14', '185.159.158.88', '193.107.85.12'],
    USA: ['198.51.100.15', '198.51.100.74', '142.250.190.46', '104.244.42.1'],
    Indonesia: ['104.28.19.42', '104.28.19.99', '103.147.32.18']
  }

  window.kuroAPI = {
    // ── Window Controls ──
    window: {
      minimize: () => console.log('[KuroAPI] minimize window'),
      maximize: () => console.log('[KuroAPI] maximize window'),
      close: () => console.log('[KuroAPI] close window'),
      isMaximized: () => false,
      openNew: () => {
        window.open(window.location.origin, '_blank')
      },
      getCount: async () => 1,
    },

    // ── Settings ──
    settings: {
      get: async () => {
        return { ...settingsState }
      },
      set: async (key, val) => {
        settingsState = { ...settingsState, [key]: val }
        saveStoredSettings(settingsState)
        return true
      },
      reset: async () => {
        settingsState = { ...DEFAULT_SETTINGS }
        saveStoredSettings(settingsState)
        return settingsState
      },
    },

    // ── Multi-Container & Isolated Cookies ──
    containers: {
      getAll: async () => {
        return containersState
      },
      list: async () => {
        return containersState
      },
      get: async (id) => {
        return containersState.find(c => c.id === id) || containersState[0]
      },
      create: async (container) => {
        const id = 'cont-' + Date.now().toString(36)
        const country = container.country || 'Switzerland'
        const pool = IP_POOLS[country] || IP_POOLS.Switzerland
        const randomIP = pool[Math.floor(Math.random() * pool.length)]
        const newC = {
          id,
          name: container.name || 'Container Baru',
          color: container.color || '#ff3b3b',
          icon: container.icon || '🛡️',
          ip: container.ip || randomIP,
          country,
          flag: container.flag || (country === 'Switzerland' ? '🇨🇭' : country === 'Netherlands' ? '🇳🇱' : country === 'Germany' ? '🇩🇪' : country === 'Iceland' ? '🇮🇸' : '🌐'),
          city: container.city || 'Zurich',
          isp: container.isp || 'Secure Virtual Tunnel',
          userAgent: container.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          cookies: container.cookies || []
        }
        containersState.push(newC)
        saveStoredContainers(containersState)
        fetch('/api/containers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newC)
        }).catch(() => {})
        return newC
      },
      update: async (id, updates) => {
        containersState = containersState.map(c => c.id === id ? { ...c, ...updates } : c)
        saveStoredContainers(containersState)
        const updated = containersState.find(c => c.id === id)
        if (updated) {
          fetch(`/api/containers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          }).catch(() => {})
        }
        return updated
      },
      delete: async (id) => {
        if (containersState.length <= 1) return false
        containersState = containersState.filter(c => c.id !== id)
        saveStoredContainers(containersState)
        fetch(`/api/containers/${id}`, { method: 'DELETE' }).catch(() => {})
        return true
      },
      rotateIP: async (id) => {
        const c = containersState.find(x => x.id === id)
        if (!c) return null
        const pool = IP_POOLS[c.country] || IP_POOLS.Switzerland
        const otherIPs = pool.filter(ip => ip !== c.ip)
        const nextIP = otherIPs.length ? otherIPs[Math.floor(Math.random() * otherIPs.length)] : pool[0]
        c.ip = nextIP
        saveStoredContainers(containersState)
        fetch(`/api/containers/${id}/rotate-ip`, { method: 'POST' }).catch(() => {})
        return c.ip
      },
      getCookies: async (id, domain = '') => {
        const c = containersState.find(x => x.id === id)
        if (!c) return []
        if (!domain) return c.cookies || []
        return (c.cookies || []).filter(k => k.domain === 'all' || domain.includes(k.domain) || k.domain.includes(domain))
      },
      setCookie: async (id, cookie) => {
        const c = containersState.find(x => x.id === id)
        if (!c) return false
        if (!c.cookies) c.cookies = []
        const idx = c.cookies.findIndex(k => k.name === cookie.name && (k.domain === cookie.domain || !cookie.domain))
        const item = {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain || 'all',
          path: cookie.path || '/',
          secure: cookie.secure !== false,
          httpOnly: cookie.httpOnly || false,
          expires: cookie.expires || new Date(Date.now() + 365*86400000).toISOString().split('T')[0]
        }
        if (idx >= 0) c.cookies[idx] = item
        else c.cookies.push(item)
        saveStoredContainers(containersState)
        fetch(`/api/containers/${id}/cookies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        }).catch(() => {})
        return true
      },
      deleteCookie: async (id, cookieName, domain = '') => {
        const c = containersState.find(x => x.id === id)
        if (!c || !c.cookies) return false
        c.cookies = c.cookies.filter(k => !(k.name === cookieName && (!domain || k.domain === domain)))
        saveStoredContainers(containersState)
        fetch(`/api/containers/${id}/cookies/${encodeURIComponent(cookieName)}`, { method: 'DELETE' }).catch(() => {})
        return true
      },
      clearCookies: async (id) => {
        const c = containersState.find(x => x.id === id)
        if (!c) return false
        c.cookies = []
        saveStoredContainers(containersState)
        fetch(`/api/containers/${id}/clear-cookies`, { method: 'POST' }).catch(() => {})
        return true
      },
      cloneContainer: async (id, newName) => {
        const source = containersState.find(x => x.id === id)
        if (!source) return null
        const cloneId = 'cont-' + Date.now().toString(36)
        const pool = IP_POOLS[source.country] || IP_POOLS.Switzerland
        const randomIP = pool[Math.floor(Math.random() * pool.length)]
        const cloned = {
          ...JSON.parse(JSON.stringify(source)),
          id: cloneId,
          name: newName || `${source.name} (Clone)`,
          ip: randomIP
        }
        containersState.push(cloned)
        saveStoredContainers(containersState)
        fetch('/api/containers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cloned)
        }).catch(() => {})
        return cloned
      }
    },

    // ── Stats & AdBlock ──
    stats: {
      getBlocked: async () => blockedCount,
      resetBlocked: async () => {
        blockedCount = 0
        safeStorage.setItem('kuro_blocked_count', '0')
        return 0
      },
      getCoins: async () => coins,
      addCoins: async (n) => {
        coins += n
        safeStorage.setItem('kuro_coins', String(coins))
        return coins
      },
    },

    // ── Privacy ──
    privacy: {
      clearData: async (types) => {
        console.log('[KuroAPI] Cleared privacy data:', types)
        return { ok: true }
      }
    },

    // ── Shell ──
    shell: {
      openExternal: async (url) => {
        window.open(url, '_blank')
        return true
      }
    },

    // ── Search API (panggilan ke server /api/search dengan fallback) ──
    search: {
      fetch: async (opts) => {
        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(opts)
          })
          if (res.ok) {
            return await res.json()
          }
        } catch (e) {
          console.warn('[KuroAPI] Backend search failed, using fallback:', e)
        }

        // Fallback search engine simulator jika backend proxy sementara sibuk
        const q = (opts?.query || '').toLowerCase()
        const isOnion = opts?.onion

        if (isOnion) {
          return {
            ok: true,
            onion: true,
            results: [
              { title: 'DuckDuckGo Onion Service', url: 'https://duckduckgogg42xjoc72x3sjasowoarfbgcmvfimaftt6twagswzczad.onion', desc: 'Pencarian web privat dan anonim melalui jaringan Tor tanpa pelacakan.', source: 'Ahmia Onion', onion: true },
              { title: 'Proton Mail Tor Hidden Service', url: 'https://protonmailrmez3lotccipshtkleegetegsdgmanvdaxihur3sd4pid.onion', desc: 'Email terenkripsi ujung-ke-ujung berbasis di Swiss dengan domain .onion.', source: 'Ahmia Onion', onion: true },
              { title: 'ProPublica Onion Mirror', url: 'https://p53lf57qovyuvwsc6xnrppyply3vtqm7l6pcobkmyqg2nd5ruggzdvyd.onion', desc: 'Jurnalisme investigasi independen untuk kepentingan publik via Tor.', source: 'Ahmia Onion', onion: true },
              { title: 'The Tor Project Repository', url: 'http://2gzyxa5ihm7nsggfxnu52r2g26qd3agfdspxvq25mbfw6fdmmf Calculate.onion', desc: 'Arsip resmi paket perangkat lunak dan dokumentasi Tor Network.', source: 'Ahmia Onion', onion: true },
              { title: `Ahmia Search: ${opts?.query}`, url: `https://ahmia.fi/search/?q=${encodeURIComponent(opts?.query || '')}`, desc: 'Hasil indeks katalog onion publik dari Ahmia.fi crawler.', source: 'Ahmia', onion: true }
            ]
          }
        }

        return {
          ok: true,
          results: [
            { title: `${opts?.query} - Informasi Lengkap & Referensi`, url: `https://id.wikipedia.org/wiki/${encodeURIComponent(opts?.query || '')}`, desc: `Kompilasi artikel ensiklopedia terverifikasi mengenai ${opts?.query}. Temukan sejarah, konsep, dan analisis mendalam.`, source: 'KuroIndex' },
            { title: `Panduan Terkini: ${opts?.query}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(opts?.query || '')}`, desc: `Hasil pencarian privacy-friendly tercepat dan terpercaya untuk kueri ${opts?.query}.`, source: 'DuckDuckGo' },
            { title: `Repositori Terkait ${opts?.query} di GitHub`, url: `https://github.com/search?q=${encodeURIComponent(opts?.query || '')}`, desc: `Kode sumber terbuka, library, dan tools pengembang untuk ${opts?.query}.`, source: 'GitHub' },
            { title: `Dokumentasi dan Diskusi seputar ${opts?.query}`, url: `https://reddit.com/search/?q=${encodeURIComponent(opts?.query || '')}`, desc: `Forum diskusi komunitas pengembang dan pakar privasi tentang ${opts?.query}.`, source: 'Community' },
          ],
          suggestions: [`${opts?.query} tutorial`, `${opts?.query} indonesia`, `${opts?.query} privacy`, `${opts?.query} open source`]
        }
      },
      onion: async (q) => {
        return window.kuroAPI.search.fetch({ query: q, onion: true })
      },
      images: async (q) => {
        return {
          ok: true,
          images: [
            { title: `${q} Image 1`, url: 'https://picsum.photos/400/300?random=1', source: 'Unsplash' },
            { title: `${q} Image 2`, url: 'https://picsum.photos/400/300?random=2', source: 'Unsplash' },
            { title: `${q} Image 3`, url: 'https://picsum.photos/400/300?random=3', source: 'Unsplash' }
          ]
        }
      },
      suggest: async (q) => {
        const term = String(q || '').trim()
        if (!term) return []
        try {
          const res = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: term })
          })
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data.suggestions) && data.suggestions.length) return data.suggestions.slice(0, 8)
          }
        } catch (_) {}
        return [`${term} login`, `${term} download`, `${term} cara`, `${term} terbaru`]

      }
    },

    // ── AI Engine (Gemini 2.5 Flash via Server) ──
    ai: {
      gemini: async (opts) => {
        try {
          const res = await fetch('/api/ai/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(opts)
          })
          if (res.ok) {
            return await res.json()
          }
        } catch (e) {
          console.warn('[KuroAPI] AI backend call failed:', e)
        }
        return {
          ok: true,
          text: `Halo! Saya Kuro AI. Saya telah menganalisis permintaan Anda:\n\nBrowser Kuro Akira Anda kini aktif dengan fitur **Multi-Container Cookies & IP Isolation**.\n\nAnda dapat membuka tab akun Proton terpisah (misal Akun #1 dan Akun #2) dengan sesi kukis independen dan rute IP Swiss/Belanda yang terisolasi.`
        }
      }
    },

    // ── Terminal Tools ──
    terminal: {
      inject: async (script) => {
        try {
          // eslint-disable-next-line no-eval
          const res = window.eval ? window.eval(script) : 'Executed'
          return { ok: true, result: String(res) }
        } catch (e) {
          return { ok: false, error: e.message }
        }
      },
      getPageInfo: async () => {
        return {
          url: window.location.href,
          title: document.title,
          cookies: document.cookie,
          screen: `${window.innerWidth}x${window.innerHeight}`
        }
      },
      getCookies: async (containerId) => {
        const id = containerId || settingsState.activeContainerId || 'proton-1'
        const c = containersState.find(x => x.id === id)
        return c?.cookies || []
      },
      getLocalStorage: async () => {
        const items = {}
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i)
              items[k] = localStorage.getItem(k)
            }
          }
        } catch (_) {}
        return items
      },
      getDOMTree: async () => {
        return {
          tag: 'HTML',
          children: document.body ? document.body.children.length : 0
        }
      },
      clearSiteData: async () => {
        return { ok: true }
      }
    },

    // ── Tor Network Status ──
    tor: {
      check: async () => ({ running: isTorRunning, port: 9050 }),
      start: async () => {
        isTorRunning = true
        return { ok: true, running: true }
      },
      stop: async () => {
        isTorRunning = false
        return { ok: true, running: false }
      },
      log: async () => torLogs,
      setPath: async () => ({ ok: true }),
      tor2web: async (url) => {
        return url.replace('.onion', '.onion.pet')
      }
    },

    // ── System ──
    system: {
      memory: async () => {
        const mem = window.performance?.memory
        const used = mem ? Math.round(mem.usedJSHeapSize / 1048576) : 110
        const total = mem ? Math.round(mem.totalJSHeapSize / 1048576) : 240
        return {
          app: used,
          total: total,
          free: Math.max(10, total - used),
          used: used
        }
      }
    },

    // ── Downloads ──
    download: {
      start: async (url) => {
        window.open(url, '_blank')
        return { ok: true }
      }
    },

    // ── Shell / External links ──
    shell: {
      openExternal: async (url) => {
        try {
          window.open(url, '_blank', 'noopener,noreferrer')
          return { ok: true }
        } catch (e) {
          console.warn('[KuroAkira] openExternal error:', e)
          return { ok: false }
        }
      }
    },

    // ── Updater ──
    updater: {
      check: async () => ({ updateAvailable: false, version: '2.6.1' }),
      download: async () => ({ ok: true }),
      install: async () => ({ ok: true }),
      getVersion: async () => '2.6.1'
    },

    // ── Event Bus ──
    on: (channel, cb) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set())
      listeners.get(channel).add(cb)
    },
    off: (channel, cb) => {
      listeners.get(channel)?.delete(cb)
    },
    emit: (channel, ...args) => {
      listeners.get(channel)?.forEach(cb => {
        try { cb(...args) } catch (e) { console.error(e) }
      })
    }
  }

  console.log('[KuroAkira] Web runtime initialized successfully. Multi-container & cookie system ready.')
}
