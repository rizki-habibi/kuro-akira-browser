import React, { useRef, useEffect, useState } from 'react'
import './BrowserView.css'

// Tor2Web gateways sebagai fallback ketika Tor tidak aktif
const TOR2WEB = [
  'https://onion.ws',
  'https://onion.pet',
  'https://onion.ly',
  'https://onion.moe',
]

function convertOnionUrl(onionUrl, gateway = TOR2WEB[0]) {
  try {
    const u = new URL(onionUrl)
    return `${gateway}/${u.hostname}${u.pathname}${u.search}`
  } catch { return null }
}

export default function BrowserView({
  tabId, url, isActive, action, actionTs,
  onTitleChange, onFaviconChange, onLoadStart, onLoadEnd,
  onNavigationState, onNewTabRequested
}) {
  const viewRef = useRef(null)
  const [torStatus, setTorStatus] = useState(null) // null | 'checking' | 'running' | 'offline'
  const [onionFallback, setOnionFallback] = useState(null) // { url, gateway, alternatives }
  const [showOnionBanner, setShowOnionBanner] = useState(false)
  const [gwIndex, setGwIndex] = useState(0)

  const isOnion = url?.includes('.onion')

  // Cek apakah Tor berjalan ketika URL adalah .onion
  useEffect(() => {
    if (!isOnion || !isActive) return
    setTorStatus('checking')
    setOnionFallback(null)
    setShowOnionBanner(false)

    window.kuroAPI?.tor?.check().then(res => {
      if (res.running) {
        setTorStatus('running')
      } else {
        setTorStatus('offline')
        // Buat Tor2Web fallback
        const gw = TOR2WEB[gwIndex]
        const converted = convertOnionUrl(url, gw)
        if (converted) {
          setOnionFallback({ url: converted, gateway: gw, alternatives: TOR2WEB.slice(1) })
          setShowOnionBanner(true)
        }
      }
    }).catch(() => {
      setTorStatus('offline')
      const converted = convertOnionUrl(url, TOR2WEB[gwIndex])
      if (converted) {
        setOnionFallback({ url: converted, gateway: TOR2WEB[gwIndex], alternatives: TOR2WEB.slice(1) })
        setShowOnionBanner(true)
      }
    })
  }, [url, isOnion, isActive])

  useEffect(() => {
    const wv = viewRef.current
    if (!wv) return
    const onStart = () => onLoadStart()
    const onStop = () => {
      onLoadEnd(wv.getURL())
      onNavigationState(wv.canGoBack(), wv.canGoForward())
    }
    const onTitle = e => onTitleChange(e.title)
    const onFav = e => { if (e.favicons?.[0]) onFaviconChange(e.favicons[0]) }
    const onNew = e => { e.preventDefault(); if (e.url) onNewTabRequested(e.url) }
    const onFail = (e) => {
      // ERR_SOCKS_CONNECTION_FAILED = Tor tidak bisa konek
      if (e.errorCode === -105 || e.errorCode === -106 || e.errorCode === -200 ||
        String(e.errorDescription).includes('SOCKS') || String(e.errorDescription).includes('ERR_NAME_NOT_RESOLVED')) {
        if (isOnion) setShowOnionBanner(true)
      }
    }
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('page-title-updated', onTitle)
    wv.addEventListener('page-favicon-updated', onFav)
    wv.addEventListener('new-window', onNew)
    wv.addEventListener('did-fail-load', onFail)
    return () => {
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
      wv.removeEventListener('page-title-updated', onTitle)
      wv.removeEventListener('page-favicon-updated', onFav)
      wv.removeEventListener('new-window', onNew)
      wv.removeEventListener('did-fail-load', onFail)
    }
  }, [isOnion])

  // Expose active webview ref globally untuk TerminalPanel
  useEffect(() => {
    if (isActive && viewRef.current) {
      window.__activeWebview = viewRef.current
    }
    return () => { if (isActive) window.__activeWebview = null }
  }, [isActive])

  useEffect(() => {
    const wv = viewRef.current
    if (!wv || !action) return
    try {
      if (action === 'back' && wv.canGoBack()) wv.goBack()
      else if (action === 'forward' && wv.canGoForward()) wv.goForward()
      else if (action === 'reload') wv.reload()
      else if (action === 'stop') wv.stop()
    } catch (_) { }
  }, [action, actionTs])

  // URL yang akan diload: jika .onion + Tor offline = pakai Tor2Web
  const effectiveUrl = (isOnion && torStatus === 'offline' && onionFallback)
    ? onionFallback.url
    : url

  return (
    <div className={`bview-container ${isActive ? 'active' : ''}`}>

      {/* Banner Tor Status */}
      {isOnion && showOnionBanner && (
        <div className="bview-tor-banner">
          {torStatus === 'running' ? (
            <div className="bview-tor-ok">
              <span>🧅 Terhubung via Tor</span>
              <button onClick={() => setShowOnionBanner(false)}>×</button>
            </div>
          ) : (
            <div className="bview-tor-warn">
              <div className="bview-tor-warn-top">
                <span>⚠️ Tor tidak aktif — membuka via <strong>Tor2Web</strong> ({onionFallback?.gateway})</span>
                <button onClick={() => setShowOnionBanner(false)}>×</button>
              </div>
              <div className="bview-tor-warn-body">
                <span className="bview-tor-note">Tor2Web kurang anonim. Untuk privasi penuh, install Tor Browser:</span>
                <button
                  className="bview-tor-dl"
                  onClick={() => window.kuroAPI?.shell.openExternal('https://www.torproject.org/download/')}
                >
                  ⬇ Download Tor Browser
                </button>
                <div className="bview-tor-alts">
                  {TOR2WEB.map((gw, i) => (
                    <button
                      key={i}
                      className={`bview-tor-alt ${gwIndex === i ? 'active' : ''}`}
                      onClick={() => {
                        setGwIndex(i)
                        const newUrl = convertOnionUrl(url, gw)
                        if (newUrl) setOnionFallback(f => ({ ...f, url: newUrl, gateway: gw }))
                      }}
                    >
                      {gw.replace('https://', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {torStatus === 'checking' && isOnion && (
        <div className="bview-tor-checking">
          <span className="bview-spin" /> Memeriksa Tor...
        </div>
      )}

      <webview
        ref={viewRef}
        src={effectiveUrl}
        className="bview-wv"
        allowpopups="false"
        nodeintegration="false"
        contextIsolation="true"
        partition="persist:main"
        webpreferences="contextIsolation=yes,nodeIntegration=no,javascript=yes"
      />
    </div>
  )
}
