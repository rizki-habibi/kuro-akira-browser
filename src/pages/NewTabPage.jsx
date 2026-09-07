import React, { useState, useEffect } from 'react'
import './NewTabPage.css'

const QUICK_LINKS = [
  { label: 'YouTube', url: 'https://youtube.com', icon: 'https://www.youtube.com/favicon.ico' },
  { label: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico' },
  { label: 'Google', url: 'https://google.com', icon: 'https://www.google.com/favicon.ico' },
  { label: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://chat.openai.com/favicon.ico' },
  { label: 'Twitter/X', url: 'https://x.com', icon: 'https://x.com/favicon.ico' },
  { label: 'Instagram', url: 'https://instagram.com', icon: 'https://www.instagram.com/favicon.ico' },
  { label: 'Wikipedia', url: 'https://wikipedia.org', icon: 'https://www.wikipedia.org/favicon.ico' },
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com', icon: 'https://duckduckgo.com/favicon.ico' },
]

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div className="nt-clock">
      <div className="nt-time">{time}</div>
      <div className="nt-date">{date}</div>
    </div>
  )
}

export default function NewTabPage({ onNavigate, blockedCount, settings }) {
  const [query, setQuery] = useState('')

  const doSearch = e => {
    e.preventDefault()
    if (!query.trim()) return
    // Gunakan KuroSearch dulu
    onNavigate(`kuro://search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div className="newtab">
      <div className="nt-bg" />

      <Clock />

      {/* Logo & Branding */}
      <div className="nt-brand">
        <div className="nt-logo">
          <svg width="60" height="60" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#e53535" strokeWidth="5" />
            <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="none" stroke="rgba(229,53,53,.4)" strokeWidth="2" />
            <circle cx="50" cy="50" r="14" fill="#e53535" />
            <circle cx="50" cy="50" r="6" fill="#fff" />
          </svg>
        </div>
        <h1 className="nt-title">Kuro Akira</h1>
        <p className="nt-tagline">Browser Cepat, Aman, dan Penuh Kendali</p>
      </div>

      {/* Search */}
      <form className="nt-search-wrap" onSubmit={doSearch}>
        <div className="nt-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="nt-input"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari apa saja... (KuroSearch)"
          />
          <button type="submit" className="nt-go-btn">Cari</button>
        </div>
      </form>

      {/* Statistik */}
      <div className="nt-stats">
        {[
          { val: blockedCount.toLocaleString('id'), label: 'Diblokir', color: 'var(--red-main)' },
          { val: settings?.privacyLevel === 'paranoid' ? 'MAKS' : settings?.privacyLevel === 'high' ? 'TINGGI' : 'STD', label: 'Privasi', color: 'var(--silver)' },
          { val: settings?.useTor ? 'AKTIF' : 'NONAKTIF', label: 'Tor', color: settings?.useTor ? 'var(--green)' : 'var(--text-dim)' },
          { val: settings?.adBlockEnabled !== false ? 'ON' : 'OFF', label: 'Pemblokir', color: settings?.adBlockEnabled !== false ? 'var(--red-main)' : 'var(--text-dim)' },
        ].map(s => (
          <div key={s.label} className="nt-stat">
            <span className="nt-stat-val" style={{ color: s.color }}>{s.val}</span>
            <span className="nt-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Akses Cepat */}
      <div className="nt-quick">
        <div className="nt-quick-title">Akses Cepat</div>
        <div className="nt-quick-grid">
          {QUICK_LINKS.map(link => (
            <button key={link.url} className="nt-quick-item" onClick={() => onNavigate(link.url)}>
              <img
                src={link.icon}
                alt={link.label}
                width={22}
                height={22}
                onError={e => { e.target.style.display = 'none' }}
                className="nt-quick-icon"
              />
              <span className="nt-quick-label">{link.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="nt-tip">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          KuroSearch adalah mesin pencari buatan sendiri. Ketik langsung di sini atau di address bar untuk mencari.
        </span>
      </div>
    </div>
  )
}
