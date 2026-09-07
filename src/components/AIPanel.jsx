import React, { useState, useRef, useEffect } from 'react'
import './AIPanel.css'

// Kuro AI — engine AI buatan sendiri dengan multi-model
// Backend: Pollinations.ai (gratis, tanpa API key)
// Model tersedia: openai (GPT-4o), mistral, llama, claude

const KURO_AI_MODELS = [
  { id: 'openai', label: 'KuroGPT (GPT-4o)', badge: 'Cepat', color: '#4caf50' },
  { id: 'mistral', label: 'KuroMind (Mistral)', badge: 'Hemat', color: '#2196f3' },
  { id: 'llama', label: 'KuroLlama (Llama3)', badge: 'Lokal', color: '#ff9800' },
  { id: 'claude-hybr', label: 'KuroC (Claude)', badge: 'Cerdas', color: '#9c27b0' },
  { id: 'gemma', label: 'KuroGem (Gemma)', badge: 'Ringan', color: '#00bcd4' },
]

const SYSTEM_PROMPT = `Kamu adalah Kuro AI, asisten kecerdasan buatan yang terpasang di Kuro Akira Browser. Karaktermu:
- Cerdas, ramah, dan membantu
- Bicara dalam Bahasa Indonesia yang natural
- Membantu browsing: merangkum halaman, menjawab pertanyaan, memberikan saran
- Jika ditanya tentang browser, jelaskan fitur Kuro Akira
- Jawab ringkas dan tepat sasaran, maksimal 4-5 kalimat kecuali diminta lebih panjang`

const QUICK_PROMPTS = [
  'Rangkum halaman ini',
  'Terjemahkan ke Bahasa Indonesia',
  'Jelaskan secara sederhana',
  'Apa itu AI?',
  'Tips keamanan internet',
  'Cara menggunakan VPN',
]

export default function AIPanel({ onClose, currentUrl }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Halo! Saya **Kuro AI**, asisten browser pribadi Anda.\n\nSaya bisa membantu:\n• Menjawab pertanyaan\n• Merangkum halaman web\n• Memberikan informasi & tips\n\nKetik pertanyaan atau pilih perintah cepat di bawah.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('openai')
  const [showModels, setShowModels] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const activeModel = KURO_AI_MODELS.find(m => m.id === model) || KURO_AI_MODELS[0]

  const send = async (text) => {
    const msg = (text || input).trim()
    if (!msg || loading) return
    setInput('')
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { role: 'user', content: msg, time }])
    setLoading(true)

    try {
      // Buat konteks dari riwayat chat
      const history = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Kuro AI'}: ${m.content}`
      ).join('\n')

      const fullPrompt = currentUrl
        ? `Konteks: User sedang membuka ${currentUrl}\n\n${history}\nUser: ${msg}`
        : `${history}\nUser: ${msg}`

      const encoded = encodeURIComponent(fullPrompt)
      const sysEncoded = encodeURIComponent(SYSTEM_PROMPT)

      // Pollinations.ai — gratis, no API key
      const url = `https://text.pollinations.ai/${encoded}?model=${model}&system=${sysEncoded}&seed=${Date.now()}`
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) })

      if (res.ok) {
        const answer = await res.text()
        const replyTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        setMessages(prev => [...prev, { role: 'assistant', content: answer, time: replyTime, model: activeModel.label }])
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (e) {
      const errTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, tidak dapat menghubungi server AI saat ini. Periksa koneksi internet Anda dan coba lagi.',
        time: errTime,
        isError: true
      }])
    }
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Riwayat chat dibersihkan. Ada yang bisa saya bantu?',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }])
  }

  // Format markdown sederhana
  const formatMsg = (text) => {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/•/g, '•')
      .replace(/\n/g, '<br/>')
  }

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="right-panel-header">
        <div className="right-panel-title">
          <img src="./assets/maskot-utama.png" alt="Kuro AI" className="ai-header-avatar" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Kuro AI</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Asisten Browser Pribadi</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {/* Model selector */}
          <div style={{ position: 'relative' }}>
            <button
              className="ai-model-btn"
              onClick={() => setShowModels(v => !v)}
              style={{ borderColor: activeModel.color }}
            >
              <span style={{ color: activeModel.color }}>{activeModel.label}</span>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showModels && (
              <div className="ai-model-dropdown">
                {KURO_AI_MODELS.map(m => (
                  <button
                    key={m.id}
                    className={`ai-model-item ${model === m.id ? 'active' : ''}`}
                    onClick={() => { setModel(m.id); setShowModels(false) }}
                  >
                    <span style={{ color: m.color, width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{m.label}</span>
                    <span className="ai-model-badge" style={{ background: m.color + '22', color: m.color }}>{m.badge}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="ai-clear-btn" onClick={clearChat} title="Bersihkan chat">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
            </svg>
          </button>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      <div className="ai-quick-prompts">
        {QUICK_PROMPTS.map((p, i) => (
          <button key={i} className="ai-quick-btn" onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ${msg.role}`}>
            {msg.role === 'assistant' && (
              <img src="./assets/maskot-utama.png" alt="AI" className="ai-msg-avatar" />
            )}
            <div className="ai-msg-wrap">
              <div
                className={`ai-bubble ${msg.isError ? 'error' : ''}`}
                dangerouslySetInnerHTML={{ __html: formatMsg(msg.content) }}
              />
              <div className="ai-msg-meta">
                {msg.model && <span className="ai-msg-model">{msg.model}</span>}
                <span className="ai-msg-time">{msg.time}</span>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-msg assistant">
            <img src="./assets/maskot-utama.png" alt="AI" className="ai-msg-avatar" />
            <div className="ai-bubble ai-thinking">
              <span /><span /><span />
              <span className="ai-thinking-text">Kuro AI sedang berpikir...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="ai-input-area">
        <div className="ai-input-wrap">
          <textarea
            ref={inputRef}
            className="ai-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tanya Kuro AI... (Enter kirim, Shift+Enter baris baru)"
            rows={2}
            disabled={loading}
          />
          <button
            className={`ai-send ${loading ? 'sending' : ''} ${input.trim() ? 'ready' : ''}`}
            onClick={() => send()}
            disabled={loading || !input.trim()}
            title="Kirim (Enter)"
          >
            {loading
              ? <span className="ai-send-spin" />
              : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )
            }
          </button>
        </div>
        <div className="ai-input-footer">
          <span>Ditenagai oleh Pollinations.ai • Gratis & Privat</span>
          <span>Model: {activeModel.label}</span>
        </div>
      </div>
    </div>
  )
}
