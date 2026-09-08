import React, { useRef, useState, useEffect } from 'react'
import './TabBar.css'

const IconGlobe = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

// Timer per-tab untuk tampilkan berapa detik loading
function useLoadTimer(isLoading) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isLoading) { setElapsed(0); return }
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [isLoading])
  return elapsed
}

function Tab({ tab, isActive, onSelect, onClose }) {
  const elapsed = useLoadTimer(tab.isLoading)
  return (
    <div
      className={`tab ${isActive ? 'tab-active' : ''}`}
      onClick={() => onSelect(tab.id)}
      title={tab.url || 'Tab Baru'}
    >
      <div className="tab-favicon">
        {tab.favicon && !tab.isLoading
          ? <img src={tab.favicon} alt="" width={12} height={12} onError={e => e.target.style.display = 'none'} />
          : tab.isLoading
            ? <span className="tab-spin" />
            : <IconGlobe />
        }
      </div>
      <span className="tab-title">
        {tab.isLoading && elapsed > 0
          ? `${elapsed}s — ${tab.title || 'Memuat...'}`
          : tab.title || 'Tab Baru'}
      </span>
      <button
        className="tab-close"
        onClick={e => { e.stopPropagation(); onClose(tab.id) }}
        title="Tutup tab"
      >
        <svg width="8" height="8" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {isActive && <div className="tab-underline" />}
    </div>
  )
}

export default function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onNewTab }) {
  const barRef = useRef(null)

  const handleWheel = e => {
    e.preventDefault()
    barRef.current.scrollLeft += e.deltaY * 0.5
  }

  return (
    <div className="tabbar">
      <div className="tabs-scroll" ref={barRef} onWheel={handleWheel}>
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={onTabSelect}
            onClose={onTabClose}
          />
        ))}
      </div>
      <button className="tab-new" onClick={onNewTab} title="Tab baru (Ctrl+T)">
        <IconPlus />
      </button>
    </div>
  )
}
