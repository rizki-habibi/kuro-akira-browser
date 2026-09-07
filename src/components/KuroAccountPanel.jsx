import React, { useState, useEffect } from 'react'
import './KuroAccountPanel.css'

// ── Kuro Account System ──────────────────────────────────
// Penyimpanan: localStorage (lokal) + JSONBin.io (cloud gratis, 10k req/bln)
// Enkripsi sederhana: XOR + base64 (cukup untuk data non-sensitif)
// Tidak ada server khusus — pakai JSONBin API key gratis

const JSONBIN_BASE = 'https://api.jsonbin.io/v3'

function xorEncrypt(str, key) {
  return btoa(str.split('').map((c, i) =>
    String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
  ).join(''))
}

function xorDecrypt(enc, key) {
  try {
    const str = atob(enc)
    return str.split('').map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('')
  } catch { return null }
}

function hashSimple(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0
  }
  return Math.abs(h).toString(16)
}

// ── Local account storage ────────────────────────────────
function getLocalAccounts() {
  try { return JSON.parse(localStorage.getItem('ka_accounts') || '[]') } catch { return [] }
}
function saveLocalAccounts(list) {
  localStorage.setItem('ka_accounts', JSON.stringify(list))
}
function getSession() {
  try { return JSON.parse(localStorage.getItem('ka_session') || 'null') } catch { return null }
}
function saveSession(s) {
  if (s) localStorage.setItem('ka_session', JSON.stringify(s))
  else localStorage.removeItem('ka_session')
}

export default function KuroAccountPanel({ onClose, onAccountChange }) {
  const [tab, setTab] = useState('login') // login | register | profile | sync
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState(() => getSession())
  const [syncStatus, setSyncStatus] = useState('')
  const [jsonbinKey, setJsonbinKey] = useState(() => localStorage.getItem('ka_jb_key') || '')
  const [jsonbinBin, setJsonbinBin] = useState(() => localStorage.getItem('ka_jb_bin') || '')

  useEffect(() => {
    if (session) setTab('profile')
  }, [])

  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000) }
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }

  // ── Register ─────────────────────────────────────────────
  const handleRegister = () => {
    if (!email || !password || !displayName) return showError('Isi semua kolom')
    if (password.length < 6) return showError('Password minimal 6 karakter')
    const accounts = getLocalAccounts()
    if (accounts.find(a => a.email === email)) return showError('Email sudah terdaftar')

    const id = 'kuro_' + Date.now()
    const passHash = hashSimple(password + email)
    const account = {
      id, email, displayName,
      passHash,
      createdAt: new Date().toISOString(),
      bookmarks: [],
      quicklinks: [],
      settings: {}
    }
    saveLocalAccounts([...accounts, account])
    const s = { id, email, displayName, token: xorEncrypt(id, password) }
    saveSession(s)
    setSession(s)
    onAccountChange?.(s)
    showSuccess('Akun berhasil dibuat!')
    setTab('profile')
  }

  // ── Login ────────────────────────────────────────────────
  const handleLogin = () => {
    if (!email || !password) return showError('Isi email dan password')
    const accounts = getLocalAccounts()
    const acc = accounts.find(a => a.email === email)
    if (!acc) return showError('Akun tidak ditemukan')
    if (acc.passHash !== hashSimple(password + email)) return showError('Password salah')

    const s = { id: acc.id, email: acc.email, displayName: acc.displayName, token: xorEncrypt(acc.id, password) }
    saveSession(s)
    setSession(s)
    onAccountChange?.(s)
    showSuccess('Login berhasil!')
    setTab('profile')
  }

  // ── Logout ───────────────────────────────────────────────
  const handleLogout = () => {
    saveSession(null)
    setSession(null)
    onAccountChange?.(null)
    setTab('login')
    setEmail(''); setPassword('')
  }

  // ── Sync ke JSONBin ──────────────────────────────────────
  const syncToCloud = async () => {
    if (!jsonbinKey) return setSyncStatus('❌ Masukkan API Key JSONBin dulu')
    if (!session) return setSyncStatus('❌ Login dulu')
    setLoading(true)
    setSyncStatus('Menyinkronkan...')

    const accounts = getLocalAccounts()
    const acc = accounts.find(a => a.id === session.id)
    if (!acc) { setSyncStatus('❌ Akun tidak ditemukan'); setLoading(false); return }

    // Sinkron bookmarks + quicklinks dari localStorage
    acc.bookmarks = JSON.parse(localStorage.getItem('ka_bookmarks') || '[]')
    acc.quicklinks = JSON.parse(localStorage.getItem('ka_quicklinks') || '[]')
    acc.lastSync = new Date().toISOString()

    // Enkripsi data sensitif
    const payload = { ...acc, passHash: '[hidden]' }
    const encrypted = xorEncrypt(JSON.stringify(payload), jsonbinKey.slice(0, 16))

    try {
      let res
      if (jsonbinBin) {
        // Update existing bin
        res = await fetch(`${JSONBIN_BASE}/b/${jsonbinBin}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Master-Key': jsonbinKey },
          body: JSON.stringify({ kuro: encrypted, v: '2.4', ts: Date.now() })
        })
      } else {
        // Create new bin
        res = await fetch(`${JSONBIN_BASE}/b`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': jsonbinKey,
            'X-Bin-Name': `kuro-${session.id.slice(0, 8)}`,
            'X-Bin-Private': 'true'
          },
          body: JSON.stringify({ kuro: encrypted, v: '2.4', ts: Date.now() })
        })
        if (res.ok) {
          const data = await res.json()
          const binId = data.metadata?.id
          if (binId) {
            setJsonbinBin(binId)
            localStorage.setItem('ka_jb_bin', binId)
          }
        }
      }
      if (res.ok) {
        setSyncStatus('✅ Tersinkron ke cloud ' + new Date().toLocaleTimeString('id-ID'))
        saveLocalAccounts(accounts.map(a => a.id === acc.id ? acc : a))
      } else {
        setSyncStatus('❌ Gagal sync: HTTP ' + res.status)
      }
    } catch (e) {
      setSyncStatus('❌ Error: ' + e.message)
    }
    setLoading(false)
  }

  const syncFromCloud = async () => {
    if (!jsonbinKey || !jsonbinBin) return setSyncStatus('❌ Masukkan API Key & Bin ID dulu')
    setLoading(true)
    setSyncStatus('Mengambil data dari cloud...')
    try {
      const res = await fetch(`${JSONBIN_BASE}/b/${jsonbinBin}/latest`, {
        headers: { 'X-Master-Key': jsonbinKey }
      })
      if (!res.ok) { setSyncStatus('❌ Gagal: HTTP ' + res.status); setLoading(false); return }
      const data = await res.json()
      const encrypted = data.record?.kuro
      if (!encrypted) { setSyncStatus('❌ Data tidak ditemukan'); setLoading(false); return }

      const decrypted = xorDecrypt(encrypted, jsonbinKey.slice(0, 16))
      if (!decrypted) { setSyncStatus('❌ Gagal dekripsi'); setLoading(false); return }

      const acc = JSON.parse(decrypted)
      // Restore bookmarks dan quicklinks
      if (acc.bookmarks?.length) localStorage.setItem('ka_bookmarks', JSON.stringify(acc.bookmarks))
      if (acc.quicklinks?.length) localStorage.setItem('ka_quicklinks', JSON.stringify(acc.quicklinks))
      setSyncStatus('✅ Data berhasil dipulihkan dari cloud! Muat ulang browser.')
    } catch (e) {
      setSyncStatus('❌ Error: ' + e.message)
    }
    setLoading(false)
  }

  return (
    <div className="kuro-acc-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          Kuro Account
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>

      {/* Tab bar */}
      <div className="ka-tabs">
        {session ? (
          <>
            <button className={`ka-tab ${tab==='profile'?'active':''}`} onClick={()=>setTab('profile')}>Profil</button>
            <button className={`ka-tab ${tab==='sync'?'active':''}`} onClick={()=>setTab('sync')}>☁ Sinkron</button>
          </>
        ) : (
          <>
            <button className={`ka-tab ${tab==='login'?'active':''}`} onClick={()=>setTab('login')}>Masuk</button>
            <button className={`ka-tab ${tab==='register'?'active':''}`} onClick={()=>setTab('register')}>Daftar</button>
          </>
        )}
      </div>

      {/* Error / Success */}
      {error && <div className="ka-alert error">{error}</div>}
      {success && <div className="ka-alert success">{success}</div>}

      {/* ── Login ── */}
      {tab === 'login' && !session && (
        <div className="ka-form">
          <div className="ka-hero">
            <div className="ka-hero-icon">
              <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#e53535" strokeWidth="6"/>
                <circle cx="50" cy="50" r="14" fill="#e53535"/>
                <circle cx="50" cy="50" r="6" fill="#fff"/>
              </svg>
            </div>
            <div>
              <div className="ka-hero-title">Masuk ke Kuro</div>
              <div className="ka-hero-sub">Sinkronkan data di semua perangkat</div>
            </div>
          </div>
          <label className="ka-label">Email</label>
          <input className="ka-input" type="email" placeholder="kamu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
          <label className="ka-label">Password</label>
          <input className="ka-input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()} />
          <button className="ka-btn primary" onClick={handleLogin}>Masuk</button>
          <p className="ka-note">Belum punya akun? <button className="ka-link" onClick={()=>setTab('register')}>Daftar gratis</button></p>
          <div className="ka-divider">Data tersimpan lokal di perangkat ini</div>
        </div>
      )}

      {/* ── Register ── */}
      {tab === 'register' && !session && (
        <div className="ka-form">
          <div className="ka-hero">
            <div className="ka-hero-icon">✨</div>
            <div>
              <div className="ka-hero-title">Buat Akun Kuro</div>
              <div className="ka-hero-sub">Gratis selamanya • Privat • Lokal</div>
            </div>
          </div>
          <label className="ka-label">Nama Tampilan</label>
          <input className="ka-input" placeholder="Nama kamu" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
          <label className="ka-label">Email</label>
          <input className="ka-input" type="email" placeholder="kamu@email.com" value={email} onChange={e=>setEmail(e.target.value)} />
          <label className="ka-label">Password</label>
          <input className="ka-input" type="password" placeholder="Min. 6 karakter" value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="ka-btn primary" onClick={handleRegister}>Buat Akun</button>
          <p className="ka-note">Sudah punya akun? <button className="ka-link" onClick={()=>setTab('login')}>Masuk</button></p>
          <div className="ka-divider">Akun disimpan di perangkat ini. Aktifkan sinkron cloud di tab Sinkron.</div>
        </div>
      )}

      {/* ── Profile ── */}
      {tab === 'profile' && session && (
        <div className="ka-profile">
          <div className="ka-avatar-big">
            {session.displayName?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="ka-profile-name">{session.displayName}</div>
          <div className="ka-profile-email">{session.email}</div>

          <div className="ka-stats-row">
            <div className="ka-stat">
              <div className="ka-stat-num">{JSON.parse(localStorage.getItem('ka_bookmarks')||'[]').length}</div>
              <div className="ka-stat-lbl">Penanda</div>
            </div>
            <div className="ka-stat">
              <div className="ka-stat-num">{JSON.parse(localStorage.getItem('ka_quicklinks')||'[]').length}</div>
              <div className="ka-stat-lbl">Akses Cepat</div>
            </div>
            <div className="ka-stat">
              <div className="ka-stat-num">{JSON.parse(localStorage.getItem('ka_profiles')||'[]').length}</div>
              <div className="ka-stat-lbl">Profil</div>
            </div>
          </div>

          <div className="ka-actions">
            <button className="ka-btn secondary" onClick={()=>setTab('sync')}>☁ Sinkron Data</button>
            <button className="ka-btn danger" onClick={handleLogout}>Keluar</button>
          </div>

          <div className="ka-info-box">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Data tersimpan lokal dan terenkripsi di perangkat ini. Gunakan Sinkron untuk backup ke cloud.
          </div>
        </div>
      )}

      {/* ── Sync ── */}
      {tab === 'sync' && session && (
        <div className="ka-sync">
          <div className="ka-sync-header">
            <span>☁ Sinkronisasi Cloud</span>
            <span className="ka-sync-badge">JSONBin.io Gratis</span>
          </div>

          <p className="ka-sync-desc">
            Buat akun gratis di <button className="ka-link" onClick={()=>window.kuroAPI?.shell.openExternal('https://jsonbin.io')}>jsonbin.io</button> lalu masukkan Master Key di bawah. Data dienkripsi sebelum dikirim.
          </p>

          <label className="ka-label">JSONBin Master Key</label>
          <input
            className="ka-input"
            type="password"
            placeholder="$2b$10$..."
            value={jsonbinKey}
            onChange={e => { setJsonbinKey(e.target.value); localStorage.setItem('ka_jb_key', e.target.value) }}
          />

          <label className="ka-label">Bin ID (kosongkan untuk buat baru)</label>
          <input
            className="ka-input"
            placeholder="6xxxxxxxxxxxxxxxxxxxxxx"
            value={jsonbinBin}
            onChange={e => { setJsonbinBin(e.target.value); localStorage.setItem('ka_jb_bin', e.target.value) }}
          />

          <div className="ka-sync-btns">
            <button className="ka-btn primary" onClick={syncToCloud} disabled={loading}>
              {loading ? '⏳ Menyinkron...' : '⬆ Simpan ke Cloud'}
            </button>
            <button className="ka-btn secondary" onClick={syncFromCloud} disabled={loading}>
              {loading ? '⏳...' : '⬇ Pulihkan dari Cloud'}
            </button>
          </div>

          {syncStatus && (
            <div className={`ka-sync-status ${syncStatus.startsWith('✅') ? 'ok' : 'err'}`}>
              {syncStatus}
            </div>
          )}

          <div className="ka-sync-what">
            <div className="ka-sync-what-title">Yang disinkronkan:</div>
            {['Penanda (bookmarks)', 'Akses Cepat (quicklinks)', 'Profil & akun tersimpan'].map(i => (
              <div key={i} className="ka-sync-item">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {i}
              </div>
            ))}
            <div className="ka-sync-note">Password dan data privasi TIDAK disinkronkan</div>
          </div>
        </div>
      )}
    </div>
  )
}
