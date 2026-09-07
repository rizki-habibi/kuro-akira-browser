import React, { useState, useEffect } from 'react'
import './TitleBar.css'

// Icon SVG inline (tidak pakai emoji)
const IconShield = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const IconWifi = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="20" r="1" /><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
  </svg>
)
const IconBlock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
)

export default function TitleBar({ onSettingsClick, blockedCount, privacyLevel, useTor, activeProfile }) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (window.kuroAPI) setIsMaximized(window.kuroAPI.window.isMaximized())
  }, [])

  const handleMaximize = () => {
    window.kuroAPI?.window.maximize()
    setIsMaximized(v => !v)
  }

  const privacyLabel = { standard: 'STD', high: 'TINGGI', paranoid: 'MAKS' }[privacyLevel] || 'TINGGI'
  const privacyColor = privacyLevel === 'paranoid' ? 'var(--red-bright)' : privacyLevel === 'high' ? 'var(--silver)' : 'var(--green)'

  return (
    <div className="titlebar" style={{ WebkitAppRegion: 'drag' }}>
      {/* Logo */}
      <div className="titlebar-brand">
        <div className="titlebar-logo">
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#e53535" strokeWidth="6" />
            <polygon points="50,20 75,35 75,65 50,80 25,65 25,35" fill="none" stroke="#9e9e9e" strokeWidth="3" />
            <circle cx="50" cy="50" r="12" fill="#e53535" />
          </svg>
        </div>
        <div className="titlebar-names">
          <span className="titlebar-title">Kuro Akira</span>
          <span className="titlebar-sub">Browser Pribadi</span>
        </div>
      </div>

      {/* Profil aktif */}
      {activeProfile && (
        <div className="titlebar-profile">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          <span>{activeProfile}</span>
        </div>
      )}

      {/* Badge status */}
      <div className="titlebar-badges" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className="badge-item" style={{ color: privacyColor }} title={`Mode privasi: ${privacyLevel}`}>
          <IconShield />
          <span>{privacyLabel}</span>
        </div>

        {useTor && (
          <div className="badge-item tor" title="Tor aktif">
            <IconWifi />
            <span>TOR</span>
          </div>
        )}

        <div className="badge-item blocked" title="Iklan & pelacak diblokir">
          <IconBlock />
          <span>{blockedCount.toLocaleString('id')} diblokir</span>
        </div>

        <button className="tb-btn" onClick={onSettingsClick} title="Pengaturan" style={{ WebkitAppRegion: 'no-drag' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Kontrol window */}
      <div className="titlebar-controls" style={{ WebkitAppRegion: 'no-drag' }}>
        <button className="win-btn min" onClick={() => window.kuroAPI?.window.minimize()} title="Perkecil">
          <svg width="10" height="2" viewBox="0 0 10 2"><rect width="10" height="2" fill="currentColor" /></svg>
        </button>
        <button className="win-btn max" onClick={handleMaximize} title={isMaximized ? 'Pulihkan' : 'Perbesar'}>
          {isMaximized
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="2" y="0" width="8" height="8" /><rect x="0" y="2" width="8" height="8" fill="var(--bg-20)" />
            </svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="0" y="0" width="10" height="10" />
            </svg>
          }
        </button>
        <button className="win-btn close" onClick={() => window.kuroAPI?.window.close()} title="Tutup">
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" /><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
    </div>
  )
}
