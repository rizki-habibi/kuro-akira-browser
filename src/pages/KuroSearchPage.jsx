import React, { useState, useEffect } from 'react'
import './KuroSearchPage.css'

// KuroSearch - mesin pencari buatan sendiri
// Pakai SearXNG API publik + Pollinations AI untuk ringkasan
const SEARX_INSTANCES = [
  'https://searx.be/search',
  'https://search.sapti.me/search',
  'https://searx.tiekoetter.com/search',
]

const CATEGORIES = ['Semua','Web','Gambar','Video','Berita','Dokumen','AI']

export default function KuroSearchPage({ query: initialQuery, onNavigate }) {
  const [query, setQuery] = useState(initialQuery || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('Semua')
  const [aiSummary, setAiSummary] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [related, setRelated] = useState([])

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery)
  }, [initialQuery])

  const doSearch = async (q) => {
    if (!q?.trim()) return
    setQuery(q)
    setLoading(true)
    setResults([])
    setAiSummary('')

    // Coba ambil dari SearXNG
    let fetched = false
    for (const base of SEARX_INSTANCES) {
      try {
        const url = `${base}?q=${encodeURIComponent(q)}&format=json&language=id-ID`
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        if (res.ok) {
          const data = await res.json()
          const items = (data.results || []).slice(0, 15).map(r => ({
            title: r.title,
            url: r.url,
            desc: r.content || r.snippet || '',
            source: r.engine || 'web',
            img: r.thumbnail,
          }))
          setResults(items)
          // Related searches
          setRelated((data.suggestions || []).slice(0, 6))
          fetched = true
          break
        }
      } catch { continue }
    }

    if (!fetched) {
      // Fallback: arahkan ke Brave Search jika SearXNG tidak bisa
      setResults([{
        title: `Cari "${q}" di Brave Search`,
        url: `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
        desc: 'Tidak dapat menghubungi KuroSearch. Klik untuk membuka di Brave Search.',
        source: 'fallback',
      }])
    }

    setLoading(false)
    fetchAISummary(q)
  }

  const fetchAISummary = async (q) => {
    setAiLoading(true)
    try {
      const prompt = encodeURIComponent(`Berikan ringkasan singkat (3-4 kalimat) tentang: ${q}. Jawab dalam Bahasa Indonesia.`)
      const res = await fetch(`https://text.pollinations.ai/${prompt}?model=openai`, {
        signal: AbortSignal.timeout(10000)
      })
      if (res.ok) setAiSummary(await res.text())
    } catch { setAiSummary('') }
    setAiLoading(false)
  }

  const handleSubmit = e => { e.preventDefault(); doSearch(query) }

  return (
    <div className="ks-page">
      {/* Header pencarian */}
      <div className="ks-header">
        <div className="ks-brand" onClick={() => onNavigate('kuro://newtab')}>
          <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
            <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#e53535" strokeWidth="7"/>
            <circle cx="50" cy="50" r="14" fill="#e53535"/>
            <circle cx="50" cy="50" r="6" fill="#fff"/>
          </svg>
          <span>KuroSearch</span>
        </div>

        <form className="ks-search-bar" onSubmit={handleSubmit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="ks-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari apa saja..."
            autoFocus
          />
          {query && (
            <button type="button" className="ks-clear" onClick={() => setQuery('')}>
              <svg width="12" height="12" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          )}
          <button type="submit" className="ks-search-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </form>

        <div className="ks-meta">
          {!loading && results.length > 0 && (
            <span className="ks-count">~{results.length * 1200} hasil untuk "{initialQuery}"</span>
          )}
        </div>
      </div>

      <div className="ks-body">
        {/* Sidebar kiri - kategori */}
        <div className="ks-sidebar">
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`ks-cat ${category===c?'active':''}`}
              onClick={() => setCategory(c)}
            >
              {c === 'AI' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                </svg>
              )}
              {c}
            </button>
          ))}
          <div className="ks-sidebar-divider" />
          <button className="ks-cat" onClick={() => onNavigate(`https://www.google.com/search?q=${encodeURIComponent(initialQuery||query)}`)}>
            Cari di Google
          </button>
          <button className="ks-cat" onClick={() => onNavigate(`https://www.bing.com/search?q=${encodeURIComponent(initialQuery||query)}`)}>
            Cari di Bing
          </button>
          <button className="ks-cat" onClick={() => onNavigate(`https://duckduckgo.com/?q=${encodeURIComponent(initialQuery||query)}`)}>
            Cari di DDG
          </button>
        </div>

        {/* Hasil pencarian */}
        <div className="ks-results">
          {/* AI Ringkasan */}
          {(aiLoading || aiSummary) && (
            <div className="ks-ai-box">
              <div className="ks-ai-header">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
                </svg>
                Ringkasan AI
              </div>
              {aiLoading
                ? <div className="ks-ai-loading"><span/><span/><span/></div>
                : <p className="ks-ai-text">{aiSummary}</p>
              }
            </div>
          )}

          {loading && (
            <div className="ks-loading">
              <div className="ks-spin" />
              <span>Mencari "{query}"...</span>
            </div>
          )}

          {!loading && results.map((r, i) => (
            <div key={i} className="ks-result">
              <div className="ks-result-meta">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${r.url}&sz=16`}
                  alt="" width={14} height={14}
                  onError={e=>e.target.style.display='none'}
                  className="ks-result-fav"
                />
                <span className="ks-result-domain">{(() => { try { return new URL(r.url).hostname } catch { return r.url } })()}</span>
                <span className="ks-result-src">{r.source}</span>
              </div>
              <a
                className="ks-result-title"
                href={r.url}
                onClick={e => { e.preventDefault(); onNavigate(r.url) }}
              >{r.title}</a>
              <div className="ks-result-url">{r.url}</div>
              {r.desc && <p className="ks-result-desc">{r.desc}</p>}
            </div>
          ))}

          {/* Pencarian terkait */}
          {related.length > 0 && (
            <div className="ks-related">
              <div className="ks-related-title">Pencarian Terkait</div>
              <div className="ks-related-list">
                {related.map((r, i) => (
                  <button key={i} className="ks-related-item" onClick={() => doSearch(r)}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
