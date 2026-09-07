import React, { useState, useEffect } from 'react'
import './RewardPanel.css'

// Kuro Reward - sistem poin dari iklan yang diblokir
// Setiap 10 iklan diblokir = 1 Kuro Coin (KC)
// KC bisa digunakan untuk fitur premium (simulasi)

const REWARDS = [
  { id: 1, title: 'Filter Iklan Pro',    cost: 50,  desc: 'Aktifkan filter iklan level lanjutan', icon: '🚫' },
  { id: 2, title: 'Tema Premium',        cost: 30,  desc: 'Buka tema warna eksklusif',            icon: '🎨' },
  { id: 3, title: 'Ekspor Penanda',      cost: 20,  desc: 'Ekspor semua penanda ke HTML/JSON',    icon: '📤' },
  { id: 4, title: 'History 90 hari',     cost: 40,  desc: 'Simpan riwayat penelusuran 90 hari',  icon: '📅' },
  { id: 5, title: 'Kecepatan VPN+',     cost: 60,  desc: 'Prioritas server VPN tercepat',        icon: '⚡' },
  { id: 6, title: 'Enkripsi Catatan',    cost: 25,  desc: 'Enkripsi penanda dan riwayat',        icon: '🔐' },
]

export default function RewardPanel({ onClose, blockedCount }) {
  const [coins, setCoins] = useState(0)
  const [rewardEnabled, setRewardEnabled] = useState(true)
  const [history, setHistory] = useState([])
  const [claimed, setClaimed] = useState([])
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      if (window.kuroAPI) {
        const c = await window.kuroAPI.stats.getCoins()
        setCoins(c)
      }
      const h = JSON.parse(localStorage.getItem('ka_reward_history') || '[]')
      const cl = JSON.parse(localStorage.getItem('ka_claimed_rewards') || '[]')
      setHistory(h)
      setClaimed(cl)
    }
    load()
  }, [])

  const claim = async (reward) => {
    if (coins < reward.cost) { setMsg('Koin tidak cukup!'); setTimeout(() => setMsg(''), 2000); return }
    const newCoins = await window.kuroAPI.stats.getCoins() - reward.cost
    // Anggap ada handler, tapi kita simpan lokal
    const updated = [...claimed, reward.id]
    setClaimed(updated)
    localStorage.setItem('ka_claimed_rewards', JSON.stringify(updated))
    const newHistory = [{ action: `Klaim: ${reward.title}`, coins: -reward.cost, date: new Date().toLocaleString('id-ID') }, ...history]
    setHistory(newHistory)
    localStorage.setItem('ka_reward_history', JSON.stringify(newHistory.slice(0, 20)))
    setCoins(prev => prev - reward.cost)
    setMsg(`Berhasil klaim: ${reward.title}!`)
    setTimeout(() => setMsg(''), 2500)
  }

  const coinProgress = (blockedCount % 10) / 10 * 100

  return (
    <div className="reward-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Kuro Reward
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
      </div>

      {/* Koin stats */}
      <div className="reward-stats">
        <div className="reward-coin-card">
          <div className="reward-coin-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><polyline points="12 16 12.01 16"/>
            </svg>
          </div>
          <div>
            <div className="reward-coin-num">{coins.toLocaleString('id')}</div>
            <div className="reward-coin-label">Kuro Coin (KC)</div>
          </div>
        </div>

        <div className="reward-progress">
          <div className="reward-progress-label">
            <span>Progres koin berikutnya</span>
            <span>{blockedCount % 10}/10 iklan</span>
          </div>
          <div className="reward-progress-bar">
            <div className="reward-progress-fill" style={{ width: `${coinProgress}%` }} />
          </div>
          <div className="reward-progress-note">
            Setiap 10 iklan diblokir = 1 KC. Total diblokir: {blockedCount.toLocaleString('id')}
          </div>
        </div>
      </div>

      {msg && <div className="reward-msg">{msg}</div>}

      {/* Reward store */}
      <div className="reward-store-title">Toko Hadiah</div>
      <div className="reward-store">
        {REWARDS.map(r => (
          <div key={r.id} className={`reward-item ${claimed.includes(r.id) ? 'claimed' : ''}`}>
            <div className="reward-item-icon">{r.icon}</div>
            <div className="reward-item-info">
              <div className="reward-item-title">{r.title}</div>
              <div className="reward-item-desc">{r.desc}</div>
            </div>
            <div className="reward-item-right">
              <div className="reward-item-cost">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--yellow)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                {r.cost} KC
              </div>
              {claimed.includes(r.id)
                ? <span className="reward-claimed-badge">Diklaim</span>
                : (
                  <button
                    className={`reward-claim-btn ${coins < r.cost ? 'disabled' : ''}`}
                    onClick={() => claim(r)}
                    disabled={coins < r.cost}
                  >
                    Klaim
                  </button>
                )
              }
            </div>
          </div>
        ))}
      </div>

      {/* Riwayat */}
      {history.length > 0 && (
        <div className="reward-history">
          <div className="reward-history-title">Riwayat</div>
          {history.slice(0, 5).map((h, i) => (
            <div key={i} className="reward-history-item">
              <span className="reward-history-action">{h.action}</span>
              <span className={`reward-history-coins ${h.coins > 0 ? 'plus' : 'minus'}`}>
                {h.coins > 0 ? '+' : ''}{h.coins} KC
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="reward-note">
        Sistem reward Kuro bersifat lokal dan tidak memerlukan akun. KC tidak dapat ditukarkan dengan uang nyata.
      </div>
    </div>
  )
}
