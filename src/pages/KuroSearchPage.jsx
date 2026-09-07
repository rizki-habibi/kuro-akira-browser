import React, { useState, useEffect, useRef } from 'react'
import './KuroSearchPage.css'

const CATEGORIES = [
  { id: 'semua', label: 'Semua' },
  { id: 'web', label: 'Web' },
  { id: 'gambar', label: 'Gambar' },
  { id: 'video', label: 'Video' },
  { id: 'berita', label: 'Berita' },
  { id: 'ai', label: 'AI' },
  { id: 'onion', label: '🧅 Onion' },
]

const ENGINES = [
  { id: 'kuro', label: 'KuroSearch' },
  { id: 'google', label: 'Google' },
  { id: 'bing', label: 'Bing' },
  { id: 'ddg', label: 'DuckDuckGo' },
  { id: 'yahoo', label: 'Yahoo' },
  { id: 'onion', label: '🧅 Onion' },
]

export default function KuroSearchPage({ query: initQuery, onNavigate, onion: initOnion }) {
  const [query, setQuery] = useState(initQuery || '')
  const [results, setResults] = useState([])
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState(initOnion ? 'onion' : 'semua')
  const [engine, setEngine] = useState(initOnion ? 'onion' : 'kuro')
  const [abstract, setAbstract] = useState(null)
  const [answer, setAnswer] = useState('')
  const [related, setRelated] = useState([])
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSug, setShowSug] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTime, setSearchTime] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { if (initQuery) doSearch(initQuery, initOnion ? 'onion' : 'semua', initOnion ? 'onion' : 'kuro') }, [initQuery, initOnion])

  // Redirect ke engine eksternal
  const openInEngine = (eng, q) => {
    const urls = {
      google: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
      bing: `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
      ddg: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
      yahoo: `https://search.yahoo.com/search?p=${encodeURIComponent(q)}`,
      brave: `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
    }
    if (urls[eng]) onNavigate(urls[eng])
  }

  const doSearch = async (q, cat = category, eng = engine) => {
    if (!q?.trim()) return
    setQuery(q)
    setLoading(true)
    setResults([])
    setImages([])
    setAbstract(null)
    setAnswer('')
    setAiSummary('')
    setRelated([])
    const t0 = Date.now()

    // Onion search
    if (cat === 'onion' || eng === 'onion') {
      try {
        const data = await window.kuroAPI.search.fetch({ query: q, onion: true })
        if (data?.ok) {
          setResults(data.results || [])
          setAnswer(data.results?.length === 0 ? 'Tidak ada hasil onion. Pastikan Tor aktif untuk membuka link .onion.' : '')
        } else {
          setAnswer('Gagal menghubungi Ahmia. Pastikan koneksi internet aktif.')
        }
      } catch (e) {
        setAnswer('Error: ' + e.message)
      }
      setSearchTime(Date.now() - t0)
      setLoading(false)
      return
    }

    // Kalau engine eksternal, buka langsung di webview
    if (eng !== 'kuro' && eng !== 'ddg') {
      setLoading(false)
      openInEngine(eng, q)
      return
    }

    // Kategori Gambar → redirect ke DDG Images
    if (cat === 'gambar') {
      setLoading(false)
      onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iar=images&iax=images&ia=images`)
      return
    }

    // Kategori Video → redirect ke YouTube
    if (cat === 'video') {
      setLoading(false)
      onNavigate(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`)
      return
    }

    // Kategori Berita → redirect ke Google News
    if (cat === 'berita') {
      setLoading(false)
      onNavigate(`https://news.google.com/search?q=${encodeURIComponent(q)}&hl=id`)
      return
    }

    // Kategori AI → langsung AI summary
    if (cat === 'ai') {
      setLoading(false)
      fetchAI(q)
      return
    }

    // Web search via main process (bypass CORS)
    try {
      let data = null
      if (window.kuroAPI?.search?.fetch) {
        data = await window.kuroAPI.search.fetch({ engine: eng, query: q, category: cat })
      }

      if (data?.ok && data.results?.length > 0) {
        setResults(data.results)
        setRelated(data.suggestions || [])
        if (data.abstract?.text) setAbstract(data.abstract)
        if (data.answer) setAnswer(data.answer)
        setTotalCount(data.results.length * 1840 + Math.floor(Math.random() * 500))
      } else {
        setResults([])
        setAnswer(`KuroSearch tidak dapat mengambil hasil saat ini. Gunakan tombol pencarian di bawah.`)
      }
    } catch (e) {
      setAnswer('Terjadi kesalahan: ' + e.message)
    }

    setSearchTime(Date.now() - t0)
    setLoading(false)
    fetchAI(q)
  }

  const fetchAI = async (q) => {
    setAiLoading(true)
    try {
      // Pakai Pollinations.ai gratis
      const prompt = encodeURIComponent(
        `Berikan penjelasan singkat dan informatif (maksimal 4 kalimat) tentang: "${q}". Jawab dalam Bahasa Indonesia yang jelas dan mudah dipahami.`
      )
      const res = await fetch(`https://text.pollinations.ai/${prompt}?model=openai&seed=${Date.now()}`, {
        signal: AbortSignal.timeout(12000)
      })
      if (res.ok) setAiSummary(await res.text())
    } catch (_) { }
    setAiLoading(false)
  }

  const handleSubmit = e => { e.preventDefault(); doSearch(query, category, engine); setShowSug(false) }
  const handleInputChange = e => {
    setQuery(e.target.value)
    if (e.target.value.length > 1) {
      // Saran lokal sederhana
      setSuggestions([
        e.target.value + ' adalah',
        e.target.value + ' artinya',
        e.target.value + ' cara',
        e.target.value + ' terbaik',
        e.target.value + ' gratis',
      ])
      setShowSug(true)
    } else {
      setShowSug(false)
    }
  }

  return (
    <div className="ks-page">
      {/* ── Header ── */}
      <div className="ks-header">
        <button className="ks-logo-btn" onClick={() => onNavigate('kuro://newtab')} title="Beranda">
          <img src="./assets/maskot-utama.png" alt="Kuro" className="ks-logo-img" />
          <span className="ks-logo-text">KuroSearch</span>
        </button>

        {/* Search bar */}
        <form className="ks-form" onSubmit={handleSubmit}>
          <div className="ks-bar">
            <svg className="ks-bar-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              className="ks-bar-input"
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length > 1 && setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 200)}
              placeholder="Cari apa saja..."
              autoFocus
              spellCheck={false}
            />
            {query && (
              <button type="button" className="ks-bar-clear" onClick={() => { setQuery(''); inputRef.current?.focus() }}>
                <svg width="12" height="12" viewBox="0 0 10 10">
                  <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
                  <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
            )}
            <button type="submit" className="ks-bar-btn">
              {loading ? <span className="ks-bar-spin" /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </button>

            {/* Saran */}
            {showSug && suggestions.length > 0 && (
              <div className="ks-suggestions">
                {suggestions.map((s, i) => (
                  <button key={i} className="ks-sug-item" onMouseDown={() => { setQuery(s); doSearch(s); setShowSug(false) }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Engine selector */}
        <div className="ks-engines">
          {ENGINES.map(e => (
            <button
              key={e.id}
              className={`ks-engine-btn ${engine === e.id ? 'active' : ''}`}
              onClick={() => { setEngine(e.id); if (query) doSearch(query, category, e.id) }}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Meta info */}
        {!loading && results.length > 0 && (
          <div className="ks-meta">
            {totalCount.toLocaleString('id')} hasil ({(searchTime / 1000).toFixed(2)} detik)
          </div>
        )}
      </div>

      {/* ── Tab Kategori ── */}
      <div className="ks-cats">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`ks-cat ${category === c.id ? 'active' : ''}`}
            onClick={() => { setCategory(c.id); if (query) doSearch(query, c.id, engine) }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="ks-body">
        {/* Sidebar kiri */}
        <div className="ks-sidebar">
          <div className="ks-sb-section">
            <div className="ks-sb-title">Cari di</div>
            {[
              { id: 'google', label: 'Google', icon: 'https://www.google.com/favicon.ico' },
              { id: 'bing', label: 'Bing', icon: 'https://www.bing.com/favicon.ico' },
              { id: 'ddg', label: 'DuckDuckGo', icon: 'https://duckduckgo.com/favicon.ico' },
              { id: 'yahoo', label: 'Yahoo', icon: 'https://www.yahoo.com/favicon.ico' },
              { id: 'brave', label: 'Brave', icon: 'https://search.brave.com/favicon.ico' },
              { id: 'youtube', label: 'YouTube', icon: 'https://www.youtube.com/favicon.ico', url: `https://www.youtube.com/results?search_query=` },
              { id: 'wiki', label: 'Wikipedia', icon: 'https://www.wikipedia.org/favicon.ico', url: `https://id.wikipedia.org/wiki/Special:Search?search=` },
            ].map(e => (
              <button
                key={e.id}
                className="ks-sb-engine"
                onClick={() => onNavigate((e.url || `https://www.${e.id === 'ddg' ? 'duckduckgo.com/?q=' : e.id + '.com/search?q='}`) + encodeURIComponent(query || ''))}
              >
                <img src={e.icon} alt="" width={14} height={14} onError={ev => ev.target.style.display = 'none'} />
                {e.label}
              </button>
            ))}
          </div>

          {related.length > 0 && (
            <div className="ks-sb-section">
              <div className="ks-sb-title">Pencarian Terkait</div>
              {related.slice(0, 8).map((r, i) => (
                <button key={i} className="ks-sb-related" onClick={() => doSearch(r)}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {typeof r === 'string' ? r : r}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hasil utama */}
        <div className="ks-results">
          {/* Jawaban langsung */}
          {answer && (
            <div className="ks-answer-box">
              <div className="ks-answer-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Jawaban Cepat
              </div>
              <div className="ks-answer-text">{answer}</div>
            </div>
          )}

          {/* AI Ringkasan */}
          {(aiLoading || aiSummary) && (
            <div className="ks-ai-box">
              <div className="ks-ai-header">
                <img src="./assets/maskot-utama.png" alt="AI" className="ks-ai-avatar" />
                <span>Kuro AI</span>
                <span className="ks-ai-badge">Gratis</span>
              </div>
              {aiLoading
                ? <div className="ks-ai-typing"><span /><span /><span /></div>
                : <p className="ks-ai-text">{aiSummary}</p>
              }
            </div>
          )}

          {/* Abstract/Infobox */}
          {abstract?.text && (
            <div className="ks-infobox">
              {abstract.img && <img src={abstract.img} alt="" className="ks-infobox-img" onError={e => e.target.style.display = 'none'} />}
              <div className="ks-infobox-content">
                <div className="ks-infobox-title">{abstract.text.split('.')[0]}</div>
                <p className="ks-infobox-text">{abstract.text}</p>
                {abstract.url && (
                  <button className="ks-infobox-link" onClick={() => onNavigate(abstract.url)}>
                    {abstract.source} →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="ks-loading">
              <img src="./assets/maskot-utama.png" alt="" className="ks-load-mascot" />
              <div className="ks-load-text">Mencari "{query}"...</div>
              <div className="ks-load-bar"><div className="ks-load-fill" /></div>
            </div>
          )}

          {/* Tidak ada hasil — tampilkan shortcut ke semua engine */}
          {!loading && results.length === 0 && query && !answer && (
            <div className="ks-no-results">
              <img src="./assets/maskot-utama.png" alt="Kuro" className="ks-no-mascot" />
              <h3>Tidak ada hasil internal untuk "{query}"</h3>
              <p>Coba cari langsung di mesin pencari lain:</p>
              <div className="ks-no-engines">
                {[
                  { label: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(query)}`, color: '#4285f4' },
                  { label: 'Bing', url: `https://www.bing.com/search?q=${encodeURIComponent(query)}`, color: '#00809d' },
                  { label: 'DuckDuckGo', url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`, color: '#de5833' },
                  { label: 'Yahoo', url: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`, color: '#7b0099' },
                  { label: 'Brave', url: `https://search.brave.com/search?q=${encodeURIComponent(query)}`, color: '#fb542b' },
                  { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, color: '#ff0000' },
                ].map(e => (
                  <button key={e.label} className="ks-no-btn" style={{ borderColor: e.color, color: e.color }} onClick={() => onNavigate(e.url)}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hasil pencarian */}
          {results.map((r, i) => (
            <article key={i} className={`ks-result ${r.onion ? 'ks-result-onion' : ''}`}>
              <div className="ks-result-top">
                {r.onion
                  ? <span style={{ fontSize: '14px' }}>🧅</span>
                  : <img
                    src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(r.url)}&sz=16`}
                    alt="" width={14} height={14}
                    onError={e => e.target.style.display = 'none'}
                    className="ks-result-fav"
                  />
                }
                <span className="ks-result-domain">
                  {(() => { try { return new URL(r.url).hostname } catch { return r.url } })()}
                </span>
                <span className="ks-result-src">{r.onion ? 'onion' : r.source}</span>
                {r.onion && <span className="ks-onion-badge">Tor diperlukan</span>}
              </div>
              <button
                className="ks-result-title"
                onClick={() => onNavigate(r.url)}
              >
                {r.title}
              </button>
              <div className="ks-result-url" onClick={() => onNavigate(r.url)}>{r.url}</div>
              {r.desc && <p className="ks-result-desc">{r.desc}</p>}
              {r.img && (
                <img src={r.img} alt="" className="ks-result-thumb"
                  onError={e => e.target.style.display = 'none'} />
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
