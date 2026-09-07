import React, { useState, useEffect } from 'react'
import './UpdateNotification.css'

export default function UpdateNotification() {
  const [update, setUpdate] = useState(null)
  const [progress, setProgress] = useState(null)
  const [downloaded, setDl] = useState(false)
  const [checking, setChecking] = useState(false)
  const [show, setShow] = useState(false)
  const [noUpdate, setNoUpdate] = useState(false) // "sudah versi terbaru"

  useEffect(() => {
    if (!window.kuroAPI) return

    const onAvailable = (info) => { setUpdate(info); setShow(true); setNoUpdate(false) }
    const onProgress = (p) => { setProgress(Math.round(p.percent || 0)) }
    const onDownloaded = () => { setDl(true); setProgress(100) }
    const onNotAvail = () => { setChecking(false); setNoUpdate(true); setTimeout(() => setNoUpdate(false), 4000) }
    const onError = (msg) => { setChecking(false); console.warn('[updater]', msg) }

    window.kuroAPI.on('updater:available', onAvailable)
    window.kuroAPI.on('updater:progress', onProgress)
    window.kuroAPI.on('updater:downloaded', onDownloaded)
    window.kuroAPI.on('updater:not-available', onNotAvail)
    window.kuroAPI.on('updater:error', onError)

    // Cleanup — preload exposes kuroAPI.off
    return () => {
      window.kuroAPI.off('updater:available', onAvailable)
      window.kuroAPI.off('updater:progress', onProgress)
      window.kuroAPI.off('updater:downloaded', onDownloaded)
      window.kuroAPI.off('updater:not-available', onNotAvail)
      window.kuroAPI.off('updater:error', onError)
    }
  }, [])

  const handleDownload = () => {
    window.kuroAPI?.updater.download()
    setProgress(0)
  }

  const handleInstall = () => window.kuroAPI?.updater.install()

  const handleCheck = async () => {
    setChecking(true)
    setNoUpdate(false)
    await window.kuroAPI?.updater.check()
  }

  // Jika ada update pending, tampilkan banner
  if (show && update) {
    return (
      <div className="update-notif">
        <div className="update-notif-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>Pembaruan Tersedia — Kuro Akira {update.version}</span>
          <button className="update-close" onClick={() => setShow(false)}>
            <svg width="9" height="9" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <div className="update-notif-body">
          {update?.releaseNotes && (
            <div className="update-notes">{String(update.releaseNotes).substring(0, 200)}...</div>
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
              <button className="update-btn primary" onClick={handleDownload}>
                ⬇ Unduh Sekarang
              </button>
            )}
            {downloaded && (
              <button className="update-btn primary" onClick={handleInstall}>
                ✓ Pasang &amp; Restart
              </button>
            )}
            <button className="update-btn secondary" onClick={() => setShow(false)}>
              Nanti
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Toast "sudah terbaru"
  if (noUpdate) {
    return (
      <div className="update-notif update-notif-ok">
        <div className="update-notif-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Kuro Akira sudah versi terbaru!</span>
          <button className="update-close" onClick={() => setNoUpdate(false)}>
            <svg width="9" height="9" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return null
}

// Export handleCheck so SettingsPanel can trigger it
export { }
