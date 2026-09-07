import React, { useState, useRef, useEffect } from 'react'
import './NavigationBar.css'

const SEARCH_ENGINES = [
  { id: 'kuro', label: 'KuroSearch', url: 'kuro://search?q=' },
  { id: 'google', label: 'Google', url: 'https://www.google.com/search?q=' },
  { id: 'bing', label: 'Bing', url: 'https://www.bing.com/search?q=' },
  { id: 'ddg', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { id: 'yahoo', label: 'Yahoo', url: 'https://search.yahoo.com/search?p=' },
  { id: 'brave', label: 'Brave', url: 'https://search.brave.com/search?q=' },
  { id: 'onion', label: '🧅 Onion Search', url: 'kuro://search?onion=1&q=' },
]

export default function NavigationBar({
  currentUrl, isLoading, canGoBack, canGoForward,
  onNavigate, onBack, onForward, onReload, onStop,
  privacyLevel, adBlockEnabled, searchEngine, onSearchEngineChange
}) {
  const [input, setInput] = useState(currentUrl || '')
  const [focused, setFocused] = useState(false)
  const [showEngines, setShowEngines] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const inputRef = useRef(null)

  useEffect(() => { if (!focused) setInput(currentUrl || '') }, [currentUrl, focused])

  const handleKey = e => {
    if (e.key === 'Enter') { doNavigate(input); inputRef.current?.blur() }
    if (e.key === 'Escape') { setInput(currentUrl || ''); inputRef.current?.blur() }
  }

  const doNavigate = raw => {
    let url = (raw || '').trim()
    if (!url) return
    // Cek jika pencarian KuroSearch internal
    if (!url.startsWith('http') && !url.startsWith('kuro://') && !url.includes('.')) {
      const eng = SEARCH_ENGINES.find(e => e.id === searchEngine) || SEARCH_ENGINES[0]
      url = eng.url + encodeURIComponent(url)
    } else if (!url.startsWith('http') && !url.startsWith('kuro://')) {
      url = 'https://' + url
    }
    onNavigate(url)
    setShowEngines(false)
  }

  const isHttps = currentUrl?.startsWith('https://')
  const isOnion = currentUrl?.includes('.onion')
  const secIcon = isOnion ? '🧅' : isHttps ? 'lock' : 'unlock'
  const secColor = isOnion ? '#4caf50' : isHttps ? 'var(--green)' : 'var(--yellow)'

  const activeEngine = SEARCH_ENGINES.find(e => e.id === searchEngine) || SEARCH_ENGINES[0]

  return (
    <div className="navbar">
      {/* Tombol navigasi */}
      <div className="nav-btns">
        <button className={`nav-btn ${!canGoBack ? 'dim' : ''}`} onClick={onBack} disabled={!canGoBack} title="Kembali (Alt+Kiri)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button className={`nav-btn ${!canGoForward ? 'dim' : ''}`} onClick={onForward} disabled={!canGoForward} title="Maju (Alt+Kanan)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <button className="nav-btn" onClick={isLoading ? onStop : onReload} title={isLoading ? 'Berhenti' : 'Muat ulang (F5)'}>
          {isLoading
            ? <span className="nav-spin" />
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          }
        </button>
      </div>

      {/* Pilih mesin pencari */}
      <div className="engine-picker" style={{ position: 'relative' }}>
        <button
          className="engine-btn"
          onClick={() => setShowEngines(v => !v)}
          title="Ganti mesin pencari"
        >
          <span>{activeEngine.label}</span>
        </button>
        {showEngines && (
          <div className="engine-dropdown">
            {SEARCH_ENGINES.map(eng => (
              <button
                key={eng.id}
                className={`engine-item ${eng.id === searchEngine ? 'active' : ''} ${eng.id === 'onion' ? 'engine-onion' : ''}`}
                onClick={() => { onSearchEngineChange(eng.id); setShowEngines(false) }}
              >
                {eng.label}
                {eng.id === 'kuro' && <span className="engine-badge">Buatan Sendiri</span>}
                {eng.id === 'onion' && <span className="engine-badge" style={{ background: 'rgba(76,175,80,.2)', color: '#4caf50' }}>Tor</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Address bar */}
      <div className={`addr-wrap ${focused ? 'focused' : ''} ${isLoading ? 'loading' : ''}`}>
        {/* Ikon keamanan */}
        <div className="addr-sec" style={{ color: secColor }}>
          {isOnion
            ? <span style={{ fontSize: '11px' }}>TOR</span>
            : isHttps
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
          }
        </div>

        <input
          ref={inputRef}
          className="addr-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onFocus={() => { setFocused(true); inputRef.current?.select() }}
          onBlur={() => { setFocused(false); setSuggestions([]) }}
          placeholder="Cari atau masukkan URL..."
          spellCheck={false}
          autoComplete="off"
        />

        {isLoading && <div className="addr-progress" />}

        {/* Badge */}
        <div className="addr-badges">
          {adBlockEnabled && (
            <span className="addr-badge" title="Pemblokir iklan aktif" style={{ color: 'var(--red-main)' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </span>
          )}
          <span
            className="addr-badge"
            title={`Privasi: ${privacyLevel}`}
            style={{ color: privacyLevel === 'paranoid' ? 'var(--red-bright)' : 'var(--text-muted)' }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
        </div>
      </div>

      {/* Tombol kanan */}
      <div className="nav-right">
        <button className="nav-btn" onClick={() => onNavigate('kuro://bookmarks')} title="Penanda">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>
        <button className="nav-btn" onClick={() => onNavigate('kuro://downloads')} title="Unduhan">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
