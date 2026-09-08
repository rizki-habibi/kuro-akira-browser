import React, { useEffect, useRef } from 'react'
import './FindBar.css'

export default function FindBar({ query, onChange, onClose }) {
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Kirim perintah find ke webview aktif
  useEffect(() => {
    const wv = window.__activeWebview
    if (!wv) return
    if (query.trim()) {
      try { wv.findInPage(query) } catch(_) {}
    } else {
      try { wv.stopFindInPage('clearSelection') } catch(_) {}
    }
  }, [query])

  const handleKey = e => {
    if (e.key === 'Enter') {
      const wv = window.__activeWebview
      try { wv?.findInPage(query, { findNext: true, forward: !e.shiftKey }) } catch(_) {}
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="find-bar">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        ref={inputRef}
        className="find-input"
        value={query}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Cari di halaman..."
        spellCheck={false}
      />
      <div className="find-actions">
        <button className="find-btn" onClick={() => {
          const wv = window.__activeWebview
          try { wv?.findInPage(query, { findNext: true, forward: false }) } catch(_) {}
        }} title="Sebelumnya (Shift+Enter)">↑</button>
        <button className="find-btn" onClick={() => {
          const wv = window.__activeWebview
          try { wv?.findInPage(query, { findNext: true, forward: true }) } catch(_) {}
        }} title="Berikutnya (Enter)">↓</button>
        <button className="find-btn find-close" onClick={onClose} title="Tutup (Esc)">×</button>
      </div>
    </div>
  )
}
