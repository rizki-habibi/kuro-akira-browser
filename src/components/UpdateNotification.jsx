import React, { useState, useEffect } from 'react'
import './UpdateNotification.css'

export default function UpdateNotification() {
  const [update, setUpdate]     = useState(null)   // { version, releaseNotes }
  const [progress, setProgress] = useState(null)   // 0-100
  const [downloaded, setDl]     = useState(false)
  const [checking, setChecking] = useState(false)
  const [show, setShow]         = useState(false)

  useEffect(() => {
    if (!window.kuroAPI) return

    window.kuroAPI.on('updater:available', (info) => {
      setUpdate(info)
      setShow(true)
    })
    window.kuroAPI.on('updater:progress', (p) => {
      setProgress(Math.round(p.percent || 0))
    })
    window.kuroAPI.on('updater:downloaded', (info) => {
      setDl(true)
      setProgress(100)
    })
    window.kuroAPI.on('updater:not-available', () => {
      setChecking(false)
    })
  }, [])

  const handleDownload = () => {
    window.kuroAPI?.updater.download()
    setProgress(0)
  }

  const handleInstall = () => {
    window.kuroAPI?.updater.install()
  }

  const handleCheck = async () => {
    setChecking(true)
    await window.kuroAPI?.updater.check()
    setTimeout(() => setChecking(false), 5000)
  }

  if (!show && !update) return null

  return (
    <div className="update-notif">
      <div className="update-notif-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        <span>Pembaruan Tersedia</span>
        <button className="update-close" onClick={() => setShow(false)}>
          <svg width="9" height="9" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/>
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </button>
      </div>

      <div className="update-notif-body">
        <div className="update-ver">Kuro Akira {update?.version || 'Versi Baru'}</div>
        {update?.releaseNotes && (
          <div className="update-notes">{String(update.releaseNotes).substring(0, 150)}...</div>
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
          {!progress && !downloaded && (
            <button className="update-btn primary" onClick={handleDownload}>
              Unduh Sekarang
            </button>
          )}
          {downloaded && (
            <button className="update-btn primary" onClick={handleInstall}>
              Pasang & Restart
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
