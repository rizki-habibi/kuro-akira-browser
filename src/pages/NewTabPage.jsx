import React, { useState, useEffect, useRef } from 'react'
import { safeStorage } from '../lib/storage'
import './NewTabPage.css'

const QUICK = [
  { label: 'Proton Mail', url: 'kuro://proton', favicon: 'https://mail.proton.me/favicon.ico' },
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

export default function NewTabPage({ onNavigate, blockedCount, settings, onPanelToggle, onOpenTerminal }) {
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [customLinks, setCustomLinks] = useState(() => safeStorage.getJSON('ka_quicklinks', []))
  const [newLink, setNewLink] = useState({ label: '', url: '' })
  const [urlFocused, setUrlFocused] = useState(false)
  const urlInputRef = useRef(null)

  // Focus URL input when modal opens
  useEffect(() => {
    if (showModal) setTimeout(() => urlInputRef.current?.focus(), 50)
  }, [showModal])

  // Close modal on Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') setShowModal(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const doSearch = e => {
    e.preventDefault()
    if (!query.trim()) return
    onNavigate(`kuro://search?q=${encodeURIComponent(query.trim())}`)
  }

  const addCustomLink = () => {
    let url = newLink.url.trim()
    if (!url) return
    if (!url.startsWith('http') && !url.startsWith('kuro://')) url = 'https://' + url
    const label = newLink.label.trim() || (() => { try { return new URL(url).hostname } catch { return url } })()
    const updated = [...customLinks, { label, url, id: Date.now() }]
    setCustomLinks(updated)
    safeStorage.setJSON('ka_quicklinks', updated)
    setNewLink({ label: '', url: '' })
    setShowModal(false)
  }

  const removeCustomLink = id => {
    const updated = customLinks.filter(l => l.id !== id)
    setCustomLinks(updated)
    safeStorage.setJSON('ka_quicklinks', updated)
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
          <img src="/assets/maskot-utama.png" alt="Kuro Akira" className="nt-mascot" />
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
          {[
            { label: 'Google', url: 'https://www.google.com/search?q=' },
            { label: 'Bing', url: 'https://www.bing.com/search?q=' },
            { label: 'DDG', url: 'https://duckduckgo.com/?q=' },
            { label: 'YouTube', url: 'https://www.youtube.com/results?search_query=' },
            { label: 'Wikipedia', url: 'https://id.wikipedia.org/wiki/Special:Search?search=' },
            { label: '🧅 Onion', url: 'kuro://search?onion=1&q=' },
          ].map(e => (
            <button
              key={e.label}
              type="button"
              className={`nt-eng-btn ${e.label === '🧅 Onion' ? 'nt-eng-onion' : ''}`}
              onClick={() => {
                if (!query) return
                onNavigate(e.url + encodeURIComponent(query))
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </form>

      {/* Stats */}
      <div className="nt-stats">
        {[
          { label: 'Diblokir', value: blockedCount.toLocaleString('id'), color: 'var(--red-main)', onClick: null },
          { label: 'Privasi', value: privLabel.text, color: privLabel.color, onClick: null },
          {
            label: 'Tor',
            value: settings?.useTor ? 'ON' : 'OFF',
            color: settings?.useTor ? 'var(--green)' : 'var(--text-dim)',
            onClick: async () => {
              if (settings?.useTor) {
                await window.kuroAPI?.tor?.stop?.()
                onPanelToggle?.('_setting_useTor_false')
              } else {
                onPanelToggle?.('tor')
              }
            }
          },
          {
            label: 'VPN',
            value: settings?.vpnEnabled ? 'ON' : 'OFF',
            color: settings?.vpnEnabled ? '#2196f3' : 'var(--text-dim)',
            onClick: () => onPanelToggle?.('vpn')
          },
          { label: 'Pemblokir', value: settings?.adBlockEnabled !== false ? 'ON' : 'OFF', color: settings?.adBlockEnabled !== false ? 'var(--red-main)' : 'var(--text-dim)', onClick: null },
        ].map(s => (
          <div
            key={s.label}
            className={`nt-stat-card ${s.onClick ? 'nt-stat-clickable' : ''}`}
            onClick={s.onClick}
          >
            <div className="nt-stat-val" style={{ color: s.color }}>{s.value}</div>
            <div className="nt-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Multi-Container & Kukis Card */}
      <div style={{
        maxWidth: '720px',
        width: '100%',
        margin: '0 auto 20px',
        background: 'var(--bg-15)',
        border: '1px solid var(--border-md)',
        borderRadius: 'var(--r-lg)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🛡️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-white)' }}>
                Multi-Halaman & Isolasi Kukis (Multi-Accounting)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Buka tab dengan cookie jar terpisah & IP virtual berbeda (misal Akun Proton #1, #2, #3)
              </div>
            </div>
          </div>
          <button
            onClick={() => onPanelToggle?.('containers')}
            style={{
              background: 'var(--bg-25)',
              border: '1px solid var(--border)',
              color: 'var(--text-bright)',
              borderRadius: 'var(--r-sm)',
              padding: '6px 12px',
              fontSize: '11.5px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            ⚙️ Kelola Container
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          <button
            onClick={() => onNavigate('kuro://proton')}
            style={{
              background: 'var(--bg-20)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: 'var(--r-md)',
              padding: '10px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--green)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4caf50' }} />
              Akun Proton #1 (Alice)
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              🇨🇭 IP: 185.70.41.12 • Zurich
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              ✓ Sesi login aktif & PGP key
            </div>
          </button>

          <button
            onClick={() => onNavigate('kuro://proton')}
            style={{
              background: 'var(--bg-20)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              borderRadius: 'var(--r-md)',
              padding: '10px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--blue)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2196f3' }} />
              Akun Proton #2 (Bob)
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              🇳🇱 IP: 194.126.177.8 • Amsterdam
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              ✓ Sesi terpisah independen
            </div>
          </button>

          <button
            onClick={() => onNavigate('kuro://proton')}
            style={{
              background: 'var(--bg-20)',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              borderRadius: 'var(--r-md)',
              padding: '10px 12px',
              textAlign: 'left',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--orange)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff9800' }} />
              Akun Proton #3 (Daftar Baru)
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              🇨🇭 IP: 185.70.40.88 • Geneva
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              ✨ Kukis bersih siap buat akun
            </div>
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="nt-quick-section">
        <div className="nt-quick-header">
          <span className="nt-quick-title">Akses Cepat</span>
          <button className="nt-quick-add" onClick={() => setShowModal(true)} title="Tambah tautan">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tambah
          </button>
        </div>

        <div className="nt-quick-grid">
          {allLinks.map((link, i) => (
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
          { img: '/assets/maskot-ai.png', title: 'Kuro AI', desc: 'Asisten AI gratis multi-model', action: () => onPanelToggle?.('ai') },
          { img: '/assets/maskot-database.png', title: 'Database', desc: 'Profil & akun tak terbatas', action: () => onPanelToggle?.('profile') },
          { img: '/assets/maskot-media.png', title: 'Media', desc: 'Streaming tanpa iklan', action: () => onNavigate('https://youtube.com') },
          { img: '/assets/maskot-terminal.png', title: 'Terminal', desc: 'Terminal terintegrasi (F12)', action: () => onOpenTerminal?.() },
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
          Tekan <kbd>F12</kbd> terminal · <kbd>Ctrl+T</kbd> tab baru · <kbd>Ctrl+Shift+N</kbd> tab onion · <kbd>Ctrl+W</kbd> tutup tab
        </span>
      </div>

      {/* ── Modal Tambah Akses Cepat ── */}
      {showModal && (
        <div className="nt-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="nt-modal">
            <div className="nt-modal-header">
              <span className="nt-modal-title">Tambah Penanda ke Akses Cepat</span>
              <button className="nt-modal-close" onClick={() => setShowModal(false)}>
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            </div>

            <div className="nt-modal-body">
              <div className="nt-modal-field">
                <label className="nt-modal-label">Alamat</label>
                <input
                  ref={urlInputRef}
                  className="nt-modal-input"
                  placeholder="https://contoh.com"
                  value={newLink.url}
                  onChange={e => setNewLink(l => ({ ...l, url: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addCustomLink()}
                />
              </div>
              <div className="nt-modal-field">
                <label className="nt-modal-label">Judul</label>
                <input
                  className="nt-modal-input"
                  placeholder="Nama situs (opsional)"
                  value={newLink.label}
                  onChange={e => setNewLink(l => ({ ...l, label: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addCustomLink()}
                />
              </div>
            </div>

            {/* Situs populer sebagai shortcut */}
            <div className="nt-modal-popular">
              <div className="nt-modal-pop-title">Yang Sering Dikunjungi</div>
              <div className="nt-modal-pop-grid">
                {QUICK.slice(0, 10).map((s, i) => (
                  <button
                    key={i}
                    className="nt-modal-pop-item"
                    onClick={() => setNewLink({ label: s.label, url: s.url })}
                  >
                    <img src={s.favicon} alt={s.label} width={18} height={18}
                      onError={e => e.target.style.display = 'none'} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="nt-modal-footer">
              <button className="nt-modal-btn-cancel" onClick={() => setShowModal(false)}>Batal</button>
              <button className="nt-modal-btn-save" onClick={addCustomLink} disabled={!newLink.url.trim()}>
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
