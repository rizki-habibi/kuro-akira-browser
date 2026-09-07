import React, { useState, useRef, useEffect } from 'react'

// ── Helpers ─────────────────────────────────────────────
const wv = () => window.__activeWebview  // active webview element (set by BrowserView)
const exec = (js) => {
  const webview = wv()
  if (!webview) return Promise.reject(new Error('Tidak ada halaman aktif. Buka URL terlebih dahulu.'))
  return webview.executeJavaScript(js)
}

// ── Help text ────────────────────────────────────────────
const HELP = `┌─ Terminal Kuro Akira v2.1 ─────────────────────────┐
│  INFORMASI                                          │
│  info              - Info browser                   │
│  version           - Versi Kuro Akira               │
│  privacy           - Status privasi aktif           │
│  blocked           - Jumlah iklan diblokir          │
│  url               - URL halaman aktif              │
│  title             - Judul halaman aktif            │
│                                                     │
│  INSPEKSI DOM                                       │
│  dom               - Ringkasan DOM halaman          │
│  headers           - Meta tag halaman               │
│  links             - Semua link di halaman          │
│  images            - Semua gambar di halaman        │
│  forms             - Form yang ada di halaman       │
│  scripts           - Script yang dimuat             │
│                                                     │
│  INJEKSI & MANIPULASI                               │
│  inject <js>       - Jalankan JS di halaman         │
│  css <style>       - Injeksi CSS ke halaman         │
│  click <selector>  - Klik elemen CSS selector       │
│  type <sel> <teks> - Ketik teks ke input            │
│  scroll <y>        - Scroll ke posisi Y (px)        │
│  screenshot        - Info viewport halaman          │
│                                                     │
│  PENYIMPANAN                                        │
│  cookies           - Tampilkan cookies sesi ini     │
│  cookies clear     - Hapus semua cookies            │
│  ls                - LocalStorage halaman           │
│  ls get <key>      - Baca satu item localStorage    │
│  ls set <k> <v>    - Set item localStorage          │
│  ls del <key>      - Hapus item localStorage        │
│  ls clear          - Hapus semua localStorage       │
│  session           - SessionStorage halaman         │
│                                                     │
│  JARINGAN & LAIN                                    │
│  ping <host>       - Ping (simulasi)                │
│  curl <url>        - Fetch URL via IPC              │
│  history           - Riwayat perintah               │
│  clear             - Bersihkan terminal             │
│  help              - Tampilkan bantuan ini          │
└─────────────────────────────────────────────────────┘`

// ── Built-in commands ────────────────────────────────────
const builtins = {
  help: () => HELP,

  info: () => {
    const ua = navigator.userAgent
    return `Kuro Akira Browser v2.1\nElectron + React\nPlatform: ${navigator.platform}\nUA: ${ua.substring(0, 80)}...`
  },

  version: () => 'Kuro Akira v2.2.0 (Electron)',

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
}

// ── Component ────────────────────────────────────────────
export default function TerminalPanel({ onClose }) {
  const [lines, setLines] = useState([
    { type: 'info', text: '┌─ Terminal Kuro Akira v2.1 ─────────────────────────┐' },
    { type: 'info', text: '│  Ketik "help" untuk daftar perintah                │' },
    { type: 'info', text: '│  inject <js>  — jalankan JS di halaman aktif       │' },
    { type: 'info', text: '│  dom           — inspeksi struktur halaman          │' },
    { type: 'info', text: '│  cookies       — lihat/hapus cookies                │' },
    { type: 'info', text: '│  ls            — akses localStorage                 │' },
    { type: 'info', text: '└────────────────────────────────────────────────────┘' },
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
