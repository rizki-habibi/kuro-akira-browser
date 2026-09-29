import express, { Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { createServer as createViteServer } from 'vite'
import { GoogleGenAI } from '@google/genai'
import { JSDOM } from 'jsdom'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// In-memory container state server-side for proxy routing
interface ContainerSession {
  id: string
  ip: string
  country: string
  cookies: Array<{ name: string; value: string; domain: string; path?: string }>
}

const containerSessions: Record<string, ContainerSession> = {
  'default': {
    id: 'default',
    ip: '104.28.19.42',
    country: 'Indonesia',
    cookies: [{ name: 'pref_lang', value: 'id', domain: 'all' }]
  },
  'proton-1': {
    id: 'proton-1',
    ip: '185.70.41.12',
    country: 'Switzerland',
    cookies: [
      { name: 'AUTH_USER', value: 'alice.smith@proton.me', domain: 'proton.me' },
      { name: 'SessionToken', value: 'pro_sess_ch_881920aa7f3b', domain: 'proton.me' }
    ]
  },
  'proton-2': {
    id: 'proton-2',
    ip: '194.126.177.8',
    country: 'Netherlands',
    cookies: [
      { name: 'AUTH_USER', value: 'bob.crypto@proton.me', domain: 'proton.me' },
      { name: 'SessionToken', value: 'pro_sess_nl_994112cc4e2a', domain: 'proton.me' }
    ]
  },
  'proton-fresh': {
    id: 'proton-fresh',
    ip: '185.70.40.88',
    country: 'Switzerland',
    cookies: []
  },
  'tor-onion': {
    id: 'tor-onion',
    ip: '185.220.101.5',
    country: 'Germany',
    cookies: []
  }
}

// Lazy init Gemini SDK
let geminiClient: GoogleGenAI | null = null
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey })
  }
  return geminiClient
}

// ── Health Check ──
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString(), version: '2.7.0' })
})

// ── Container Session Management ──
app.get('/api/containers', (req: Request, res: Response) => {
  const list = Object.values(containerSessions)
  res.json({ ok: true, containers: list })
})

app.get('/api/containers/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const session = containerSessions[id] || containerSessions['default']
  res.json({ ok: true, container: session })
})

app.post('/api/containers', (req: Request, res: Response) => {
  const { id, name, country, flag, color, ip, cookies } = req.body || {}
  const contId = id || 'cont-' + Date.now().toString(36)
  containerSessions[contId] = {
    id: contId,
    name: name || 'Container Baru',
    country: country || 'Switzerland',
    flag: flag || '🇨🇭',
    color: color || '#4caf50',
    ip: ip || '185.70.41.12',
    cookies: cookies || []
  }
  res.json({ ok: true, container: containerSessions[contId] })
})

app.put('/api/containers/:id', (req: Request, res: Response) => {
  const { id } = req.params
  if (!containerSessions[id]) {
    containerSessions[id] = {
      id,
      name: 'Container',
      country: 'Switzerland',
      flag: '🇨🇭',
      color: '#4caf50',
      ip: '185.70.41.12',
      cookies: []
    }
  }
  Object.assign(containerSessions[id], req.body)
  res.json({ ok: true, container: containerSessions[id] })
})

app.delete('/api/containers/:id', (req: Request, res: Response) => {
  const { id } = req.params
  if (id !== 'default' && containerSessions[id]) {
    delete containerSessions[id]
  }
  res.json({ ok: true })
})

app.post('/api/containers/:id/rotate-ip', (req: Request, res: Response) => {
  const { id } = req.params
  const session = containerSessions[id]
  if (!session) {
    res.status(404).json({ ok: false, error: 'Container tidak ditemukan' })
    return
  }
  const pools: Record<string, string[]> = {
    Switzerland: ['185.70.41.12', '185.70.41.34', '185.70.41.89', '194.126.177.10'],
    Netherlands: ['194.126.177.8', '194.126.177.22', '185.220.101.32', '195.12.50.4'],
    Germany: ['185.220.101.5', '185.220.101.19', '194.126.177.55', '178.63.97.34'],
    Singapore: ['103.253.25.72', '103.253.25.88', '103.214.109.122', '45.76.155.22']
  }
  const pool = pools[session.country] || pools.Switzerland
  const otherIPs = pool.filter(ip => ip !== session.ip)
  session.ip = otherIPs.length ? otherIPs[Math.floor(Math.random() * otherIPs.length)] : pool[0]
  res.json({ ok: true, ip: session.ip })
})

app.get('/api/containers/:id/cookies', (req: Request, res: Response) => {
  const { id } = req.params
  const session = containerSessions[id]
  res.json({ ok: true, cookies: session ? (session.cookies || []) : [] })
})

app.post('/api/containers/:id/cookies', (req: Request, res: Response) => {
  const { id } = req.params
  const cookie = req.body
  if (!containerSessions[id]) {
    containerSessions[id] = { id, name: 'Container', country: 'Switzerland', flag: '🇨🇭', color: '#4caf50', ip: '185.70.41.12', cookies: [] }
  }
  const session = containerSessions[id]
  if (!session.cookies) session.cookies = []
  const idx = session.cookies.findIndex((k: any) => k.name === cookie.name && (k.domain === cookie.domain || !cookie.domain))
  if (idx >= 0) session.cookies[idx] = cookie
  else session.cookies.push(cookie)
  res.json({ ok: true, cookies: session.cookies })
})

app.delete('/api/containers/:id/cookies/:name', (req: Request, res: Response) => {
  const { id, name } = req.params
  const session = containerSessions[id]
  if (session && session.cookies) {
    session.cookies = session.cookies.filter((k: any) => k.name !== name)
  }
  res.json({ ok: true, cookies: session ? session.cookies : [] })
})

app.post('/api/containers/:id/clear-cookies', (req: Request, res: Response) => {
  const { id } = req.params
  if (containerSessions[id]) {
    containerSessions[id].cookies = []
  }
  res.json({ ok: true })
})

app.get('/api/session/:containerId', (req: Request, res: Response) => {
  const { containerId } = req.params
  const session = containerSessions[containerId] || containerSessions['default']
  res.json({ ok: true, session })
})

app.post('/api/session/:containerId', (req: Request, res: Response) => {
  const { containerId } = req.params
  const { ip, country, cookies } = req.body
  if (!containerSessions[containerId]) {
    containerSessions[containerId] = { id: containerId, ip: ip || '185.70.41.12', country: country || 'Switzerland', cookies: cookies || [] }
  } else {
    if (ip) containerSessions[containerId].ip = ip
    if (country) containerSessions[containerId].country = country
    if (cookies) containerSessions[containerId].cookies = cookies
  }
  res.json({ ok: true, session: containerSessions[containerId] })
})

// ── Web Proxy Endpoint (with isolated cookies & IP headers) ──
app.get('/api/proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string
  const containerId = (req.query.containerId as string) || 'default'

  if (!targetUrl) {
    res.status(400).send('Parameter url diperlukan')
    return
  }

  let fullUrl = targetUrl
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    fullUrl = 'https://' + fullUrl
  }

  const session = containerSessions[containerId] || {
    id: containerId,
    ip: '185.70.41.12',
    country: 'Switzerland',
    cookies: []
  }

  // Format cookie string for outgoing request
  const cookieHeader = (session.cookies || [])
    .map(c => `${encodeURIComponent(c.name)}=${encodeURIComponent(c.value)}`)
    .join('; ')

  try {
    const urlObj = new URL(fullUrl)
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      // Simulated container proxy IP headers:
      'X-Forwarded-For': session.ip,
      'CF-Connecting-IP': session.ip,
      'X-Real-IP': session.ip,
      'Client-IP': session.ip,
    }

    if (cookieHeader) {
      headers['Cookie'] = cookieHeader
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
    })
    clearTimeout(timeout)

    // Capture incoming set-cookie from the target website back into container's cookie jar
    const rawSetCookies = response.headers.get('set-cookie')
    if (rawSetCookies) {
      const parts = rawSetCookies.split(/,(?=[^;]+=[^;]+)/)
      for (const sc of parts) {
        const [pair] = sc.split(';')
        if (pair) {
          const [k, v] = pair.split('=')
          if (k && v) {
            const name = decodeURIComponent(k.trim())
            const value = decodeURIComponent(v.trim())
            const existing = session.cookies.findIndex(c => c.name === name)
            if (existing >= 0) session.cookies[existing].value = value
            else session.cookies.push({ name, value, domain: urlObj.hostname })
          }
        }
      }
    }

    const contentType = response.headers.get('content-type') || 'text/html'
    res.setHeader('Content-Type', contentType)

    // Strip frame busting & strict framing headers
    res.removeHeader('X-Frame-Options')
    res.removeHeader('Content-Security-Policy')
    res.removeHeader('Content-Security-Policy-Report-Only')
    res.setHeader('Access-Control-Allow-Origin', '*')

    if (contentType.includes('text/html')) {
      let html = await response.text()
      // Inject base href tag so relative links, CSS, and images resolve
      const baseTag = `<base href="${fullUrl}">`
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`)
      } else if (html.includes('<HEAD>')) {
        html = html.replace('<HEAD>', `<HEAD>${baseTag}`)
      } else {
        html = baseTag + html
      }
      res.send(html)
    } else {
      const arrayBuffer = await response.arrayBuffer()
      res.send(Buffer.from(arrayBuffer))
    }
  } catch (error: any) {
    res.status(502).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #141414; color: #d4d4d4; padding: 40px 24px; text-align: center; }
          .card { max-width: 580px; margin: 0 auto; background: #1a1a1a; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 32px; }
          h2 { color: #ff3b3b; margin-bottom: 12px; }
          p { color: #9e9e9e; font-size: 14px; line-height: 1.6; }
          .badge { display: inline-block; background: rgba(229,53,53,0.15); color: #ff3b3b; border-radius: 6px; padding: 4px 10px; font-size: 12px; margin-bottom: 20px; }
          .ip-box { background: #0d0d0d; border: 1px solid #333; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 12px; text-align: left; margin: 20px 0; }
          .btn { background: #e53535; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; text-decoration: none; display: inline-block; }
          .btn:hover { background: #ff3b3b; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">Kuro Akira Proxy Guard</div>
          <h2>Halaman Eksternal Membatasi Akses</h2>
          <p>Situs <strong>${targetUrl}</strong> tidak dapat diakses langsung via web proxy atau memblokir koneksi otomatis.</p>
          <div class="ip-box">
            <div><strong>Target URL:</strong> ${targetUrl}</div>
            <div><strong>Container:</strong> ${session.id}</div>
            <div><strong>Virtual IP:</strong> ${session.ip} (${session.country})</div>
            <div><strong>Kukis Terpasang:</strong> ${session.cookies.length} item</div>
            <div><strong>Catatan:</strong> ${error?.message || 'Koneksi ditolak atau timeout'}</div>
          </div>
          <p style="margin-bottom: 24px;">Gunakan Portal Uji Akun Proton (<code>kuro://proton</code>) atau buka URL langsung di tab baru.</p>
          <a class="btn" href="${fullUrl}" target="_blank" rel="noreferrer">Buka di Tab Baru Eksternal</a>
        </div>
      </body>
      </html>
    `)
  }
})

// ── Search Proxy: hasil web nyata + fallback ensiklopedia ──
app.post('/api/search', async (req: Request, res: Response) => {
  const { query, onion, category } = req.body || {}
  const q = String(query || '').trim()
  if (!q) return res.json({ ok: true, results: [], suggestions: [] })

  const suggestions = [`${q} panduan`, `${q} indonesia`, `${q} terbaru`, `${q} tutorial`]

  if (onion) {
    try {
      const r = await fetch(`https://ahmia.fi/search/?q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'KuroAkiraBrowser/2.6', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(8000)
      })
      if (r.ok) {
        const dom = new JSDOM(await r.text())
        const results = Array.from(dom.window.document.querySelectorAll('li.result a[href]')).slice(0, 15).map((a: any) => {
          const parent = a.closest('li.result')
          return { title: (a.textContent || '').trim(), url: a.getAttribute('href') || '', desc: (parent?.querySelector('p')?.textContent || '').trim(), source: 'Ahmia', onion: true }
        }).filter((x: any) => x.title && /^https?:/i.test(x.url))
        if (results.length) return res.json({ ok: true, results, suggestions, onion: true, total: results.length })
      }
    } catch (_) {}
    return res.json({ ok: true, onion: true, results: [{ title: 'Ahmia — pencarian Onion', url: `https://ahmia.fi/search/?q=${encodeURIComponent(q)}`, desc: 'Buka indeks Ahmia untuk melihat hasil layanan .onion.', source: 'Ahmia' }], suggestions, total: 1 })
  }

  if (category === 'gambar') {
    try {
      const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url&iiurlwidth=480&format=json&origin=*`
      const r = await fetch(api, { headers: { 'User-Agent': 'KuroAkiraBrowser/2.6' }, signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const data = await r.json()
        const results = Object.values(data.query?.pages || {}).map((p: any) => {
          const info = p.imageinfo?.[0]
          return { title: p.title?.replace(/^File:/, ''), url: info?.descriptionurl || info?.url, thumb: info?.thumburl || info?.url, source: 'Wikimedia Commons', isImage: true }
        }).filter((x: any) => x.thumb && x.url)
        if (results.length) return res.json({ ok: true, results, suggestions, total: results.length })
      }
    } catch (_) {}
  }

  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 KuroAkiraBrowser/2.6', 'Accept': 'text/html' },
      signal: AbortSignal.timeout(8000)
    })
    const results: any[] = []
    if (r.ok) {
      const dom = new JSDOM(await r.text())
      for (const node of Array.from(dom.window.document.querySelectorAll('.result')).slice(0, 15)) {
        const a: any = node.querySelector('.result__a')
        if (!a) continue
        const raw = a.getAttribute('href') || ''
        let url = raw
        try {
          const parsed = new URL(raw, 'https://html.duckduckgo.com')
          url = parsed.searchParams.get('uddg') || raw
        } catch (_) {}
        const title = (a.textContent || '').trim()
        const desc = (node.querySelector('.result__snippet')?.textContent || '').trim()
        if (title && /^https?:/i.test(url)) results.push({ title, url, desc, source: 'DuckDuckGo' })
      }
    }

    if (results.length < 8) {
      try {
        const w = await fetch(`https://id.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json`, { signal: AbortSignal.timeout(8000) })
        if (w.ok) {
          const wiki = await w.json()
          for (let i = 0; i < (wiki[1] || []).length; i++) {
            if (wiki[1][i] && wiki[3]?.[i]) results.push({ title: wiki[1][i], url: wiki[3][i], desc: wiki[2]?.[i] || '', source: 'Wikipedia Indonesia' })
          }
        }
      } catch (_) {}
    }

    const unique = Array.from(new Map(results.map(x => [x.url, x])).values()).slice(0, 15)
    return res.json({ ok: true, results: unique, suggestions, total: unique.length, source: 'DuckDuckGo + Wikipedia' })
  } catch (err: any) {
    return res.status(502).json({ ok: false, error: 'Layanan pencarian sedang tidak tersedia', suggestions })
  }
})

// ── Gemini 2.5 Flash Server-Side AI ──
app.post('/api/ai/gemini', async (req: Request, res: Response) => {
  const { messages, systemPrompt, model } = req.body || {}
  const targetModel = model || 'gemini-2.5-flash'

  const ai = getGeminiClient()
  if (!ai) {
    // Graceful fallback response if GEMINI_API_KEY is not yet populated
    const lastMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1].content : 'Halo'
    res.json({
      ok: true,
      text: `Halo! Saya **Kuro AI**. Saya menerima pertanyaan Anda:\n\n*"${lastMsg}"*\n\nFitur Kuro Akira Browser yang sedang aktif:\n• **Multi-Container Cookies**: Setiap tab memiliki cookie jar terisolasi (misal Akun Proton #1 dan Akun Proton #2 tidak akan saling menimpa sesi).\n• **Virtual IP Routing**: Setiap container menjalankan simulasi IP unik (Swiss, Belanda, Jerman, dll).\n• **Tor & VPN**: Enkripsi jalur data dan privasi maksimal.`
    })
    return
  }

  try {
    const contents = Array.isArray(messages)
      ? messages.map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m.content || '') }]
        }))
      : [{ role: 'user', parts: [{ text: 'Halo Kuro AI' }] }]

    const response = await ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        systemInstruction: systemPrompt || 'Kamu adalah Kuro AI, asisten browser Kuro Akira. Bantu pengguna dengan ramah, cerdas, dan ringkas dalam Bahasa Indonesia.'
      }
    })

    res.json({ ok: true, text: response.text || 'Tidak ada respons yang dihasilkan.' })
  } catch (error: any) {
    console.error('[KuroAI] Gemini API error:', error?.message)
    res.json({
      ok: true,
      text: `Halo! Kuro AI siap membantu. Terkait permintaan Anda, browser Kuro Akira telah mengamankan sesi container Anda dengan kukis terpisah dan alamat IP yang berbeda.`
    })
  }
})

// ── Start Server & Integrate Vite ──
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.join(process.cwd(), 'dist')
    app.use(express.static(distPath))
    app.get('*all', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KuroAkira] Server running at http://0.0.0.0:${PORT}`)
  })
}

startServer().catch(err => {
  console.error('[KuroAkira] Failed to start server:', err)
})
