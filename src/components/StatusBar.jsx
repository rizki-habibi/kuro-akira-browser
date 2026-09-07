import React from 'react'
import './StatusBar.css'

export default function StatusBar({ url, isLoading, privacyLevel, useTor, vpnEnabled, adBlockEnabled, blockedCount, memInfo }) {
  const isHttps = url?.startsWith('https://')
  const isOnion = url?.includes('.onion')
  const isKuro = url?.startsWith('kuro://')

  const privText = { standard: 'Standar', high: 'Tinggi', paranoid: 'Maksimal' }[privacyLevel] || 'Tinggi'
  const privColor = privacyLevel === 'paranoid' ? 'var(--red-main)' : privacyLevel === 'high' ? 'var(--silver)' : 'var(--green)'

  // Memory color: green < 300 MB, yellow < 600 MB, red >= 600 MB
  const memColor = !memInfo ? null
    : memInfo.app < 300 ? 'var(--green)'
      : memInfo.app < 600 ? 'var(--yellow)'
        : 'var(--red-main)'

  return (
    <div className="statusbar">
      <div className="sb-left">
        {isLoading && <span className="sb-dot" />}
        <span className="sb-url">
          {isLoading
            ? 'Memuat halaman...'
            : isKuro
              ? `Kuro Akira — ${url.replace('kuro://', '')}`
              : url || ''}
        </span>
      </div>

      <div className="sb-right">
        {isOnion && <span className="sb-pill" style={{ color: '#4caf50', borderColor: 'rgba(76,175,80,.3)' }}>🧅 Onion</span>}
        {isHttps && !isOnion && <span className="sb-pill" style={{ color: 'var(--green)', borderColor: 'rgba(76,175,80,.2)' }}>Aman</span>}
        {useTor && <span className="sb-pill" style={{ color: '#4caf50', borderColor: 'rgba(76,175,80,.3)' }}>Tor</span>}
        {vpnEnabled && !useTor && <span className="sb-pill" style={{ color: '#2196f3', borderColor: 'rgba(33,150,243,.3)' }}>VPN</span>}
        {adBlockEnabled && (
          <span className="sb-pill" style={{ color: 'var(--red-main)', borderColor: 'rgba(229,53,53,.2)' }}>
            {blockedCount.toLocaleString('id')} diblokir
          </span>
        )}
        {memInfo && (
          <span className="sb-pill" style={{ color: memColor, borderColor: memColor + '44' }} title={`RAM total: ${memInfo.total} MB | Bebas: ${memInfo.free} MB | Heap: ${memInfo.heap} MB`}>
            {memInfo.app} MB
          </span>
        )}
        <span className="sb-pill" style={{ color: privColor, borderColor: privColor + '33' }}>{privText}</span>
        <span className="sb-ver">Kuro Akira v2.4</span>
      </div>
    </div>
  )
}
