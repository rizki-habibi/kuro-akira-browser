import React from 'react'
import './StatusBar.css'

export default function StatusBar({ url, isLoading, privacyLevel, useTor, adBlockEnabled, blockedCount }) {
  const isHttps = url?.startsWith('https://')
  const isOnion = url?.includes('.onion')
  return (
    <div className="statusbar">
      <div className="sb-left">
        {isLoading && <span className="sb-dot" />}
        <span className="sb-url">{isLoading ? 'Memuat...' : url || ''}</span>
      </div>
      <div className="sb-right">
        {isOnion && <span className="sb-badge tor">Onion</span>}
        {isHttps && !isOnion && <span className="sb-badge secure">Aman</span>}
        {useTor && <span className="sb-badge tor">Tor Aktif</span>}
        {adBlockEnabled && <span className="sb-badge block">{blockedCount.toLocaleString('id')} diblokir</span>}
        <span className="sb-badge priv" style={{ color: privacyLevel === 'paranoid' ? 'var(--red-main)' : privacyLevel === 'high' ? 'var(--silver)' : 'var(--green)' }}>
          {privacyLevel === 'paranoid' ? 'Maks' : privacyLevel === 'high' ? 'Tinggi' : 'Standar'}
        </span>
        <span className="sb-ver">Kuro Akira v2.0</span>
      </div>
    </div>
  )
}
