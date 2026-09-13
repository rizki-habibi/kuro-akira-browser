import React, { useState, useEffect } from 'react'
import './TitleBar.css'

export default function TitleBar({
  onSettingsClick, blockedCount, privacyLevel,
  useTor, activeProfile, vpnEnabled, onNewWindow
}) {
  const [isMax, setIsMax] = useState(false)

  useEffect(() => {
    if (window.kuroAPI) setIsMax(window.kuroAPI.window.isMaximized())
  }, [])

  const handleMax = () => {
    window.kuroAPI?.window.maximize()
    setIsMax(v => !v)
  }

  const privMap = {
    standard: { label: 'STD', color: 'var(--green)' },
    high: { label: 'TINGGI', color: 'var(--silver)' },
    paranoid: { label: 'MAKS', color: 'var(--red-bright)' },
  }
  const pv = privMap[privacyLevel] || privMap.high

  return (
    <div className="titlebar" style={{ WebkitAppRegion: 'drag' }}>

      {/* Logo + nama */}
      <div className="tb-brand">
        <img
          src="/assets/maskot-utama.png"
          alt="Kuro Akira"
          className="tb-logo"
          draggable={false}
        />
        <div className="tb-names">
          <span className="tb-title">Kuro Akira</span>
          <span className="tb-sub">Browser Pribadi</span>
        </div>
      </div>

      {/* Profil aktif */}
      {activeProfile && (
        <div className="tb-profile">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>{activeProfile}</span>
        </div>
      )}

      {/* Badges */}
      <div className="tb-badges" style={{ WebkitAppRegion: 'no-drag' }}>
        {/* Privacy */}
        <div className="tb-badge" style={{ color: pv.color, borderColor: pv.color + '44' }} title={`Mode privasi: ${privacyLevel}`}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          {pv.label}
        </div>

        {/* Tor */}
        {useTor && (
          <div className="tb-badge tor" title="Tor aktif">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            TOR
          </div>
        )}

        {/* VPN */}
        {vpnEnabled && !useTor && (
          <div className="tb-badge vpn" title="VPN aktif">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            VPN
          </div>
        )}

        {/* Blocked count */}
        <div className="tb-badge blocked" title="Iklan & pelacak diblokir">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          {blockedCount.toLocaleString('id')} diblokir
        </div>

        {/* Jendela baru */}
        <button
          className="tb-icon-btn"
          onClick={onNewWindow}
          title="Buka jendela baru (Ctrl+N)"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="13" height="13" rx="1" />
            <path d="M8 8h13v13H8z" />
          </svg>
        </button>

        {/* Settings */}
        <button
          className="tb-icon-btn"
          onClick={onSettingsClick}
          title="Pengaturan"
          style={{ WebkitAppRegion: 'no-drag' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Window controls */}
      <div className="tb-winctrl" style={{ WebkitAppRegion: 'no-drag' }}>
        <button className="wc-btn min" onClick={() => window.kuroAPI?.window.minimize()} title="Perkecil">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor" /></svg>
        </button>
        <button className="wc-btn max" onClick={handleMax} title={isMax ? 'Pulihkan' : 'Perbesar'}>
          {isMax
            ? <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="2" y="0" width="8" height="8" />
              <rect x="0" y="2" width="8" height="8" fill="var(--bg-20)" />
            </svg>
            : <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="0" y="0" width="10" height="10" />
            </svg>
          }
        </button>
        <button className="wc-btn close" onClick={() => window.kuroAPI?.window.close()} title="Tutup">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  )
}
