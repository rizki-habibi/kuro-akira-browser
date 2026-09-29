import React, { useState, useRef, useEffect } from 'react'
import './AIPanel.css'

// Kuro AI — engine AI buatan sendiri dengan multi-model
// Backend: Pollinations.ai (default gratis), atau OpenAI/Gemini/Groq/OpenRouter via API key di Settings

const KURO_AI_MODELS = [
  { id: 'gemini', label: 'Kuro Gemini (Flash)', badge: 'Terbaru', color: '#4285f4', provider: 'gemini' },
  { id: 'openai', label: 'KuroGPT (GPT-4o)', badge: 'Cepat', color: '#4caf50', provider: 'openai' },
  { id: 'mistral', label: 'KuroMind (Mistral)', badge: 'Hemat', color: '#2196f3', provider: 'pollinations' },
  { id: 'llama', label: 'KuroLlama (Llama3)', badge: 'Lokal', color: '#ff9800', provider: 'pollinations' },
  { id: 'gemma', label: 'KuroGem (Gemma)', badge: 'Ringan', color: '#00bcd4', provider: 'pollinations' },
]

// Gemini API key default (bisa dioverride di Settings)
const DEFAULT_GEMINI_KEY = ''

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
      content: 'Halo! Saya **Kuro AI** didukung **Gemini 2.5 Flash**.\n\nSaya bisa membantu:\n• Menjawab pertanyaan\n• Merangkum halaman web\n• Analisis teks & kode\n• Tips & rekomendasi\n\nKetik pertanyaan atau pilih perintah cepat.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('gemini')
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
      const s = window.kuroAPI ? await window.kuroAPI.settings.get() : {}
      const provider = s.aiProvider || 'gemini'
      const history = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Kuro AI'}: ${m.content}`
      ).join('\n')
      const fullPrompt = currentUrl
        ? `Konteks: User sedang membuka ${currentUrl}\n\n${history}\nUser: ${msg}`
        : `${history}\nUser: ${msg}`
      let answer = ''

      // ── OpenAI-compatible Router (9Router / custom) ──
      if (provider === 'router' && window.kuroAPI?.ai?.vault) {
        const providers = await window.kuroAPI.ai.vault.list()
        const active = providers.find(p => p.enabled !== false)
        if (!active) throw new Error('Belum ada provider router. Tambahkan di Pengaturan > AI & API.')
        const chatHistory = [
          { role: 'system', content: SYSTEM_PROMPT + (currentUrl ? `\\n\\nUser sedang membuka: ${currentUrl}` : '') },
          ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: msg }
        ]
        const res = await window.kuroAPI.ai.vault.chat({ providerId: active.id, model: active.model || 'auto', messages: chatHistory, maxTokens: 1200 })
        if (!res?.ok) throw new Error(res?.error || `Router HTTP ${res?.status || 'error'}`)
        answer = res.text
        // ── Gemini via IPC (bypass CORS, paling reliable) ──
      } else if ((provider === 'gemini' || model === 'gemini') && window.kuroAPI?.ai?.gemini) {
      if ((provider === 'gemini' || model === 'gemini') && window.kuroAPI?.ai?.gemini) {
        const gemKey = s.geminiKey || DEFAULT_GEMINI_KEY
        const chatHistory = messages.slice(-6).map(m => ({
          role: m.role,
          content: m.content
        }))
        chatHistory.push({ role: 'user', content: msg })
        const res = await window.kuroAPI.ai.gemini({
          key: gemKey,
          model: s.geminiModel || 'gemini-2.5-flash',
          messages: chatHistory,
          systemPrompt: SYSTEM_PROMPT + (currentUrl ? `\n\nUser sedang membuka: ${currentUrl}` : '')
        })
        if (res.ok) answer = res.text
        else throw new Error(res.error || `Gemini HTTP ${res.status}`)

        // ── OpenAI ──────────────────────────────────────────
      } else if (provider === 'openai' && s.openaiKey) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.openaiKey}` },
          body: JSON.stringify({
            model: s.openaiModel || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: msg }
            ],
            max_tokens: 600, temperature: 0.7
          }),
          signal: AbortSignal.timeout(20000)
        })
        if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`)
        const data = await res.json()
        answer = data.choices?.[0]?.message?.content || ''

        // ── Groq ─────────────────────────────────────────────
      } else if (provider === 'groq' && s.groqKey) {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.groqKey}` },
          body: JSON.stringify({
            model: s.groqModel || 'llama3-8b-8192',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: msg }
            ],
            max_tokens: 600
          }),
          signal: AbortSignal.timeout(20000)
        })
        if (!res.ok) throw new Error(`Groq HTTP ${res.status}`)
        const data = await res.json()
        answer = data.choices?.[0]?.message?.content || ''

        // ── OpenRouter ───────────────────────────────────────
      } else if (provider === 'openrouter' && s.openrouterKey) {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.openrouterKey}`,
            'HTTP-Referer': 'kuro-akira-browser',
            'X-Title': 'Kuro Akira Browser'
          },
          body: JSON.stringify({
            model: s.openrouterModel || 'meta-llama/llama-3-8b-instruct',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: msg }
            ],
            max_tokens: 600
          }),
          signal: AbortSignal.timeout(20000)
        })
        if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}`)
        const data = await res.json()
        answer = data.choices?.[0]?.message?.content || ''

        // ── Pollinations fallback ────────────────────────────
      } else {
        const encoded = encodeURIComponent(fullPrompt)
        const sysEncoded = encodeURIComponent(SYSTEM_PROMPT)
        const url = `https://text.pollinations.ai/${encoded}?model=${model === 'gemini' ? 'openai' : model}&system=${sysEncoded}&seed=${Date.now()}`
        const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        answer = await res.text()
      }

      if (!answer) throw new Error('Respons kosong')
      const replyTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      const providerLabel = model === 'gemini' ? 'Gemini 2.0 Flash'
        : provider === 'openai' ? `OpenAI`
          : provider === 'groq' ? `Groq`
            : provider === 'openrouter' ? 'OpenRouter'
              : activeModel.label
      setMessages(prev => [...prev, { role: 'assistant', content: answer, time: replyTime, model: providerLabel }])
    } catch (e) {
      const errTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Gagal menghubungi server AI: **${e.message}**\n\nCek koneksi internet atau verifikasi API key di Pengaturan → AI & API.`,
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
          <img src="/assets/maskot-utama.png" alt="Kuro AI" className="ai-header-avatar" />
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
              <img src="/assets/maskot-utama.png" alt="AI" className="ai-msg-avatar" />
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
            <img src="/assets/maskot-utama.png" alt="AI" className="ai-msg-avatar" />
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
          <span>Kuro AI • Gemini 2.0 Flash + Fallback</span>
          <span>Model: {activeModel.label}</span>
        </div>
      </div>
    </div>
  )
}
