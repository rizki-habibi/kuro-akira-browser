import React, { useRef, useEffect, useState, useCallback } from 'react'
import ProtonPortalPage from '../pages/ProtonPortalPage'
import './BrowserView.css'

const TOR2WEB = ['onion.ws', 'onion.pet', 'onion.ly', 'onion.moe']

// Cek apakah URL sudah tor2web
const isT2W = url => TOR2WEB.some(g => String(url).includes('/' + g + '/') || String(url).startsWith('https://' + g))

// Cek apakah URL adalah .onion asli
const isRealOnion = url => !isT2W(url) && /\.onion(\/|$|\?)/.test(String(url))

function toTor2Web(onionUrl, gwHost) {
  try {
    const u = new URL(onionUrl)
    return `https://${gwHost}/${u.hostname}${u.pathname}${u.search}`
  } catch { return null }
}

export default function BrowserView({
  tabId, url, isActive, action, actionTs,
  containerId = 'proton-1',
  onTitleChange, onFaviconChange, onLoadStart, onLoadEnd,
  onNavigationState, onNewTabRequested,
  findQuery = '', zoom = 1, onOpenContainerPanel
}) {
  const iframeRef = useRef(null)
  const origOnionRef = useRef(null)
  const [torUp, setTorUp] = useState(false)
  const [checked, setChecked] = useState(false)
  const [gwIdx, setGwIdx] = useState(0)
  const [loadUrl, setLoadUrl] = useState(url)
  const [banner, setBanner] = useState(false)
  const [container, setContainer] = useState(null)
  const [cookies, setCookies] = useState([])
  const [loadError, setLoadError] = useState(false)

  // Load container and cookies
  const fetchContainerInfo = async () => {
    if (window.kuroAPI?.containers) {
      const c = await window.kuroAPI.containers.get(containerId)
      setContainer(c)
      const cks = await window.kuroAPI.containers.getCookies(containerId)
      setCookies(cks)
    }
  }

  useEffect(() => {
    fetchContainerInfo()
  }, [containerId])

  // Determine effective URL
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

    origOnionRef.current = url
    setChecked(false)
    setBanner(false)

    window.kuroAPI?.tor?.check?.().then(r => {
      const up = r?.running || false
      setTorUp(up)
      setChecked(true)
      setBanner(true)
      if (up) {
        setLoadUrl(url)
      } else {
        const conv = toTor2Web(url, TOR2WEB[gwIdx])
        setLoadUrl(conv || url)
      }
    }).catch(() => {
      setTorUp(false)
      setChecked(true)
      setBanner(true)
      const conv = toTor2Web(url, TOR2WEB[gwIdx])
      setLoadUrl(conv || url)
    })
  }, [url, isActive, gwIdx])

  const switchGW = useCallback((i) => {
    setGwIdx(i)
    const orig = origOnionRef.current
    if (orig && !torUp) {
      const conv = toTor2Web(orig, TOR2WEB[i])
      if (conv) setLoadUrl(conv)
    }
  }, [torUp])

  // Actions from Navbar (reload, stop, back, forward)
  useEffect(() => {
    if (!iframeRef.current || !action) return
    try {
      if (action === 'reload') {
        setLoadError(false)
        iframeRef.current.src = iframeRef.current.src
      }
    } catch (_) {}
  }, [action, actionTs])

  const handleRotateIP = async () => {
    if (window.kuroAPI?.containers && container) {
      await window.kuroAPI.containers.rotateIP(container.id)
      await fetchContainerInfo()
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src
      }
    }
  }

  // Register active webview for terminal commands
  useEffect(() => {
    if (isActive) {
      window.__activeWebview = {
        url: loadUrl,
        title: iframeRef.current?.contentDocument?.title || loadUrl,
        containerId: containerId,
        executeJavaScript: async (code) => {
          if (iframeRef.current?.contentWindow) {
            try {
              // eslint-disable-next-line no-eval
              return iframeRef.current.contentWindow.eval(code)
            } catch (err) {
              return Promise.reject(new Error(err?.message || 'Gagal mengevaluasi JavaScript pada frame'))
            }
          }
          return Promise.reject(new Error('Halaman web belum siap dievaluasi'))
        },
        setZoomFactor: (z) => {
          if (iframeRef.current) {
            iframeRef.current.style.transform = z !== 1 ? `scale(${z})` : 'none'
          }
        }
      }
    }
    return () => {
      if (isActive && window.__activeWebview?.url === loadUrl) {
        window.__activeWebview = null
      }
    }
  }, [isActive, loadUrl, containerId])

  const isProtonApp = url === 'kuro://proton' ||
    url?.includes('account.proton.me') ||
    url?.includes('mail.proton.me') ||
    url?.includes('proton.me')

  // If this is a Proton account or mail session
  if (isProtonApp) {
    return (
      <div className={`bview-container ${isActive ? 'active' : ''}`}>
        <ProtonPortalPage
          containerId={containerId}
          onOpenTabWithContainer={onNewTabRequested}
          onNavigate={(newUrl) => {
            if (onLoadEnd) onLoadEnd(newUrl)
          }}
        />
      </div>
    )
  }

  // Proxied URL for regular external web browsing
  const proxySrc = loadUrl?.startsWith('http')
    ? `/api/proxy?url=${encodeURIComponent(loadUrl)}&containerId=${encodeURIComponent(containerId || 'default')}`
    : loadUrl

  const isOnionUrl = isRealOnion(url)

  return (
    <div className={`bview-container ${isActive ? 'active' : ''}`}>
      {/* Container session top bar */}
      <div style={{
        background: 'var(--bg-15)',
        borderBottom: '1px solid var(--border)',
        padding: '5px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: container?.color || '#4caf50' }} />
          <strong style={{ color: 'var(--text-white)' }}>{container?.name || 'Container'}</strong>
          <span>•</span>
          <span>Virtual IP:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)', background: 'var(--bg-20)', padding: '1px 6px', borderRadius: '3px' }}>
            {container?.flag} {container?.ip}
          </span>
          <span>•</span>
          <span>Kukis:</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--yellow)' }}>
            {cookies.length} item
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleRotateIP}
            style={{ background: 'var(--bg-25)', border: '1px solid var(--border)', color: 'var(--text-bright)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10.5px' }}
            title="Ganti ke IP baru di negara ini"
          >
            🔄 Ganti IP
          </button>
          <button
            onClick={() => onNewTabRequested && onNewTabRequested('kuro://proton')}
            style={{ background: 'rgba(109, 74, 255, 0.2)', border: '1px solid rgba(109, 74, 255, 0.4)', color: '#c4b5fd', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10.5px' }}
            title="Buka Portal Akun Proton"
          >
            🛡️ Buka Proton
          </button>
          <a
            href={loadUrl}
            target="_blank"
            rel="noreferrer"
            style={{ background: 'var(--bg-25)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', textDecoration: 'none', fontSize: '10.5px' }}
            title="Buka situs asli di jendela eksternal"
          >
            Tab Eksternal ↗
          </a>
        </div>
      </div>

      {/* Tor / Tor2Web Banner */}
      {isOnionUrl && banner && checked && (
        <div className="bview-tor-banner">
          {torUp ? (
            <div className="bview-tor-ok">
              <span>🧅 Terhubung via Tor — anonim (IP Relay Jerman)</span>
              <button onClick={() => setBanner(false)}>×</button>
            </div>
          ) : (
            <div className="bview-tor-warn">
              <div className="bview-tor-warn-top">
                <span>⚠️ Membuka .onion via gateway <strong>{TOR2WEB[gwIdx]}</strong></span>
                <button onClick={() => setBanner(false)}>×</button>
              </div>
              <div className="bview-tor-warn-body">
                <span className="bview-tor-note">Aktifkan Tor di sidebar untuk akses langsung tanpa gateway pihak ketiga.</span>
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

      {/* Web Proxy Iframe */}
      <iframe
        ref={iframeRef}
        src={proxySrc}
        className="bview-wv"
        title="Kuro Akira Webview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        style={{
          width: '100%',
          flex: 1,
          border: 'none',
          background: '#ffffff',
          transform: zoom !== 1 ? `scale(${zoom})` : 'none',
          transformOrigin: 'top left'
        }}
        onLoad={() => {
          if (onLoadEnd) onLoadEnd(loadUrl)
          if (onTitleChange) {
            try {
              const docTitle = iframeRef.current?.contentDocument?.title
              if (docTitle) onTitleChange(docTitle)
            } catch (_) {}
          }
        }}
        onError={() => setLoadError(true)}
      />

      {loadError && (
        <div style={{ padding: '30px', textAlign: 'center', background: 'var(--bg-15)', color: 'var(--text-secondary)' }}>
          <p style={{ color: 'var(--red-bright)', fontWeight: 600, marginBottom: '8px' }}>Tidak dapat memuat halaman langsung di dalam frame.</p>
          <p style={{ fontSize: '12px', marginBottom: '16px' }}>Situs ini membatasi pemuatan iframe browser.</p>
          <a
            href={loadUrl}
            target="_blank"
            rel="noreferrer"
            style={{ background: 'var(--red-main)', color: 'white', padding: '8px 16px', borderRadius: '6px', textDecoration: 'none', fontWeight: 600 }}
          >
            Buka di Tab Eksternal ↗
          </a>
        </div>
      )}
    </div>
  )
}
