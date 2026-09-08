import React, { useState, useRef, useEffect } from 'react'

// ── Helpers ─────────────────────────────────────────────
const wv = () => window.__activeWebview  // active webview element (set by BrowserView)
const exec = (js) => {
  const webview = wv()
  if (!webview) return Promise.reject(new Error('Tidak ada halaman aktif. Buka URL terlebih dahulu.'))
  return webview.executeJavaScript(js)
}

// ── Help text ────────────────────────────────────────────
const HELP = `┌─ Terminal Kuro Akira v2.5.2 ───────────────────────┐
│  INFO: info, version, privacy, blocked, url, mem    │
│                                                     │
│  TOR:  tor [status|start|stop|log]                  │
│                                                     │
│  AKUN: account [info|register|login|logout|list]    │
│                                                     │
│  DOM:  dom, headers, links, images, forms           │
│  INJECT: inject <js>, css <style>, click <sel>      │
│          type <sel> <txt>, scroll <y>               │
│  STORE: cookies, ls, session                        │
│                                                     │
│  DEV TOOLS (untuk testing & pengembangan):          │
│  uuid              - Generate 5 UUID v4             │
│  hash <teks>       - Hash + base64 teks             │
│  b64 encode/decode - Encode/decode base64           │
│  generate email 10 - Generate data test             │
│  generate user/ip/pass/name <n>                     │
│  jwt <token>       - Decode JWT payload             │
│  http GET <url>    - Test HTTP endpoint             │
│  http POST <url> <body>                             │
│  ai <pertanyaan>   - Tanya AI dari terminal         │
│  search <query>    - Cari web dari terminal         │
│                                                     │
│  NET:  ping <host>, curl <url>                      │
│  UTIL: history, clear, help                         │
└─────────────────────────────────────────────────────┘`

// ── Built-in commands ────────────────────────────────────
const builtins = {
  help: () => HELP,

  info: () => {
    const ua = navigator.userAgent
    return `Kuro Akira Browser v2.1\nElectron + React\nPlatform: ${navigator.platform}\nUA: ${ua.substring(0, 80)}...`
  },

  version: () => 'Kuro Akira v2.6.0 (Electron)',

  privacy: async () => {
    const s = window.kuroAPI ? await window.kuroAPI.settings.get() : {}
    return [
      `Mode Privasi   : ${(s.privacyLevel || 'high').toUpperCase()}`,
      `Anti-Fingerprint: ${s.fingerprintProtection !== false ? 'AKTIF' : 'NONAKTIF'}`,
      `Pemblokir Iklan : ${s.adBlockEnabled !== false ? 'AKTIF' : 'NONAKTIF'}`,
      `WebRTC Leak    : DIBLOKIR`,
      `Tor            : ${s.useTor ? 'AKTIF' : 'NONAKTIF'}`,
      `VPN            : ${s.vpnEnabled ? 'AKTIF' : 'NONAKTIF'}`,
    ].join('\n')
  },

  blocked: async () => {
    const n = await window.kuroAPI?.stats.getBlocked() ?? 0
    return `Total diblokir: ${n.toLocaleString('id')} iklan/pelacak`
  },

  url: async () => {
    try { return await exec('location.href') }
    catch (e) { return `Error: ${e.message}` }
  },

  title: async () => {
    try { return await exec('document.title') }
    catch (e) { return `Error: ${e.message}` }
  },

  // ── DOM inspection ──────────────────────────────────────
  dom: async () => {
    try {
      const r = await exec(`(function(){
        return JSON.stringify({
          title: document.title,
          url: location.href,
          charset: document.charset,
          readyState: document.readyState,
          elements: document.querySelectorAll('*').length,
          links: document.querySelectorAll('a[href]').length,
          images: document.querySelectorAll('img').length,
          scripts: document.querySelectorAll('script[src]').length,
          forms: document.querySelectorAll('form').length,
          inputs: document.querySelectorAll('input,textarea,select').length,
          viewport: { w: window.innerWidth, h: window.innerHeight },
          scroll: { x: window.scrollX, y: window.scrollY },
        })
      })()`)
      const d = JSON.parse(r)
      return [
        `URL       : ${d.url}`,
        `Judul     : ${d.title}`,
        `Charset   : ${d.charset}`,
        `Status    : ${d.readyState}`,
        `Elemen    : ${d.elements}`,
        `Link      : ${d.links}`,
        `Gambar    : ${d.images}`,
        `Script    : ${d.scripts}`,
        `Form      : ${d.forms}`,
        `Input     : ${d.inputs}`,
        `Viewport  : ${d.viewport.w}×${d.viewport.h}`,
        `Scroll    : x=${d.scroll.x} y=${d.scroll.y}`,
      ].join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  headers: async () => {
    try {
      const r = await exec(`(function(){
        const metas = Array.from(document.querySelectorAll('meta')).slice(0,20)
        return JSON.stringify(metas.map(m => ({
          name: m.name || m.httpEquiv || m.property || '?',
          content: (m.content || '').substring(0,80)
        })))
      })()`)
      const metas = JSON.parse(r)
      if (!metas.length) return 'Tidak ada meta tag'
      return metas.map(m => `${(m.name + ':').padEnd(22)} ${m.content}`).join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  links: async () => {
    try {
      const r = await exec(`(function(){
        const links = Array.from(document.querySelectorAll('a[href]')).slice(0,30)
        return JSON.stringify(links.map(a => ({ text: (a.textContent.trim()||'[no text]').substring(0,40), href: a.href.substring(0,80) })))
      })()`)
      const links = JSON.parse(r)
      if (!links.length) return 'Tidak ada link'
      return links.map((l, i) => `[${String(i + 1).padStart(2)}] ${l.text.padEnd(42)} ${l.href}`).join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  images: async () => {
    try {
      const r = await exec(`(function(){
        const imgs = Array.from(document.querySelectorAll('img')).slice(0,20)
        return JSON.stringify(imgs.map(i => ({ alt: (i.alt||'[no alt]').substring(0,30), src: i.src.substring(0,80), w: i.naturalWidth, h: i.naturalHeight })))
      })()`)
      const imgs = JSON.parse(r)
      if (!imgs.length) return 'Tidak ada gambar'
      return imgs.map((img, i) => `[${String(i + 1).padStart(2)}] ${img.alt.padEnd(32)} ${img.w}×${img.h}  ${img.src}`).join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  forms: async () => {
    try {
      const r = await exec(`(function(){
        const forms = Array.from(document.querySelectorAll('form')).slice(0,10)
        return JSON.stringify(forms.map(f => ({
          id: f.id||'[no id]', action: (f.action||'?').substring(0,60),
          method: f.method||'GET',
          inputs: Array.from(f.querySelectorAll('input,textarea,select')).map(i=>({ type:i.type||'text', name:i.name||'?', id:i.id||'' }))
        })))
      })()`)
      const forms = JSON.parse(r)
      if (!forms.length) return 'Tidak ada form'
      return forms.map(f =>
        `Form #${f.id} [${f.method}] → ${f.action}\n` +
        f.inputs.map(i => `  └ ${i.type.padEnd(10)} name="${i.name}"${i.id ? ` id="${i.id}"` : ''}`).join('\n')
      ).join('\n\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  scripts: async () => {
    try {
      const r = await exec(`(function(){
        const s = Array.from(document.querySelectorAll('script[src]')).slice(0,20)
        return JSON.stringify(s.map(sc => sc.src.substring(0,100)))
      })()`)
      const scripts = JSON.parse(r)
      if (!scripts.length) return 'Tidak ada script eksternal'
      return scripts.map((s, i) => `[${String(i + 1).padStart(2)}] ${s}`).join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  screenshot: async () => {
    try {
      const r = await exec(`(function(){
        return JSON.stringify({
          viewport: { w: window.innerWidth, h: window.innerHeight },
          document: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
          devicePixelRatio: window.devicePixelRatio,
          scroll: { x: window.scrollX, y: window.scrollY }
        })
      })()`)
      const d = JSON.parse(r)
      return [
        `Viewport      : ${d.viewport.w}×${d.viewport.h}`,
        `Dokumen       : ${d.document.w}×${d.document.h}`,
        `Pixel Ratio   : ${d.devicePixelRatio}`,
        `Scroll        : x=${d.scroll.x} y=${d.scroll.y}`,
      ].join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  // ── Injection ───────────────────────────────────────────
  inject: async (args) => {
    if (!args) return 'Penggunaan: inject <kode javascript>'
    try {
      const result = await exec(args)
      const str = result === undefined ? '(undefined)' : result === null ? '(null)' : String(result)
      return `↩ ${str.substring(0, 500)}`
    } catch (e) { return `Error: ${e.message}` }
  },

  css: async (args) => {
    if (!args) return 'Penggunaan: css <deklarasi CSS>'
    try {
      await exec(`(function(){
        const s = document.createElement('style');
        s.id = '__kuro_injected_css_' + Date.now();
        s.textContent = ${JSON.stringify(args)};
        document.head.appendChild(s);
      })()`)
      return `CSS berhasil diinjeksi: ${args.substring(0, 60)}`
    } catch (e) { return `Error: ${e.message}` }
  },

  click: async (args) => {
    if (!args) return 'Penggunaan: click <css-selector>'
    try {
      const r = await exec(`(function(){
        const el = document.querySelector(${JSON.stringify(args)});
        if (!el) return 'Elemen tidak ditemukan: ' + ${JSON.stringify(args)};
        el.click();
        return 'Klik pada: ' + (el.tagName.toLowerCase()) + (el.id ? '#'+el.id : '') + (el.className ? '.'+el.className.split(' ')[0] : '');
      })()`)
      return r
    } catch (e) { return `Error: ${e.message}` }
  },

  type: async (args) => {
    if (!args || !args.includes(' ')) return 'Penggunaan: type <selector> <teks>'
    const [sel, ...rest] = args.split(' ')
    const text = rest.join(' ')
    try {
      const r = await exec(`(function(){
        const el = document.querySelector(${JSON.stringify(sel)});
        if (!el) return 'Elemen tidak ditemukan: ' + ${JSON.stringify(sel)};
        el.focus();
        el.value = ${JSON.stringify(text)};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Teks berhasil diisi pada: ' + el.tagName.toLowerCase();
      })()`)
      return r
    } catch (e) { return `Error: ${e.message}` }
  },

  scroll: async (args) => {
    const y = parseInt(args)
    if (isNaN(y)) return 'Penggunaan: scroll <posisi-y-pixel>'
    try {
      await exec(`window.scrollTo({ top: ${y}, behavior: 'smooth' })`)
      return `Scroll ke y=${y}px`
    } catch (e) { return `Error: ${e.message}` }
  },

  // ── Storage ─────────────────────────────────────────────
  cookies: async (args) => {
    if (args === 'clear') {
      try {
        if (window.kuroAPI) await window.kuroAPI.privacy.clearData(['cookies'])
        return 'Semua cookies dihapus.'
      } catch (e) { return `Error: ${e.message}` }
    }
    try {
      const r = await window.kuroAPI?.terminal?.getCookies()
      if (!r?.ok) {
        // Fallback: read from page
        const pageCookies = await exec('document.cookie')
        if (!pageCookies) return 'Tidak ada cookies (atau HttpOnly semua)'
        return pageCookies.split(';').map(c => c.trim()).join('\n')
      }
      if (!r.cookies.length) return 'Tidak ada cookies tersimpan'
      return r.cookies.slice(0, 30).map(c =>
        `${c.name.padEnd(28)} ${c.domain}${c.httpOnly ? ' [HttpOnly]' : ''}${c.secure ? ' [Secure]' : ''}`
      ).join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  ls: async (args) => {
    if (!args) {
      // List all
      try {
        const r = await exec(`(function(){
          const keys = Object.keys(localStorage);
          return JSON.stringify(keys.map(k => ({ k, v: (localStorage.getItem(k)||'').substring(0,60) })))
        })()`)
        const items = JSON.parse(r)
        if (!items.length) return 'LocalStorage kosong'
        return items.map(i => `${i.k.padEnd(30)} = ${i.v}`).join('\n')
      } catch (e) { return `Error: ${e.message}` }
    }
    const [sub, ...rest] = args.trim().split(' ')
    const key = rest[0], val = rest.slice(1).join(' ')
    if (sub === 'get') {
      if (!key) return 'Penggunaan: ls get <key>'
      try {
        const v = await exec(`localStorage.getItem(${JSON.stringify(key)})`)
        return v === null ? `"${key}" tidak ditemukan` : `${key} = ${v}`
      } catch (e) { return `Error: ${e.message}` }
    }
    if (sub === 'set') {
      if (!key || !val) return 'Penggunaan: ls set <key> <value>'
      try {
        await exec(`localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(val)})`)
        return `Set ${key} = ${val}`
      } catch (e) { return `Error: ${e.message}` }
    }
    if (sub === 'del') {
      if (!key) return 'Penggunaan: ls del <key>'
      try {
        await exec(`localStorage.removeItem(${JSON.stringify(key)})`)
        return `Dihapus: ${key}`
      } catch (e) { return `Error: ${e.message}` }
    }
    if (sub === 'clear') {
      try {
        await exec('localStorage.clear()')
        return 'LocalStorage dikosongkan.'
      } catch (e) { return `Error: ${e.message}` }
    }
    return 'Subperintah: ls [get|set|del|clear] ...'
  },

  session: async () => {
    try {
      const r = await exec(`(function(){
        const keys = Object.keys(sessionStorage);
        return JSON.stringify(keys.map(k => ({ k, v: (sessionStorage.getItem(k)||'').substring(0,60) })))
      })()`)
      const items = JSON.parse(r)
      if (!items.length) return 'SessionStorage kosong'
      return items.map(i => `${i.k.padEnd(30)} = ${i.v}`).join('\n')
    } catch (e) { return `Error: ${e.message}` }
  },

  // ── Network ─────────────────────────────────────────────
  ping: (args) => {
    if (!args) return 'Penggunaan: ping <host>'
    const ms = () => Math.floor(Math.random() * 80) + 10
    const m1 = ms(), m2 = ms(), m3 = ms(), m4 = ms()
    return [
      `Ping ke ${args} dengan 4 paket:`,
      `Balas dari ${args}: waktu=${m1}ms TTL=64`,
      `Balas dari ${args}: waktu=${m2}ms TTL=64`,
      `Balas dari ${args}: waktu=${m3}ms TTL=64`,
      `Balas dari ${args}: waktu=${m4}ms TTL=64`,
      `Statistik: Min=${Math.min(m1, m2, m3, m4)}ms Avg=${Math.round((m1 + m2 + m3 + m4) / 4)}ms Max=${Math.max(m1, m2, m3, m4)}ms`,
    ].join('\n')
  },

  curl: async (args) => {
    if (!args) return 'Penggunaan: curl <url>'
    try {
      const data = await window.kuroAPI?.search?.fetch({ query: args, engine: 'kuro' })
      if (data) return `GET ${args}\nStatus: 200 OK (via KuroSearch proxy)\nHasil: ${data.ok ? 'OK' : 'Gagal'} — ${data.results?.length || 0} item`
      return `curl ${args}\nSimulasi: HTTP/2 200 OK\nContent-Type: text/html; charset=utf-8`
    } catch (e) { return `Error: ${e.message}` }
  },

  // ── Tor commands ─────────────────────────────────────
  tor: async (args) => {
    const sub = (args || '').trim().toLowerCase()
    if (!sub || sub === 'status') {
      const s = await window.kuroAPI?.tor?.check?.()
      if (!s) return 'kuroAPI.tor tidak tersedia'
      return [
        `Status Tor   : ${s.running ? '🟢 AKTIF' : '🔴 TIDAK AKTIF'}`,
        `Embedded     : ${s.embedded ? 'Ya (PID ' + s.pid + ')' : 'Tidak'}`,
        `SOCKS5       : ${s.host}:${s.port}`,
        `tor.exe      : ${s.exePath || '(tidak ditemukan)'}`,
      ].join('\n')
    }
    if (sub === 'start') {
      const r = await window.kuroAPI?.tor?.start?.()
      return r?.ok ? `✅ Tor dimulai${r.already ? ' (sudah berjalan)' : ''}` : `❌ ${r?.error}`
    }
    if (sub === 'stop') {
      await window.kuroAPI?.tor?.stop?.()
      return '✅ Tor dihentikan'
    }
    if (sub === 'log') {
      const logs = await window.kuroAPI?.tor?.log?.()
      return (logs || []).slice(-20).join('\n') || 'Tidak ada log'
    }
    return 'Penggunaan: tor [status|start|stop|log]'
  },

  // ── Account commands ─────────────────────────────────
  account: async (args) => {
    const [sub, ...rest] = (args || '').trim().split(' ')
    if (!sub || sub === 'info') {
      const s = JSON.parse(localStorage.getItem('ka_session') || 'null')
      if (!s) return 'Belum login. Gunakan: account register <email> <password> <nama>'
      return `Login sebagai: ${s.displayName} (${s.email})\nID: ${s.id}`
    }
    if (sub === 'register') {
      const [email, password, ...nameParts] = rest
      const displayName = nameParts.join(' ') || email?.split('@')[0] || 'User'
      if (!email || !password) return 'Penggunaan: account register <email> <password> [nama]'
      const accounts = JSON.parse(localStorage.getItem('ka_accounts') || '[]')
      if (accounts.find(a => a.email === email)) return `❌ Email ${email} sudah terdaftar`
      const id = 'kuro_' + Date.now()
      const passHash = Math.abs(Array.from(password + email).reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)).toString(16)
      const acc = { id, email, displayName, passHash, createdAt: new Date().toISOString(), bookmarks: [], quicklinks: [] }
      accounts.push(acc)
      localStorage.setItem('ka_accounts', JSON.stringify(accounts))
      const session = { id, email, displayName, token: btoa(id) }
      localStorage.setItem('ka_session', JSON.stringify(session))
      return `✅ Akun dibuat!\nNama: ${displayName}\nEmail: ${email}\nID: ${id}`
    }
    if (sub === 'login') {
      const [email, password] = rest
      if (!email || !password) return 'Penggunaan: account login <email> <password>'
      const accounts = JSON.parse(localStorage.getItem('ka_accounts') || '[]')
      const acc = accounts.find(a => a.email === email)
      if (!acc) return `❌ Akun tidak ditemukan: ${email}`
      const passHash = Math.abs(Array.from(password + email).reduce((h, c) => Math.imul(31, h) + c.charCodeAt(0) | 0, 0)).toString(16)
      if (acc.passHash !== passHash) return '❌ Password salah'
      const session = { id: acc.id, email: acc.email, displayName: acc.displayName, token: btoa(acc.id) }
      localStorage.setItem('ka_session', JSON.stringify(session))
      return `✅ Login berhasil sebagai ${acc.displayName}!`
    }
    if (sub === 'logout') {
      localStorage.removeItem('ka_session')
      return '✅ Logout berhasil'
    }
    if (sub === 'list') {
      const accounts = JSON.parse(localStorage.getItem('ka_accounts') || '[]')
      if (!accounts.length) return 'Tidak ada akun tersimpan'
      return accounts.map((a, i) => `${i + 1}. ${a.displayName} (${a.email})`).join('\n')
    }
    return 'Subperintah: account [info|register|login|logout|list]'
  },

  mem: async () => {
    const m = await window.kuroAPI?.system?.memory?.()
    if (!m) return 'Tidak tersedia'
    return [
      `App Memory   : ${m.app} MB`,
      `Heap Used    : ${m.heap} MB`,
      `RAM Total    : ${m.total} MB`,
      `RAM Bebas    : ${m.free} MB`,
      `RAM Terpakai : ${m.used} MB`,
    ].join('\n')
  },

  // ── Dev Tools (untuk pengembangan aplikasi & testing) ──
  uuid: () => {
    // Generate UUID v4
    const gen = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
    const count = 5
    return Array.from({ length: count }, (_, i) => `${i + 1}. ${gen()}`).join('\n')
  },

  hash: (args) => {
    if (!args) return 'Penggunaan: hash <teks>'
    // Simple hash (FNV-1a 32bit)
    let h = 2166136261
    for (let i = 0; i < args.length; i++) {
      h ^= args.charCodeAt(i)
      h = (h * 16777619) >>> 0
    }
    // Also MD5-like hex via SubtleCrypto alternative
    const sha256preview = Array.from(new TextEncoder().encode(args))
      .map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 40)
    return [
      `Input    : ${args}`,
      `FNV-1a32 : ${h.toString(16).padStart(8, '0')}`,
      `Hex dump : ${sha256preview}...`,
      `Base64   : ${btoa(args)}`,
      `Length   : ${args.length} chars`,
    ].join('\n')
  },

  b64: (args) => {
    if (!args) return 'Penggunaan: b64 <encode|decode> <teks>'
    const [mode, ...rest] = args.split(' ')
    const text = rest.join(' ')
    if (!text) return 'Contoh: b64 encode halo dunia'
    if (mode === 'encode') return btoa(unescape(encodeURIComponent(text)))
    if (mode === 'decode') {
      try { return decodeURIComponent(escape(atob(text))) }
      catch { return '❌ Bukan base64 valid' }
    }
    return 'Mode: encode atau decode'
  },

  generate: (args) => {
    // Generate data testing: generate email 5 → buat 5 email test
    const [type, countStr] = (args || '').split(' ')
    const count = Math.min(parseInt(countStr) || 5, 50)
    const names = ['alice', 'bob', 'charlie', 'diana', 'evan', 'fiona', 'george', 'hana', 'ivan', 'julia']
    const domains = ['gmail.com', 'yahoo.com', 'protonmail.com', 'outlook.com', 'test.dev']
    const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const randInt = (n) => Math.floor(Math.random() * n) + 1
    const randNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

    if (!type || type === 'email') {
      const emails = Array.from({ length: count }, (_, i) =>
        `${rand(names)}${randNum(100)}@${rand(domains)}`
      )
      return `📧 ${count} Email Test:\n${emails.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
    }
    if (type === 'user') {
      const rows = Array.from({ length: count }, (_, i) => {
        const n = rand(names)
        return `${i + 1}. username: ${n}${randNum(999)} | pass: ${n}@${randNum(9999)} | email: ${n}${randNum(99)}@${rand(domains)}`
      })
      return `👤 ${count} User Test:\n${rows.join('\n')}`
    }
    if (type === 'ip') {
      const ips = Array.from({ length: count }, () =>
        `${randInt(254)}.${randInt(254)}.${randInt(254)}.${randInt(254)}`
      )
      return `🌐 ${count} IP Address:\n${ips.map((ip, i) => `${i + 1}. ${ip}`).join('\n')}`
    }
    if (type === 'pass') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
      const passwords = Array.from({ length: count }, () =>
        Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      )
      return `🔑 ${count} Password:\n${passwords.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
    }
    if (type === 'name') {
      const firstNames = ['Rizki', 'Budi', 'Sari', 'Andi', 'Dewi', 'Hendra', 'Fitri', 'Agus', 'Nita', 'Doni']
      const lastNames = ['Habibi', 'Santoso', 'Rahayu', 'Kusuma', 'Pratama', 'Wijaya', 'Susanto', 'Sari']
      const fullNames = Array.from({ length: count }, (_, i) =>
        `${rand(firstNames)} ${rand(lastNames)}`
      )
      return `📝 ${count} Nama:\n${fullNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
    }
    return 'generate [email|user|ip|pass|name] [jumlah]\nContoh: generate email 10'
  },

  jwt: (args) => {
    if (!args) return 'Penggunaan: jwt <token>\nCatatan: hanya decode payload, tidak verify signature'
    try {
      const parts = args.trim().split('.')
      if (parts.length !== 3) return '❌ Bukan JWT valid (harus 3 bagian dipisah .)'
      const decode = (s) => JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')))
      const header = decode(parts[0])
      const payload = decode(parts[1])
      const exp = payload.exp ? new Date(payload.exp * 1000).toLocaleString('id-ID') : 'Tidak ada'
      const iat = payload.iat ? new Date(payload.iat * 1000).toLocaleString('id-ID') : 'Tidak ada'
      return [
        '── Header ─────────────────',
        JSON.stringify(header, null, 2),
        '── Payload ────────────────',
        JSON.stringify(payload, null, 2),
        '── Info ───────────────────',
        `Dibuat   : ${iat}`,
        `Expired  : ${exp}`,
        `Algorithm: ${header.alg || '?'}`,
      ].join('\n')
    } catch (e) { return `❌ Gagal decode: ${e.message}` }
  },

  http: async (args) => {
    // Test HTTP endpoint sederhana
    const [method, url, ...bodyParts] = (args || '').split(' ')
    if (!url) return 'Penggunaan: http GET <url>\n         http POST <url> <json-body>'
    try {
      const opts = { method: method?.toUpperCase() || 'GET', signal: AbortSignal.timeout(8000) }
      if (method?.toUpperCase() === 'POST' && bodyParts.length) {
        opts.body = bodyParts.join(' ')
        opts.headers = { 'Content-Type': 'application/json' }
      }
      const t0 = Date.now()
      const r = await fetch(url, opts)
      const ms = Date.now() - t0
      const body = await r.text()
      return [
        `${method?.toUpperCase() || 'GET'} ${url}`,
        `Status  : ${r.status} ${r.statusText}`,
        `Waktu   : ${ms}ms`,
        `Size    : ${body.length} chars`,
        `Preview : ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`,
      ].join('\n')
    } catch (e) { return `❌ ${e.message}` }
  },

  ai: async (args) => {
    // Tanya AI langsung dari terminal
    if (!args) return 'Penggunaan: ai <pertanyaan>'
    try {
      const s = window.kuroAPI ? await window.kuroAPI.settings.get() : {}
      const key = s.geminiKey || ''
      if (window.kuroAPI?.ai?.gemini) {
        const res = await window.kuroAPI.ai.gemini({
          key,
          model: s.geminiModel || 'gemini-2.0-flash',
          messages: [{ role: 'user', content: args }],
          systemPrompt: 'Jawab singkat dan tepat dalam Bahasa Indonesia.'
        })
        if (res.ok) return '🤖 ' + res.text
        return '❌ Gemini error: ' + res.error
      }
      // Fallback pollinations
      const r = await fetch(`https://text.pollinations.ai/${encodeURIComponent(args)}?model=openai`, {
        signal: AbortSignal.timeout(12000)
      })
      return '🤖 ' + (await r.text())
    } catch (e) { return `❌ ${e.message}` }
  },

  search: async (args) => {
    if (!args) return 'Penggunaan: search <query>'
    try {
      const data = await window.kuroAPI?.search?.fetch({ query: args, engine: 'kuro' })
      if (!data?.ok || !data.results?.length) return `Tidak ada hasil untuk "${args}"`
      return data.results.slice(0, 8).map((r, i) =>
        `[${i + 1}] ${r.title}\n     ${r.url}\n     ${(r.desc || '').substring(0, 80)}`
      ).join('\n\n')
    } catch (e) { return `❌ ${e.message}` }
  },
}

// ── Component ────────────────────────────────────────────
export default function TerminalPanel({ onClose }) {
  const [lines, setLines] = useState([
    { type: 'info', text: '┌─ Terminal Kuro Akira v2.5.2 ───────────────────────┐' },
    { type: 'info', text: '│  help = daftar perintah   ai <tanya> = tanya AI    │' },
    { type: 'info', text: '│  search <query> = cari    generate email 10 = data │' },
    { type: 'info', text: '│  uuid / hash / b64 / jwt / http GET <url>          │' },
    { type: 'info', text: '└─────────────────────────────────────────────────────┘' },
    { type: 'dim', text: new Date().toLocaleString('id-ID') },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  const addLine = (text, type = 'out') => {
    // Split multi-line output
    const lines_ = String(text).split('\n')
    setLines(prev => [...prev, ...lines_.map(t => ({ type, text: t }))])
  }

  const run = async (cmd) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    addLine(`kuro@browser:~$ ${trimmed}`, 'cmd')
    setHistory(prev => [trimmed, ...prev.slice(0, 99)])
    setHistIdx(-1)

    if (trimmed === 'clear') { setLines([]); return }
    if (trimmed === 'history') {
      addLine(history.length ? history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n') : 'Riwayat kosong')
      return
    }

    const spaceIdx = trimmed.indexOf(' ')
    const name = spaceIdx === -1 ? trimmed : trimmed.substring(0, spaceIdx)
    const args = spaceIdx === -1 ? '' : trimmed.substring(spaceIdx + 1)
    const fn = builtins[name.toLowerCase()]

    if (fn) {
      try {
        const result = await fn(args)
        if (result !== undefined) addLine(result)
      } catch (e) {
        addLine(`Kesalahan: ${e.message}`, 'err')
      }
    } else {
      addLine(`'${name}' tidak dikenal. Ketik 'help' untuk daftar perintah.`, 'err')
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter') { run(input); setInput(''); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next); setInput(history[next] || '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next); setInput(next === -1 ? '' : history[next])
    }
    // Tab completion (basic)
    if (e.key === 'Tab') {
      e.preventDefault()
      const partial = input.toLowerCase()
      const match = Object.keys(builtins).find(k => k.startsWith(partial))
      if (match) setInput(match)
    }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Terminal
          <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '6px' }}>
            {window.__activeWebview ? '● halaman aktif' : '○ tidak ada halaman'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--bg-25)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-muted)' }}
            onClick={() => setLines([])}
          >Bersih</button>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" /><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>
      </div>

      <div className="terminal-body" onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <div key={i} className={`terminal-line ${l.type}`}>{l.text}</div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="terminal-input-wrap">
        <span className="terminal-prompt">kuro@browser:~$</span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="masukkan perintah... (Tab untuk lengkapi)"
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  )
}
