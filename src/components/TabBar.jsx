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

function Tab({ tab, isActive, onSelect, onClose, containers = [] }) {
  const elapsed = useLoadTimer(tab.isLoading)
  const cont = containers.find(c => c.id === tab.containerId)
  const isProton = tab.url?.includes('proton') || tab.title?.includes('Proton')

  return (
    <div
      className={`tab ${isActive ? 'tab-active' : ''}`}
      onClick={() => onSelect(tab.id)}
      title={`${tab.url || 'Tab Baru'}${cont ? ` [${cont.name} - ${cont.flag} ${cont.ip}]` : ''}`}
    >
      {cont && (
        <span
          className="tab-container-dot"
          style={{ background: cont.color || '#4caf50' }}
          title={`Profil: ${cont.name} (IP: ${cont.ip})`}
        />
      )}
      <div className="tab-favicon">
        {tab.favicon && !tab.isLoading
          ? <img src={tab.favicon} alt="" width={12} height={12} onError={e => e.target.style.display = 'none'} />
          : tab.isLoading
            ? <span className="tab-spin" />
            : isProton ? <span style={{ fontSize: '10px' }}>🛡️</span> : <IconGlobe />
        }
      </div>
      <span className="tab-title">
        {tab.isLoading && elapsed > 0
          ? `${elapsed}s — ${tab.title || 'Memuat...'}`
          : tab.title || (isProton ? 'Proton Mail' : 'Tab Baru')}
      </span>
      {cont && cont.id !== 'default' && (
        <span className="tab-container-tag">{cont.flag} {cont.ip.split('.').slice(0, 2).join('.')}..</span>
      )}
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

export default function TabBar({ tabs, activeTabId, onTabSelect, onTabClose, onNewTab, containers = [], onNewTabWithContainer }) {
  const barRef = useRef(null)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  const handleWheel = e => {
    e.preventDefault()
    barRef.current.scrollLeft += e.deltaY * 0.5
  }

  useEffect(() => {
    const clickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    if (showPicker) document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [showPicker])

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
            containers={containers}
          />
        ))}
      </div>
      <div style={{ position: 'relative' }} ref={pickerRef}>
        <button
          className="tab-new"
          onClick={() => setShowPicker(v => !v)}
          title="Buka tab baru atau pilih container cookie (Klik untuk menu)"
        >
          <IconPlus />
        </button>

        {showPicker && (
          <div className="tab-picker-menu">
            <div className="tab-picker-header">Buka Tab dengan Profil:</div>
            {containers.map(c => (
              <button
                key={c.id}
                className="tab-picker-item"
                onClick={() => {
                  if (onNewTabWithContainer) onNewTabWithContainer(c.id === 'default' ? '' : 'kuro://proton', c.id)
                  else onNewTab()
                  setShowPicker(false)
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                  <span>{c.name}</span>
                </div>
                <span className="tab-picker-ip">{c.flag} {c.ip}</span>
              </button>
            ))}
            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
            <button
              className="tab-picker-item"
              style={{ color: 'var(--red-bright)', fontWeight: 600 }}
              onClick={() => {
                onNewTab()
                setShowPicker(false)
              }}
            >
              <span>+ Tab Kosong Biasa</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
