import React, { useRef, useEffect, useState, useCallback } from 'react'
import './BrowserView.css'

const TOR2WEB = ['onion.ws', 'onion.pet', 'onion.ly', 'onion.moe']

// Cek apakah URL sudah tor2web (jangan konversi lagi)
const isT2W = url => TOR2WEB.some(g => String(url).includes('/' + g + '/') || String(url).startsWith('https://' + g))

// Cek apakah URL adalah .onion asli (bukan tor2web)
const isRealOnion = url => !isT2W(url) && /\.onion(\/|$|\?)/.test(String(url))

// Konversi satu kali saja
function toTor2Web(onionUrl, gwHost) {
  try {
    const u = new URL(onionUrl)
    return `https://${gwHost}/${u.hostname}${u.pathname}${u.search}`
  } catch { return null }
}

export default function BrowserView({
  tabId, url, isActive, action, actionTs,
  onTitleChange, onFaviconChange, onLoadStart, onLoadEnd,
  onNavigationState, onNewTabRequested
}) {
  const viewRef = useRef(null)
  const origOnionRef = useRef(null)   // simpan URL .onion asli agar tidak looping
  const [torUp, setTorUp] = useState(false)
  const [checked, setChecked] = useState(false)
  const [gwIdx, setGwIdx] = useState(0)
  const [loadUrl, setLoadUrl] = useState(url)
  const [banner, setBanner] = useState(false)

  // ── Tentukan URL efektif sekali saja per URL baru ─────
  useEffect(() => {
    if (!isActive) { setLoadUrl(url); return }

    const onion = isRealOnion(url)
    if (!onion) {
      origOnionRef.current = null
      setLoadUrl(url)
      setBanner(false)
      setChecked(false)
      return
    }

    // Simpan URL onion asli
    origOnionRef.current = url
    setChecked(false)
    setBanner(false)

    window.kuroAPI?.tor?.check?.().then(r => {
      const up = r?.running || false
      setTorUp(up)
      setChecked(true)
      setBanner(true)
      if (up) {
        setLoadUrl(url)           // Tor aktif → buka langsung
      } else {
        const conv = toTor2Web(url, TOR2WEB[gwIdx])
        setLoadUrl(conv || url)   // fallback Tor2Web
      }
    }).catch(() => {
      setTorUp(false)
      setChecked(true)
      setBanner(true)
      const conv = toTor2Web(url, TOR2WEB[gwIdx])
      setLoadUrl(conv || url)
    })
  }, [url, isActive])            // gwIdx sengaja tidak di sini

  // Ganti gateway tanpa trigger re-check
  const switchGW = useCallback((i) => {
    setGwIdx(i)
    const orig = origOnionRef.current
    if (orig && !torUp) {
      const conv = toTor2Web(orig, TOR2WEB[i])
      if (conv) setLoadUrl(conv)
    }
  }, [torUp])

  // ── Webview events ────────────────────────────────────
  useEffect(() => {
    const wv = viewRef.current
    if (!wv) return
    const onStart = () => onLoadStart()
    const onStop = () => {
      const cur = wv.getURL()
      // Kalau sedang tor2web, jangan update URL ke tor2web URL
      onLoadEnd(isT2W(cur) && origOnionRef.current ? origOnionRef.current : cur)
      onNavigationState(wv.canGoBack(), wv.canGoForward())
    }
    const onTitle = e => onTitleChange(e.title)
    const onFav = e => { if (e.favicons?.[0]) onFaviconChange(e.favicons[0]) }
    const onNew = e => { e.preventDefault(); if (e.url) onNewTabRequested(e.url) }
    const onFail = e => {
      // Jika Tor aktif tapi koneksi gagal → otomatis fallback Tor2Web
      if (torUp && origOnionRef.current &&
        (e.errorCode === -105 || e.errorCode === -106 || e.errorCode === -200 ||
          String(e.errorDescription || '').includes('SOCKS'))) {
        setTorUp(false)
        const conv = toTor2Web(origOnionRef.current, TOR2WEB[gwIdx])
        if (conv) setLoadUrl(conv)
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
  }, [torUp, gwIdx])

  useEffect(() => {
    if (isActive && viewRef.current) window.__activeWebview = viewRef.current
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

  const isOnionUrl = isRealOnion(url)

  return (
    <div className={`bview-container ${isActive ? 'active' : ''}`}>

      {/* ── Tor / Tor2Web Banner ── */}
      {isOnionUrl && banner && checked && (
        <div className="bview-tor-banner">
          {torUp ? (
            <div className="bview-tor-ok">
              <span>🧅 Terhubung via Tor — anonim</span>
              <button onClick={() => setBanner(false)}>×</button>
            </div>
          ) : (
            <div className="bview-tor-warn">
              <div className="bview-tor-warn-top">
                <span>⚠️ Tor tidak aktif — membuka via <strong>{TOR2WEB[gwIdx]}</strong></span>
                <button onClick={() => setBanner(false)}>×</button>
              </div>
              <div className="bview-tor-warn-body">
                <span className="bview-tor-note">Aktifkan Tor di sidebar untuk privasi penuh.</span>
                <div className="bview-tor-alts">
                  {TOR2WEB.map((gw, i) => (
                    <button key={i} className={`bview-tor-alt ${gwIdx === i ? 'active' : ''}`} onClick={() => switchGW(i)}>
                      {gw}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isOnionUrl && !checked && (
        <div className="bview-tor-checking">
          <span className="bview-spin" /> Memeriksa Tor...
        </div>
      )}

      <webview
        ref={viewRef}
        src={loadUrl || url}
        className="bview-wv"
        allowpopups="true"
        nodeintegration="false"
        contextIsolation="false"
        partition="persist:main"
        webpreferences="contextIsolation=no,nodeIntegration=no,javascript=yes,allowRunningInsecureContent=yes,images=yes"
        disablewebsecurity="true"
      />
    </div>
  )
}
