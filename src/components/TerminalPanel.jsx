import React, { useState, useRef, useEffect } from 'react'
import { commands, g, HELP_TEXT } from './terminal-commands.js'

// Parse ANSI color codes ke styled spans
function AnsiLine({ text }) {
  const ANSI = {
    '\x1b[32m': { color: '#4caf50' },
    '\x1b[31m': { color: '#ff5252' },
    '\x1b[33m': { color: '#ffc107' },
    '\x1b[36m': { color: '#00bcd4' },
    '\x1b[37m': { color: '#e0e0e0' },
    '\x1b[2m': { opacity: '0.5' },
    '\x1b[1m': { fontWeight: '700' },
    '\x1b[0m': {},
  }
  const re = /\x1b\[[\d;]*m/g
  const parts = []
  let last = 0, style = {}
  let m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index), style })
    style = ANSI[m[0]] ?? {}
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), style })
  return (
    <span>
      {parts.map((p, i) => (
        <span key={i} style={p.style}>{p.text}</span>
      ))}
    </span>
  )
}

const BANNER = [
  { type: 'info', text: '┌─ KURO TERMINAL v2.7 ───────────────────────────────┐' },
  { type: 'info', text: '│  help = semua perintah     analyze = analisis website│' },
  { type: 'info', text: '│  errors = deteksi error    security = audit keamanan │' },
  { type: 'info', text: '│  py <kode> = Python        ai <tanya> = tanya AI     │' },
  { type: 'info', text: '│  fill = auto-isi form      search <query> = cari web │' },
  { type: 'info', text: '└──────────────────────────────────────────────────────┘' },
  { type: 'dim', text: new Date().toLocaleString('id-ID') },
]

export default function TerminalPanel({ onClose }) {
  const [lines, setLines] = useState(BANNER)
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  const addLine = (text, type = 'out') => {
    const rows = String(text).split('\n')
    setLines(prev => [...prev, ...rows.map(t => ({ type, text: t }))])
  }

  const run = async (cmd) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    addLine(`kuro@browser:~$ ${trimmed}`, 'cmd')
    setHistory(prev => [trimmed, ...prev.slice(0, 99)])
    setHistIdx(-1)

    if (trimmed === 'clear' || trimmed === 'cls') { setLines([]); return }
    if (trimmed === 'history') { addLine(history.length ? history.map((h, i) => `${String(i + 1).padStart(3)}  ${h}`).join('\n') : 'Riwayat kosong'); return }

    const spaceIdx = trimmed.indexOf(' ')
    const name = spaceIdx === -1 ? trimmed : trimmed.substring(0, spaceIdx)
    const args = spaceIdx === -1 ? '' : trimmed.substring(spaceIdx + 1)

    const fn = commands[name.toLowerCase()]
    if (fn) {
      try {
        const result = await fn(args)
        if (result !== undefined) addLine(result)
      } catch (e) {
        addLine(`Kesalahan: ${e.message}`, 'err')
      }
    } else {
      addLine(`'${name}' tidak dikenal. Ketik 'help' untuk daftar perintah.`, 'err')
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter') { run(input); setInput(''); return }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next); setInput(history[next] || '')
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next); setInput(next === -1 ? '' : history[next])
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const partial = input.toLowerCase()
      const match = Object.keys(commands).find(k => k.startsWith(partial))
      if (match) setInput(match)
    }
  }

  const lineClass = (type) => {
    if (type === 'cmd') return { color: 'var(--red-main)' }
    if (type === 'err') return { color: '#ff5252' }
    if (type === 'info') return { color: '#4caf50' }
    if (type === 'dim') return { color: 'var(--text-dim)' }
    return { color: 'var(--silver)' }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Terminal
          <span style={{ fontSize: '9px', color: 'var(--text-dim)', marginLeft: '6px' }}>
            {window.__activeWebview ? '● aktif' : '○ tidak ada halaman'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--bg-25)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-muted)' }}
            onClick={() => setLines([])}
          >Bersih</button>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="terminal-body" onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <div key={i} className="terminal-line" style={lineClass(l.type)}>
            <AnsiLine text={l.text} />
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="terminal-input-wrap">
        <span className="terminal-prompt">kuro@browser:~$</span>
        <input
          ref={inputRef}
          className="terminal-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="masukkan perintah... (Tab = autocomplete)"
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  )
}
