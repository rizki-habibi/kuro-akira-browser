import React, { useState, useEffect, useCallback } from 'react'
import './DatabasePanel.css'

// ═══════════════════════════════════════════════════════
// KURO DATABASE — Supabase Backend
// URL: https://supabase.com — Gratis 500MB database + Auth
//
// Setup:
//  1. Daftar di supabase.com (gratis)
//  2. Buat project baru
//  3. Copy URL + anon key ke Settings > Database
//  4. Jalankan SQL di bawah di Supabase SQL Editor:
//
//  CREATE TABLE kuro_users (
//    id uuid REFERENCES auth.users PRIMARY KEY,
//    email text, display_name text,
//    created_at timestamptz DEFAULT now()
//  );
//  CREATE TABLE kuro_bookmarks (
//    id bigserial PRIMARY KEY,
//    user_id uuid REFERENCES kuro_users(id),
//    title text, url text, folder text, tags text,
//    created_at timestamptz DEFAULT now()
//  );
//  CREATE TABLE kuro_settings (
//    user_id uuid REFERENCES kuro_users(id) PRIMARY KEY,
//    data jsonb, updated_at timestamptz DEFAULT now()
//  );
//  CREATE TABLE kuro_history (
//    id bigserial PRIMARY KEY,
//    user_id uuid REFERENCES kuro_users(id),
//    url text, title text, visited_at timestamptz DEFAULT now()
//  );
//  ALTER TABLE kuro_bookmarks ENABLE ROW LEVEL SECURITY;
//  ALTER TABLE kuro_settings  ENABLE ROW LEVEL SECURITY;
//  ALTER TABLE kuro_history   ENABLE ROW LEVEL SECURITY;
//  CREATE POLICY "own" ON kuro_bookmarks USING (user_id = auth.uid());
//  CREATE POLICY "own" ON kuro_settings  USING (user_id = auth.uid());
//  CREATE POLICY "own" ON kuro_history   USING (user_id = auth.uid());
// ═══════════════════════════════════════════════════════

// ── Supabase lite client (tanpa package, pure fetch) ──
class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url.replace(/\/$/, '')
    this.key = anonKey
    this.token = null
    this.user  = null
  }

  headers(extra = {}) {
    return {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Authorization': `Bearer ${this.token || this.key}`,
      ...extra
    }
  }

  async signUp(email, password, displayName) {
    const r = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password, data: { display_name: displayName } })
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error_description || d.message || 'Gagal daftar')
    if (d.access_token) {
      this.token = d.access_token
      this.user  = d.user
    }
    return d
  }

  async signIn(email, password) {
    const r = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ email, password })
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error_description || d.message || 'Login gagal')
    this.token = d.access_token
    this.user  = d.user
    return d
  }

  async signInWithGoogle() {
    // Redirect ke Supabase Google OAuth
    const redirectUrl = 'kuro://auth/callback'
    const url = `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`
    window.kuroAPI?.shell?.openExternal(url)
    return { ok: true, message: 'Browser dibuka untuk login Google' }
  }

  async signOut() {
    if (this.token) {
      await fetch(`${this.url}/auth/v1/logout`, { method: 'POST', headers: this.headers() }).catch(() => {})
    }
    this.token = null
    this.user  = null
  }

  async getUser() {
    if (!this.token) return null
    const r = await fetch(`${this.url}/auth/v1/user`, { headers: this.headers() })
    if (!r.ok) return null
    const d = await r.json()
    this.user = d
    return d
  }

  async from(table) {
    return new SupabaseQuery(this, table)
  }

  query(table) { return new SupabaseQuery(this, table) }
}

class SupabaseQuery {
  constructor(client, table) {
    this.client  = client
    this.table   = table
    this._select = '*'
    this._filters = []
    this._order  = ''
    this._limit  = ''
  }

  select(cols = '*') { this._select = cols; return this }
  eq(col, val)       { this._filters.push(`${col}=eq.${encodeURIComponent(val)}`); return this }
  order(col, { ascending = true } = {}) { this._order = `order=${col}.${ascending?'asc':'desc'}`; return this }
  limit(n)           { this._limit = `limit=${n}`; return this }

  buildUrl(method = 'GET') {
    let url = `${this.client.url}/rest/v1/${this.table}?select=${this._select}`
    if (this._filters.length) url += '&' + this._filters.join('&')
    if (this._order) url += '&' + this._order
    if (this._limit) url += '&' + this._limit
    return url
  }

  async get()  {
    const r = await fetch(this.buildUrl(), { headers: this.client.headers({ 'Accept': 'application/json' }) })
    const d = await r.json()
    if (!r.ok) throw new Error(d.message || 'Query error')
    return { data: d, error: null }
  }

  async insert(row) {
    const r = await fetch(`${this.client.url}/rest/v1/${this.table}`, {
      method: 'POST',
      headers: this.client.headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(row)
    })
    const d = await r.json()
    if (!r.ok) throw new Error(Array.isArray(d) ? d[0]?.message : d.message || 'Insert error')
    return { data: d, error: null }
  }

  async update(row) {
    const url = this.buildUrl('PATCH').replace('?select=*', '')
    const r = await fetch(url, {
      method: 'PATCH',
      headers: this.client.headers({ 'Prefer': 'return=representation' }),
      body: JSON.stringify(row)
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.message || 'Update error')
    return { data: d, error: null }
  }

  async delete() {
    const url = this.buildUrl('DELETE').replace('?select=*', '')
    const r = await fetch(url, { method: 'DELETE', headers: this.client.headers() })
    if (!r.ok) { const d = await r.json(); throw new Error(d.message || 'Delete error') }
    return { error: null }
  }

  async upsert(row) {
    const r = await fetch(`${this.client.url}/rest/v1/${this.table}`, {
      method: 'POST',
      headers: this.client.headers({ 'Prefer': 'return=representation,resolution=merge-duplicates' }),
      body: JSON.stringify(row)
    })
    const d = await r.json()
    if (!r.ok) throw new Error(Array.isArray(d) ? d[0]?.message : d.message || 'Upsert error')
    return { data: d, error: null }
  }
}

// ── Session storage ───────────────────────────────────
const SESS_KEY = 'ka_db_session'
function saveSession(token, user, url, key) {
  localStorage.setItem(SESS_KEY, JSON.stringify({ token, user, url, key, ts: Date.now() }))
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESS_KEY) || 'null') } catch { return null }
}

// ── Main Component ────────────────────────────────────
export default function DatabasePanel({ onClose }) {
  const [tab, setTab]       = useState('login')  // login|register|dashboard|settings|data
  const [client, setClient] = useState(null)
  const [user, setUser]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState({ text: '', type: '' })

  // Form state
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [name, setName]     = useState('')
  const [sbUrl, setSbUrl]   = useState(() => localStorage.getItem('ka_sb_url') || '')
  const [sbKey, setSbKey]   = useState(() => localStorage.getItem('ka_sb_key') || '')

  // Data state
  const [bookmarks, setBookmarks] = useState([])
  const [syncStatus, setSyncStatus] = useState('')
  const [stats, setStats]   = useState({ bookmarks: 0, history: 0 })

  const flash = (text, type = 'ok', dur = 4000) => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), dur)
  }

  // Auto-restore session
  useEffect(() => {
    const sess = loadSession()
    if (sess?.token && sess?.url && sess?.key) {
      const c = new SupabaseClient(sess.url, sess.key)
      c.token = sess.token
      c.user  = sess.user
      setClient(c)
      setUser(sess.user)
      setSbUrl(sess.url)
      setSbKey(sess.key)
      setTab('dashboard')
      // Verify token still valid
      c.getUser().then(u => { if (!u) { setUser(null); setClient(null); setTab('login') } }).catch(() => {})
    }
  }, [])

  const getClient = () => {
    if (!sbUrl || !sbKey) return null
    return new SupabaseClient(sbUrl, sbKey)
  }

  // ── Register ─────────────────────────────────────────
  const handleRegister = async () => {
    if (!email || !pass || !name) return flash('Isi semua kolom', 'err')
    if (!sbUrl || !sbKey) return flash('Isi Supabase URL & API Key dulu', 'err')
    if (pass.length < 6) return flash('Password min. 6 karakter', 'err')
    setLoading(true)
    try {
      const c = new SupabaseClient(sbUrl, sbKey)
      await c.signUp(email, pass, name)
      localStorage.setItem('ka_sb_url', sbUrl)
      localStorage.setItem('ka_sb_key', sbKey)
      flash('✅ Akun dibuat! Cek email untuk verifikasi, lalu login.', 'ok', 6000)
      setTab('login')
    } catch(e) { flash('❌ ' + e.message, 'err') }
    setLoading(false)
  }

  // ── Login ─────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !pass) return flash('Isi email & password', 'err')
    if (!sbUrl || !sbKey) return flash('Isi Supabase URL & API Key dulu', 'err')
    setLoading(true)
    try {
      const c = new SupabaseClient(sbUrl, sbKey)
      await c.signIn(email, pass)
      localStorage.setItem('ka_sb_url', sbUrl)
      localStorage.setItem('ka_sb_key', sbKey)
      saveSession(c.token, c.user, sbUrl, sbKey)
      setClient(c)
      setUser(c.user)
      setTab('dashboard')
      flash('✅ Login berhasil!', 'ok')
      loadData(c)
    } catch(e) { flash('❌ ' + e.message, 'err') }
    setLoading(false)
  }

  // ── Google OAuth ──────────────────────────────────────
  const handleGoogle = async () => {
    if (!sbUrl || !sbKey) return flash('Isi Supabase URL & API Key dulu', 'err')
    const c = getClient() || new SupabaseClient(sbUrl, sbKey)
    await c.signInWithGoogle()
    flash('Browser dibuka untuk login Google. Setelah login, masukkan token di tab Settings.', 'info', 8000)
  }

  // ── Logout ─────────────────────────────────────────────
  const handleLogout = async () => {
    if (client) await client.signOut()
    localStorage.removeItem(SESS_KEY)
    setClient(null); setUser(null); setTab('login')
    setBookmarks([]); setStats({ bookmarks: 0, history: 0 })
    flash('Logout berhasil', 'ok')
  }

  // ── Load data from cloud ──────────────────────────────
  const loadData = useCallback(async (c = client) => {
    if (!c?.user) return
    try {
      const uid = c.user.id
      const { data: bm } = await c.query('kuro_bookmarks').select('id,title,url,folder,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(50).get()
      setBookmarks(bm || [])
      setStats({ bookmarks: (bm||[]).length, history: 0 })
    } catch(e) { console.warn('loadData error:', e.message) }
  }, [client])

  useEffect(() => { if (client && tab === 'dashboard') loadData() }, [tab])

  // ── Sync bookmarks lokal → cloud ──────────────────────
  const syncToCloud = async () => {
    if (!client?.user) return
    setSyncStatus('Menyinkronkan...')
    try {
      const local = JSON.parse(localStorage.getItem('ka_bookmarks') || '[]')
      const uid   = client.user.id
      let ok = 0
      for (const bm of local) {
        await client.query('kuro_bookmarks').upsert({
          user_id: uid, title: bm.title || bm.url, url: bm.url,
          folder: bm.folder || 'Umum', tags: bm.tags || ''
        }).catch(() => {})
        ok++
      }
      setSyncStatus(`✅ ${ok} penanda tersinkron ke cloud`)
      loadData()
    } catch(e) { setSyncStatus('❌ ' + e.message) }
  }

  // ── Sync cloud → lokal ────────────────────────────────
  const syncFromCloud = async () => {
    if (!client?.user) return
    setSyncStatus('Mengambil data dari cloud...')
    try {
      await loadData()
      const mapped = bookmarks.map(b => ({ id: Date.now() + Math.random(), title: b.title, url: b.url, folder: b.folder, tags: b.tags || '', addedAt: b.created_at }))
      const existing = JSON.parse(localStorage.getItem('ka_bookmarks') || '[]')
      const merged = [...existing]
      mapped.forEach(m => { if (!merged.find(e => e.url === m.url)) merged.push(m) })
      localStorage.setItem('ka_bookmarks', JSON.stringify(merged))
      setSyncStatus(`✅ ${mapped.length} penanda dipulihkan dari cloud`)
    } catch(e) { setSyncStatus('❌ ' + e.message) }
  }

  // ── Delete bookmark from cloud ────────────────────────
  const deleteBookmark = async (id) => {
    if (!client) return
    await client.query('kuro_bookmarks').eq('id', String(id)).delete()
    setBookmarks(prev => prev.filter(b => b.id !== id))
  }

  const isConfigured = sbUrl && sbKey

  return (
    <div className="db-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          Database Kuro
          {user && <span className="db-badge-online">Online</span>}
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="db-tabs">
        {user ? (
          <>
            <button className={`db-tab ${tab==='dashboard'?'active':''}`} onClick={() => setTab('dashboard')}>Dashboard</button>
            <button className={`db-tab ${tab==='data'?'active':''}`} onClick={() => { setTab('data'); loadData() }}>Data</button>
            <button className={`db-tab ${tab==='sync'?'active':''}`} onClick={() => setTab('sync')}>Sinkron</button>
          </>
        ) : (
          <>
            <button className={`db-tab ${tab==='login'?'active':''}`} onClick={() => setTab('login')}>Masuk</button>
            <button className={`db-tab ${tab==='register'?'active':''}`} onClick={() => setTab('register')}>Daftar</button>
            <button className={`db-tab ${tab==='setup'?'active':''}`} onClick={() => setTab('setup')}>Setup</button>
          </>
        )}
      </div>

      {/* Message bar */}
      {msg.text && (
        <div className={`db-msg ${msg.type}`}>{msg.text}</div>
      )}

      <div className="db-content">

        {/* ── Setup Supabase ── */}
        {tab === 'setup' && (
          <div className="db-form">
            <div className="db-setup-hero">
              <div className="db-setup-icon">🗄️</div>
              <div>
                <div className="db-setup-title">Hubungkan Supabase</div>
                <div className="db-setup-sub">Backend gratis — 500MB database + Auth</div>
              </div>
            </div>

            <div className="db-steps">
              <div className="db-step">
                <span className="db-step-num">1</span>
                <span>Daftar gratis di <button className="db-link" onClick={() => window.kuroAPI?.shell?.openExternal('https://supabase.com')}>supabase.com</button></span>
              </div>
              <div className="db-step">
                <span className="db-step-num">2</span>
                <span>Buat project baru, pilih region terdekat</span>
              </div>
              <div className="db-step">
                <span className="db-step-num">3</span>
                <span>Copy URL + anon key dari Project Settings → API</span>
              </div>
              <div className="db-step">
                <span className="db-step-num">4</span>
                <span>Paste di bawah, lalu klik Simpan</span>
              </div>
            </div>

            <label className="db-label">Project URL</label>
            <input className="db-input" placeholder="https://xxxx.supabase.co" value={sbUrl} onChange={e => setSbUrl(e.target.value)} />

            <label className="db-label">Anon/Public API Key</label>
            <input className="db-input" type="password" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value={sbKey} onChange={e => setSbKey(e.target.value)} />

            <button className="db-btn primary" onClick={() => {
              if (!sbUrl || !sbKey) return flash('URL dan Key wajib diisi', 'err')
              localStorage.setItem('ka_sb_url', sbUrl)
              localStorage.setItem('ka_sb_key', sbKey)
              flash('✅ Konfigurasi disimpan!', 'ok')
              setTab('register')
            }}>Simpan & Lanjut Daftar</button>

            <div className="db-sql-hint">
              <div className="db-sql-title">SQL untuk tabel database (jalankan di Supabase SQL Editor):</div>
              <button className="db-link" onClick={() => window.kuroAPI?.shell?.openExternal('https://github.com/rizki-habibi/kuro-akira-browser/blob/main/README.md#database-setup')}>
                Lihat panduan lengkap →
              </button>
            </div>
          </div>
        )}

        {/* ── Login ── */}
        {tab === 'login' && (
          <div className="db-form">
            <div className="db-auth-hero">
              <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#e53535" strokeWidth="6"/>
                <circle cx="50" cy="50" r="14" fill="#e53535"/>
                <circle cx="50" cy="50" r="6" fill="#fff"/>
              </svg>
              <div className="db-auth-title">Masuk ke Kuro</div>
              <div className="db-auth-sub">Sinkronkan data di semua perangkat</div>
            </div>

            {!isConfigured && (
              <div className="db-warn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Belum ada Supabase terhubung. <button className="db-link" onClick={() => setTab('setup')}>Setup dulu →</button>
              </div>
            )}

            {/* Google Login */}
            <button className="db-btn google" onClick={handleGoogle} disabled={!isConfigured}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Masuk dengan Google
            </button>

            <div className="db-divider-text"><span>atau email</span></div>

            <label className="db-label">Email</label>
            <input className="db-input" type="email" placeholder="kamu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />

            <label className="db-label">Password</label>
            <input className="db-input" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />

            <button className="db-btn primary" onClick={handleLogin} disabled={loading || !isConfigured}>
              {loading ? '⏳ Masuk...' : 'Masuk'}
            </button>

            <p className="db-note">Belum punya akun? <button className="db-link" onClick={() => setTab('register')}>Daftar gratis</button></p>
          </div>
        )}

        {/* ── Register ── */}
        {tab === 'register' && (
          <div className="db-form">
            <div className="db-auth-hero">
              <div style={{ fontSize: '32px' }}>✨</div>
              <div className="db-auth-title">Buat Akun Kuro</div>
              <div className="db-auth-sub">Gratis • Aman • Sinkron semua perangkat</div>
            </div>

            {!isConfigured && (
              <div className="db-warn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Belum ada Supabase terhubung. <button className="db-link" onClick={() => setTab('setup')}>Setup dulu →</button>
              </div>
            )}

            {/* Google */}
            <button className="db-btn google" onClick={handleGoogle} disabled={!isConfigured}>
              <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Daftar dengan Google
            </button>
            <div className="db-divider-text"><span>atau email</span></div>

            <label className="db-label">Nama Tampilan</label>
            <input className="db-input" placeholder="Nama kamu" value={name} onChange={e => setName(e.target.value)} />

            <label className="db-label">Email</label>
            <input className="db-input" type="email" placeholder="kamu@email.com" value={email} onChange={e => setEmail(e.target.value)} />

            <label className="db-label">Password (min. 6 karakter)</label>
            <input className="db-input" type="password" placeholder="Password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==='Enter' && handleRegister()} />

            <button className="db-btn primary" onClick={handleRegister} disabled={loading || !isConfigured}>
              {loading ? '⏳ Mendaftar...' : 'Buat Akun'}
            </button>

            <p className="db-note">Sudah punya akun? <button className="db-link" onClick={() => setTab('login')}>Masuk</button></p>
            <p className="db-note">Belum setup Supabase? <button className="db-link" onClick={() => setTab('setup')}>Setup dulu</button></p>
          </div>
        )}

        {/* ── Dashboard ── */}
        {tab === 'dashboard' && user && (
          <div className="db-dashboard">
            <div className="db-avatar-wrap">
              <div className="db-avatar">{(user.email||'?').charAt(0).toUpperCase()}</div>
              <div>
                <div className="db-user-name">{user.user_metadata?.display_name || user.email?.split('@')[0]}</div>
                <div className="db-user-email">{user.email}</div>
              </div>
            </div>

            <div className="db-stats-row">
              <div className="db-stat">
                <div className="db-stat-num">{stats.bookmarks}</div>
                <div className="db-stat-lbl">Penanda Cloud</div>
              </div>
              <div className="db-stat">
                <div className="db-stat-num">{JSON.parse(localStorage.getItem('ka_bookmarks')||'[]').length}</div>
                <div className="db-stat-lbl">Penanda Lokal</div>
              </div>
              <div className="db-stat">
                <div className="db-stat-num">{JSON.parse(localStorage.getItem('ka_quicklinks')||'[]').length}</div>
                <div className="db-stat-lbl">Akses Cepat</div>
              </div>
            </div>

            <div className="db-actions">
              <button className="db-btn secondary" onClick={() => setTab('sync')}>
                ☁ Sinkronkan Data
              </button>
              <button className="db-btn secondary" onClick={() => { setTab('data'); loadData() }}>
                📋 Lihat Data Cloud
              </button>
              <button className="db-btn danger" onClick={handleLogout}>
                Keluar
              </button>
            </div>

            <div className="db-info">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Data disimpan aman di Supabase (server kamu sendiri). Kuro tidak menyimpan password.
            </div>
          </div>
        )}

        {/* ── Data Cloud ── */}
        {tab === 'data' && user && (
          <div className="db-data">
            <div className="db-data-header">
              <span className="db-data-title">Penanda Cloud ({bookmarks.length})</span>
              <button className="db-refresh" onClick={() => loadData()}>↻ Refresh</button>
            </div>

            {bookmarks.length === 0 ? (
              <div className="db-empty">
                Tidak ada penanda di cloud.<br/>
                Gunakan tab Sinkron untuk upload dari lokal.
              </div>
            ) : (
              <div className="db-bookmark-list">
                {bookmarks.map(bm => (
                  <div key={bm.id} className="db-bookmark-item">
                    <img
                      src={`https://www.google.com/s2/favicons?domain=${bm.url}&sz=14`}
                      alt="" width={14} height={14}
                      onError={e => e.target.style.display='none'}
                    />
                    <div className="db-bm-info">
                      <div className="db-bm-title">{bm.title}</div>
                      <div className="db-bm-url">{bm.url}</div>
                    </div>
                    <div className="db-bm-folder">{bm.folder}</div>
                    <button className="db-bm-del" onClick={() => deleteBookmark(bm.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sync ── */}
        {tab === 'sync' && user && (
          <div className="db-sync">
            <div className="db-sync-title">☁ Sinkronisasi Data</div>

            <div className="db-sync-items">
              {[
                { label: 'Penanda (bookmarks)', local: JSON.parse(localStorage.getItem('ka_bookmarks')||'[]').length, cloud: stats.bookmarks },
                { label: 'Akses Cepat', local: JSON.parse(localStorage.getItem('ka_quicklinks')||'[]').length, cloud: '-' },
                { label: 'Riwayat', local: JSON.parse(localStorage.getItem('ka_nav_history')||'[]').length, cloud: '-' },
              ].map(item => (
                <div key={item.label} className="db-sync-item-row">
                  <span className="db-sync-item-name">{item.label}</span>
                  <span className="db-sync-local">{item.local} lokal</span>
                  <span className="db-sync-cloud">{item.cloud} cloud</span>
                </div>
              ))}
            </div>

            <div className="db-sync-btns">
              <button className="db-btn primary" onClick={syncToCloud}>
                ⬆ Upload ke Cloud
              </button>
              <button className="db-btn secondary" onClick={syncFromCloud}>
                ⬇ Unduh dari Cloud
              </button>
            </div>

            {syncStatus && (
              <div className={`db-msg ${syncStatus.startsWith('✅') ? 'ok' : syncStatus.startsWith('❌') ? 'err' : 'info'}`}>
                {syncStatus}
              </div>
            )}

            <div className="db-sync-note">
              Upload: data lokal → Supabase cloud<br/>
              Unduh: data cloud → gabung dengan lokal
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
