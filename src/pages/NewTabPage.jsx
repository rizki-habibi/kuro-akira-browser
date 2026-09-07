import React, { useState, useEffect } from 'react'
import './NewTabPage.css'

const QUICK = [
  { label: 'YouTube', url: 'https://youtube.com', favicon: 'https://www.youtube.com/favicon.ico' },
  { label: 'GitHub', url: 'https://github.com', favicon: 'https://github.com/favicon.ico' },
  { label: 'Google', url: 'https://google.com', favicon: 'https://www.google.com/favicon.ico' },
  { label: 'ChatGPT', url: 'https://chat.openai.com', favicon: 'https://chat.openai.com/favicon.ico' },
  { label: 'Instagram', url: 'https://instagram.com', favicon: 'https://www.instagram.com/favicon.ico' },
  { label: 'TikTok', url: 'https://tiktok.com', favicon: 'https://www.tiktok.com/favicon.ico' },
  { label: 'Twitter/X', url: 'https://x.com', favicon: 'https://x.com/favicon.ico' },
  { label: 'Facebook', url: 'https://facebook.com', favicon: 'https://www.facebook.com/favicon.ico' },
  { label: 'Wikipedia', url: 'https://wikipedia.org', favicon: 'https://www.wikipedia.org/favicon.ico' },
  { label: 'DuckDuckGo', url: 'https://duckduckgo.com', favicon: 'https://duckduckgo.com/favicon.ico' },
  { label: 'Reddit', url: 'https://reddit.com', favicon: 'https://www.reddit.com/favicon.ico' },
  { label: 'Tokopedia', url: 'https://tokopedia.com', favicon: 'https://www.tokopedia.com/favicon.ico' },
  { label: 'Shopee', url: 'https://shopee.co.id', favicon: 'https://shopee.co.id/favicon.ico' },
  { label: 'Detik', url: 'https://detik.com', favicon: 'https://www.detik.com/favicon.ico' },
  { label: 'Kompas', url: 'https://kompas.com', favicon: 'https://www.kompas.com/favicon.ico' },
  { label: 'WhatsApp', url: 'https://web.whatsapp.com', favicon: 'https://web.whatsapp.com/favicon.ico' },
]

function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="nt-clock">
      <div className="nt-time">
        {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="nt-date">
        {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  )
}

export default function NewTabPage({ onNavigate, blockedCount, settings }) {
  const [query, setQuery] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customLinks, setCustomLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ka_quicklinks') || '[]') } catch { return [] }
  })
  const [newLink, setNewLink] = useState({ label: '', url: '' })

  const doSearch = e => {
    e.preventDefault()
    if (!query.trim()) return
    onNavigate(`kuro://search?q=${encodeURIComponent(query.trim())}`)
  }

  const addCustomLink = () => {
    if (!newLink.url) return
    const updated = [...customLinks, { ...newLink, id: Date.now() }]
    setCustomLinks(updated)
    localStorage.setItem('ka_quicklinks', JSON.stringify(updated))
    setNewLink({ label: '', url: '' })
  }

  const removeCustomLink = id => {
    const updated = customLinks.filter(l => l.id !== id)
    setCustomLinks(updated)
    localStorage.setItem('ka_quicklinks', JSON.stringify(updated))
  }

  const allLinks = [...QUICK, ...customLinks.map(l => ({
    label: l.label || l.url, url: l.url,
    favicon: `https://www.google.com/s2/favicons?domain=${l.url}&sz=32`
  }))]

  const privLabel = {
    standard: { text: 'STANDAR', color: 'var(--green)' },
    high: { text: 'TINGGI', color: 'var(--silver)' },
    paranoid: { text: 'MAKS', color: 'var(--red-main)' },
  }[settings?.privacyLevel] || { text: 'TINGGI', color: 'var(--silver)' }

  return (
    <div className="newtab">
      <div className="nt-bg-glow" />

      <Clock />

      {/* Mascot + Branding */}
      <div className="nt-hero">
        <div className="nt-mascot-wrap">
          <img src="./assets/maskot-utama.png" alt="Kuro Akira" className="nt-mascot" />
        </div>
        <div className="nt-brand-text">
          <h1 className="nt-title">Kuro Akira</h1>
          <p className="nt-tagline">Browser Cepat · Aman · Penuh Kendali</p>
        </div>
      </div>

      {/* Search */}
      <form className="nt-search-form" onSubmit={doSearch}>
        <div className="nt-search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="nt-search-input"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari dengan KuroSearch atau masukkan URL..."
          />
          <button type="submit" className="nt-search-btn">Cari</button>
        </div>
        <div className="nt-search-engines">
          {['Google', 'Bing', 'DDG', 'YouTube', 'Wikipedia'].map(e => (
            <button
              key={e}
              type="button"
              className="nt-eng-btn"
              onClick={() => {
                if (!query) return
                const urls = {
                  Google: `https://www.google.com/search?q=`,
                  Bing: `https://www.bing.com/search?q=`,
                  DDG: `https://duckduckgo.com/?q=`,
                  YouTube: `https://www.youtube.com/results?search_query=`,
                  Wikipedia: `https://id.wikipedia.org/wiki/Special:Search?search=`,
                }
                onNavigate(urls[e] + encodeURIComponent(query))
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </form>

      {/* Stats */}
      <div className="nt-stats">
        {[
          { label: 'Diblokir', value: blockedCount.toLocaleString('id'), color: 'var(--red-main)' },
          { label: 'Privasi', value: privLabel.text, color: privLabel.color },
          { label: 'Tor', value: settings?.useTor ? 'ON' : 'OFF', color: settings?.useTor ? 'var(--green)' : 'var(--text-dim)' },
          { label: 'VPN', value: settings?.vpnEnabled ? 'ON' : 'OFF', color: settings?.vpnEnabled ? '#2196f3' : 'var(--text-dim)' },
          { label: 'Pemblokir', value: settings?.adBlockEnabled !== false ? 'ON' : 'OFF', color: settings?.adBlockEnabled !== false ? 'var(--red-main)' : 'var(--text-dim)' },
        ].map(s => (
          <div key={s.label} className="nt-stat-card">
            <div className="nt-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="nt-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="nt-quick-section">
        <div className="nt-quick-header">
          <span className="nt-quick-title">Akses Cepat</span>
          <button className="nt-quick-add" onClick={() => setShowCustom(v => !v)} title="Tambah tautan">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah
          </button>
        </div>

        {showCustom && (
          <div className="nt-add-link">
            <input
              className="nt-add-input"
              placeholder="Label"
              value={newLink.label}
              onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))}
            />
            <input
              className="nt-add-input"
              placeholder="URL (wajib)"
              value={newLink.url}
              onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))}
            />
            <button className="nt-add-save" onClick={addCustomLink}>Simpan</button>
          </div>
        )}

        <div className="nt-quick-grid">
          {allLinks.slice(0, 16).map((link, i) => (
            <div
              key={i}
              className="nt-quick-item"
              onClick={() => onNavigate(link.url)}
            >
              <img
                src={link.favicon}
                alt={link.label}
                width={22} height={22}
                className="nt-quick-icon"
                onError={e => { e.target.style.display = 'none' }}
              />
              <span className="nt-quick-label">{link.label}</span>
              {link.id && (
                <button
                  className="nt-quick-del"
                  onClick={e => { e.stopPropagation(); removeCustomLink(link.id) }}
                  title="Hapus"
                >×</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="nt-features">
        {[
          { img: './assets/maskot-ai.png', title: 'Kuro AI', desc: 'Asisten AI gratis multi-model', action: () => { } },
          { img: './assets/maskot-database.png', title: 'Database', desc: 'Profil & akun tak terbatas', action: () => { } },
          { img: './assets/maskot-media.png', title: 'Media', desc: 'Streaming tanpa iklan', action: () => onNavigate('https://youtube.com') },
          { img: './assets/maskot-terminal.png', title: 'Terminal', desc: 'Terminal terintegrasi (F12)', action: () => { } },
        ].map(f => (
          <button key={f.title} className="nt-feat-card" onClick={f.action}>
            <img src={f.img} alt={f.title} className="nt-feat-img" onError={e => e.target.style.display = 'none'} />
            <div className="nt-feat-title">{f.title}</div>
            <div className="nt-feat-desc">{f.desc}</div>
          </button>
        ))}
      </div>

      {/* Tips */}
      <div className="nt-tip">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          Tekan <kbd>F12</kbd> untuk terminal · <kbd>Ctrl+T</kbd> tab baru · <kbd>Ctrl+W</kbd> tutup tab · Klik sidebar untuk fitur lanjutan
        </span>
      </div>
    </div>
  )
}
