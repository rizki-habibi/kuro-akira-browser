import React, { useState, useEffect } from 'react'
import './UpdateNotification.css'

export default function UpdateNotification() {
  const [update, setUpdate] = useState(null)    // { version, releaseNotes }
  const [progress, setProgress] = useState(null)    // 0-100 or null
  const [downloaded, setDl] = useState(false)
  const [checking, setChecking] = useState(false)
  const [show, setShow] = useState(false)
  const [noUpdate, setNoUpdate] = useState(false)
  const [error, setError] = useState('')
  const [currentVer, setCurrentVer] = useState('')

  useEffect(() => {
    if (!window.kuroAPI) return

    // Ambil versi saat ini
    window.kuroAPI.updater.getVersion?.().then(v => setCurrentVer(v || '')).catch(() => { })

    const onAvailable = (info) => { setUpdate(info); setShow(true); setNoUpdate(false); setError('') }
    const onProgress = (p) => { setProgress(Math.round(p.percent || 0)) }
    const onDownloaded = () => { setDl(true); setProgress(100) }
    const onNotAvail = () => { setChecking(false); setNoUpdate(true); setTimeout(() => setNoUpdate(false), 4000) }
    const onErr = (msg) => { setChecking(false); setError(String(msg)); setTimeout(() => setError(''), 6000) }

    window.kuroAPI.on('updater:available', onAvailable)
    window.kuroAPI.on('updater:progress', onProgress)
    window.kuroAPI.on('updater:downloaded', onDownloaded)
    window.kuroAPI.on('updater:not-available', onNotAvail)
    window.kuroAPI.on('updater:error', onErr)

    return () => {
      window.kuroAPI.off('updater:available', onAvailable)
      window.kuroAPI.off('updater:progress', onProgress)
      window.kuroAPI.off('updater:downloaded', onDownloaded)
      window.kuroAPI.off('updater:not-available', onNotAvail)
      window.kuroAPI.off('updater:error', onErr)
    }
  }, [])

  const handleDownload = () => { window.kuroAPI?.updater.download(); setProgress(0) }
  const handleInstall = () => window.kuroAPI?.updater.install()
  const handleCheck = async () => {
    setChecking(true); setError(''); setNoUpdate(false)
    await window.kuroAPI?.updater.check()
  }

  // Update tersedia → banner merah-hijau
  if (show && update) return (
    <div className="update-notif">
      <div className="update-notif-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        <span>Pembaruan Tersedia</span>
        <button className="update-close" onClick={() => setShow(false)}>×</button>
      </div>
      <div className="update-notif-body">
        <div className="update-ver">
          {currentVer && <span className="update-cur">{currentVer}</span>}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          <span className="update-new">{update.version}</span>
        </div>

        {update.releaseNotes && (
          <div className="update-notes">
            {String(update.releaseNotes).replace(/<[^>]+>/g, '').substring(0, 200)}...
          </div>
        )}

        {progress !== null && !downloaded && (
          <div className="update-progress">
            <div className="update-progress-bar">
              <div className="update-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span>{progress}%</span>
          </div>
        )}

        <div className="update-btns">
          {progress === null && !downloaded && (
            <button className="update-btn primary" onClick={handleDownload}>⬇ Unduh Sekarang</button>
          )}
          {progress !== null && !downloaded && (
            <button className="update-btn primary" disabled>Mengunduh {progress}%...</button>
          )}
          {downloaded && (
            <button className="update-btn primary" onClick={handleInstall}>✓ Pasang &amp; Restart</button>
          )}
          <button className="update-btn secondary" onClick={() => setShow(false)}>Nanti</button>
        </div>
      </div>
    </div>
  )

  // "Sudah terbaru" toast
  if (noUpdate) return (
    <div className="update-notif update-notif-ok">
      <div className="update-notif-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Sudah versi terbaru {currentVer && `(v${currentVer})`}</span>
        <button className="update-close" onClick={() => setNoUpdate(false)}>×</button>
      </div>
    </div>
  )

  // Error toast
  if (error) return (
    <div className="update-notif update-notif-err">
      <div className="update-notif-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Update error: {error.substring(0, 60)}</span>
        <button className="update-close" onClick={() => setError('')}>×</button>
      </div>
    </div>
  )

  // Checking toast
  if (checking) return (
    <div className="update-notif update-notif-checking">
      <div className="update-notif-header">
        <span className="update-spin" />
        <span>Memeriksa pembaruan...</span>
      </div>
    </div>
  )

  return null
}
