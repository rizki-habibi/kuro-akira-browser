import React, { useState, useEffect, useRef } from 'react'
import './TorPanel.css'

export default function TorPanel({ onClose, settings, onChange }) {
  const [status, setStatus]       = useState(null)   // { running, embedded, pid, exePath }
  const [loading, setLoading]     = useState(false)
  const [progress, setProgress]   = useState(0)
  const [bootstrapped, setBoot]   = useState(false)
  const [logs, setLogs]           = useState([])
  const [showLogs, setShowLogs]   = useState(false)
  const [customPath, setCustomPath] = useState('')
  const [msg, setMsg]             = useState('')
  const logRef = useRef(null)

  const flash = (m, dur = 3000) => { setMsg(m); setTimeout(() => setMsg(''), dur) }

  const loadStatus = async () => {
    if (!window.kuroAPI) return
    const s = await window.kuroAPI.tor.check()
    setStatus(s)
    setBoot(s.running)
    if (!customPath && s.exePath) setCustomPath(s.exePath)
  }

  useEffect(() => {
    loadStatus()
    // Listen to Tor events
    window.kuroAPI?.on('tor:status', (s) => {
      setLoading(false)
      setBoot(s.running || false)
      setStatus(prev => ({ ...prev, running: s.running, embedded: s.running }))
      if (s.error) flash('❌ ' + s.error)
      if (s.running) { flash('✅ Tor terhubung!'); setProgress(100) }
    })
    window.kuroAPI?.on('tor:progress', (p) => {
      setProgress(p.percent || 0)
    })
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [logs])

  const handleStart = async () => {
    setLoading(true)
    setProgress(0)
    setBoot(false)
    flash('Memulai Tor...')
    onChange?.('useTor', true)
    const res = await window.kuroAPI.tor.start()
    if (!res.ok) {
      setLoading(false)
      flash('❌ ' + (res.error || 'Gagal memulai Tor'))
    } else if (res.already) {
      setLoading(false)
      flash('✅ Tor sudah berjalan')
      setBoot(true)
      setProgress(100)
    }
    loadStatus()
  }

  const handleStop = async () => {
    setLoading(true)
    onChange?.('useTor', false)
    await window.kuroAPI.tor.stop()
    setLoading(false)
    setBoot(false)
    setProgress(0)
    flash('Tor dihentikan')
    loadStatus()
  }

  const loadLogs = async () => {
    const l = await window.kuroAPI.tor.log()
    setLogs(l || [])
    setShowLogs(true)
  }

  const savePath = async () => {
    if (!customPath) return
    const res = await window.kuroAPI.tor.setPath(customPath)
    if (res.ok) flash('✅ Path disimpan')
    else flash('❌ ' + res.error)
  }

  const isRunning = bootstrapped || status?.running

  return (
    <div className="tor-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <span style={{ fontSize: '16px' }}>🧅</span>
          Tor Network
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>

      {/* Status Card */}
      <div className={`tor-status-card ${isRunning ? 'running' : 'stopped'}`}>
        <div className="tor-status-dot" />
        <div className="tor-status-info">
          <div className="tor-status-title">
            {loading ? 'Menghubungkan...' : isRunning ? 'Tor Aktif' : 'Tor Tidak Aktif'}
          </div>
          <div className="tor-status-sub">
            {isRunning
              ? `SOCKS5 ${status?.host || '127.0.0.1'}:${status?.port || 9050}${status?.embedded ? ' • Embedded' : ' • Eksternal'}`
              : 'Klik tombol di bawah untuk memulai Tor'}
          </div>
        </div>
        {isRunning && <span className="tor-badge-running">AKTIF</span>}
      </div>

      {/* Progress saat bootstrapping */}
      {loading && progress < 100 && (
        <div className="tor-progress-wrap">
          <div className="tor-progress-bar">
            <div className="tor-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      )}

      {msg && <div className={`tor-msg ${msg.startsWith('❌') ? 'err' : msg.startsWith('✅') ? 'ok' : ''}`}>{msg}</div>}

      {/* Tombol Start/Stop */}
      <div className="tor-actions">
        {!isRunning ? (
          <button className="tor-btn start" onClick={handleStart} disabled={loading}>
            {loading ? <><span className="tor-spin" /> Menghubungkan...</> : '▶ Aktifkan Tor'}
          </button>
        ) : (
          <button className="tor-btn stop" onClick={handleStop} disabled={loading}>
            ■ Matikan Tor
          </button>
        )}
        <button className="tor-btn secondary" onClick={loadLogs}>
          📋 Log
        </button>
      </div>

      {/* Cara Kerja */}
      <div className="tor-info-box">
        <div className="tor-info-title">Cara Kerja</div>
        <div className="tor-info-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Tor sudah tersedia dari Tor Browser yang kamu install</span>
        </div>
        <div className="tor-info-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Klik "Aktifkan Tor" — browser start tor.exe otomatis</span>
        </div>
        <div className="tor-info-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Semua trafik diarahkan lewat jaringan Tor</span>
        </div>
        <div className="tor-info-row">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Situs .onion bisa dibuka langsung tanpa Tor2Web</span>
        </div>
      </div>

      {/* Path Config */}
      <div className="tor-path-section">
        <div className="tor-path-title">Lokasi tor.exe</div>
        <div className="tor-path-row">
          <input
            className="tor-path-input"
            placeholder="Path ke tor.exe..."
            value={customPath}
            onChange={e => setCustomPath(e.target.value)}
          />
          <button className="tor-path-save" onClick={savePath}>Simpan</button>
        </div>
        {status?.exePath && (
          <div className="tor-path-detected">
            ✓ Terdeteksi: {status.exePath.split('\\').pop()}
          </div>
        )}
      </div>

      {/* Download Tor jika belum ada */}
      {status && !status.exePath && (
        <div className="tor-no-exe">
          <p>tor.exe tidak ditemukan. Install Tor Browser dulu:</p>
          <button
            className="tor-btn-dl"
            onClick={() => window.kuroAPI?.shell.openExternal('https://www.torproject.org/download/')}
          >
            ⬇ Download Tor Browser
          </button>
        </div>
      )}

      {/* Log Panel */}
      {showLogs && (
        <div className="tor-log-panel">
          <div className="tor-log-header">
            <span>Log Tor</span>
            <button onClick={() => setShowLogs(false)}>×</button>
          </div>
          <div className="tor-log-body" ref={logRef}>
            {logs.length === 0
              ? <span className="tor-log-empty">Tidak ada log</span>
              : logs.map((l, i) => (
                  <div key={i} className={`tor-log-line ${l.includes('[err]') ? 'err' : l.includes('100%') ? 'ok' : ''}`}>
                    {l}
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}
