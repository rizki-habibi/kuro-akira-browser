import React, { useState, useEffect } from 'react'
import './HistoryPanel.css'

function timeAgo(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'Baru saja'
  if (m < 60) return `${m} menit lalu`
  if (h < 24) return `${h} jam lalu`
  if (d < 7) return `${d} hari lalu`
  return new Date(ts).toLocaleDateString('id-ID')
}

function groupByDate(entries) {
  const groups = {}
  entries.forEach(e => {
    const d = new Date(e.ts).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups[d]) groups[d] = []
    groups[d].push(e)
  })
  return groups
}

export default function HistoryPanel({ onClose, onNavigate }) {
  const [history, setHistory] = useState([])
  const [search, setSearch] = useState('')

  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem('ka_nav_history') || '[]')
      setHistory(raw)
    } catch { setHistory([]) }
  }

  useEffect(() => { load() }, [])

  const remove = (ts) => {
    const updated = history.filter(h => h.ts !== ts)
    setHistory(updated)
    localStorage.setItem('ka_nav_history', JSON.stringify(updated))
  }

  const clearAll = () => {
    setHistory([])
    localStorage.removeItem('ka_nav_history')
  }

  const filtered = search
    ? history.filter(h => h.url?.includes(search) || h.title?.toLowerCase().includes(search.toLowerCase()))
    : history

  const groups = groupByDate(filtered)

  return (
    <div className="hist-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-4.95"/>
          </svg>
          Riwayat
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="hist-clear-btn" onClick={clearAll} title="Hapus semua">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="hist-search-wrap">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="hist-search"
          placeholder="Cari riwayat..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="hist-list">
        {filtered.length === 0 && (
          <div className="hist-empty">
            {search ? 'Tidak ada hasil' : 'Riwayat kosong'}
          </div>
        )}

        {Object.entries(groups).map(([date, entries]) => (
          <div key={date} className="hist-group">
            <div className="hist-date">{date}</div>
            {entries.map((entry, i) => (
              <div key={i} className="hist-item">
                <img
                  src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(entry.url)}&sz=16`}
                  alt="" width={14} height={14}
                  onError={e => e.target.style.display = 'none'}
                  className="hist-fav"
                />
                <div className="hist-info" onClick={() => onNavigate(entry.url)}>
                  <div className="hist-title">{entry.title || entry.url}</div>
                  <div className="hist-url">{entry.url}</div>
                </div>
                <div className="hist-meta">
                  <span className="hist-time">{timeAgo(entry.ts)}</span>
                  <button className="hist-del" onClick={() => remove(entry.ts)} title="Hapus">×</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
