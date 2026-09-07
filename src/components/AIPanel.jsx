import React, { useState, useRef, useEffect } from 'react'
import './AIPanel.css'

const API_URL = 'https://text.pollinations.ai/'

export default function AIPanel({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Halo! Saya asisten AI Kuro Akira. Saya bisa membantu Anda menjelajah web, merangkum halaman, atau menjawab pertanyaan. Silakan ketik pertanyaan Anda.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('openai')
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)

    try {
      const prompt = encodeURIComponent(text)
      const res = await fetch(`${API_URL}${prompt}?model=${model}&system=Kamu+adalah+asisten+browser+pribadi+bernama+Kuro+AI.+Jawab+dalam+Bahasa+Indonesia+yang+jelas+dan+ringkas.`)
      const answer = await res.text()
      setMessages(prev => [...prev, { role: 'assistant', content: answer }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan koneksi. Coba lagi nanti.' }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  const MODELS = [
    { id: 'openai',       label: 'GPT-4o (Gratis)' },
    { id: 'mistral',      label: 'Mistral (Gratis)' },
    { id: 'claude-hybr',  label: 'Claude Hybrid' },
  ]

  return (
    <div className="ai-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
          </svg>
          Asisten AI
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
          <select className="ai-model-sel" value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </div>

      <div className="ai-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="ai-avatar">KA</div>
            )}
            <div className="ai-bubble">{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div className="ai-msg assistant">
            <div className="ai-avatar">KA</div>
            <div className="ai-bubble ai-typing">
              <span/><span/><span/>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="ai-input-area">
        <textarea
          className="ai-textarea"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Tanyakan sesuatu... (Enter untuk kirim)"
          rows={2}
        />
        <button className={`ai-send-btn ${loading ? 'loading' : ''}`} onClick={send} disabled={loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
