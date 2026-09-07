import React, { useState, useRef, useEffect } from 'react'

const HELP = `Perintah yang tersedia:
  help          - Tampilkan bantuan ini
  clear         - Bersihkan terminal
  curl <url>    - Ambil URL (simulasi)
  ping <host>   - Ping host
  info          - Informasi browser
  privacy       - Status privasi
  blocked       - Jumlah iklan diblokir
  version       - Versi Kuro Akira`

const builtins = {
  help: () => HELP,
  info: () => 'Kuro Akira Browser v2.0 | Electron + React | Platform: Windows',
  version: () => 'Kuro Akira v2.0.0',
  privacy: () => 'Mode Privasi: TINGGI | Anti-Fingerprint: AKTIF | WebRTC Leak: DIBLOKIR',
  blocked: async () => {
    const n = await window.kuroAPI?.stats.getBlocked() ?? 0
    return `Total diblokir: ${n.toLocaleString('id')} iklan/pelacak`
  },
  curl: async (args) => {
    if (!args) return 'Penggunaan: curl <url>'
    return `Menghubungi ${args}...\nSimulasi: HTTP/2 200 OK\nConten-Type: text/html\nKuro Akira memblokir pelacak di halaman ini.`
  },
  ping: (args) => {
    if (!args) return 'Penggunaan: ping <host>'
    const ms = Math.floor(Math.random() * 80) + 10
    return `Ping ke ${args}...\nBalas dari ${args}: waktu=${ms}ms TTL=64\nBalas dari ${args}: waktu=${ms-2}ms TTL=64\nBalas dari ${args}: waktu=${ms+3}ms TTL=64`
  },
}

export default function TerminalPanel({ onClose }) {
  const [lines, setLines] = useState([
    { type: 'info', text: 'Terminal Kuro Akira v2.0 — ketik "help" untuk bantuan' },
    { type: 'info', text: `Tanggal: ${new Date().toLocaleString('id-ID')}` },
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  const addLine = (text, type = 'out') => {
    setLines(prev => [...prev, { type, text }])
  }

  const run = async (cmd) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    addLine(`$ ${trimmed}`, 'cmd')
    setHistory(prev => [trimmed, ...prev.slice(0, 49)])
    setHistIdx(-1)

    if (trimmed === 'clear') { setLines([]); return }

    const [name, ...argParts] = trimmed.split(' ')
    const args = argParts.join(' ')
    const fn = builtins[name.toLowerCase()]

    if (fn) {
      try {
        const result = await fn(args)
        result.split('\n').forEach(l => addLine(l))
      } catch (e) {
        addLine(`Kesalahan: ${e.message}`, 'err')
      }
    } else {
      addLine(`'${name}' tidak dikenal. Ketik 'help' untuk bantuan.`, 'err')
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter') { run(input); setInput(''); return }
    if (e.key === 'ArrowUp') {
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next); setInput(history[next] || '')
    }
    if (e.key === 'ArrowDown') {
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next); setInput(next === -1 ? '' : history[next])
    }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <div className="terminal-title">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          Terminal
        </div>
        <div style={{ display:'flex', gap:'4px' }}>
          <button
            style={{ fontSize:'10px', padding:'2px 8px', background:'var(--bg-25)', border:'1px solid var(--border)', borderRadius:'3px', color:'var(--text-muted)' }}
            onClick={() => setLines([])}
          >Bersih</button>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </div>

      <div className="terminal-body" onClick={() => inputRef.current?.focus()}>
        {lines.map((l, i) => (
          <div key={i} className={`terminal-line ${l.type}`}>{l.text}</div>
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
          placeholder="masukkan perintah..."
          autoFocus
          spellCheck={false}
        />
      </div>
    </div>
  )
}
