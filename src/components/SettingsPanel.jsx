import React, { useState, useEffect } from 'react'
import './SettingsPanel.css'

const Sec = ({ title, children }) => (
  <div className="sp-section">
    <div className="sp-sec-title">{title}</div>
    <div className="sp-sec-body">{children}</div>
  </div>
)

const Toggle = ({ label, desc, value, onChange }) => (
  <label className="sp-toggle">
    <div className="sp-toggle-info">
      <span className="sp-label">{label}</span>
      {desc && <span className="sp-desc">{desc}</span>}
    </div>
    <div className={`sp-track ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
      <div className="sp-thumb" />
    </div>
  </label>
)

const Field = ({ label, desc, children }) => (
  <div className="sp-field">
    <div className="sp-toggle-info">
      <span className="sp-label">{label}</span>
      {desc && <span className="sp-desc">{desc}</span>}
    </div>
    {children}
  </div>
)

const TABS = [
  { id: 'privacy', label: 'Privasi' },
  { id: 'adblock', label: 'Pemblokir' },
  { id: 'network', label: 'Jaringan' },
  { id: 'ai', label: 'AI & API' },
  { id: 'appearance', label: 'Tampilan' },
  { id: 'shortcuts', label: 'Pintasan' },
  { id: 'about', label: 'Tentang' },
]

export default function SettingsPanel({ settings, onClose, onChange, blockedCount, onResetBlockedCount }) {
  const [tab, setTab] = useState('privacy')
  const [msg, setMsg] = useState('')
  const [routerProviders, setRouterProviders] = useState([])
  const [routerForm, setRouterForm] = useState({ id: '9router', name: '9Router', baseUrl: 'http://127.0.0.1:20128/v1', key: '', model: 'auto' })
  const [routerBusy, setRouterBusy] = useState(false)

  useEffect(() => {
    if (tab !== 'ai') return
    window.kuroAPI?.ai?.vault?.list?.().then(setRouterProviders).catch(() => {})
  }, [tab])

  const saveRouter = async () => {
    setRouterBusy(true)
    try {
      const r = await window.kuroAPI?.ai?.vault?.set?.(routerForm)
      if (r?.ok) {
        setRouterProviders(await window.kuroAPI.ai.vault.list())
        setRouterForm(v => ({ ...v, key: '' }))
        setMsg('Provider API tersimpan secara terenkripsi.')
      } else setMsg(r?.error || 'Gagal menyimpan provider API.')
    } finally { setRouterBusy(false); setTimeout(() => setMsg(''), 3000) }
  }

  const testRouter = async id => {
    setRouterBusy(true)
    try {
      const r = await window.kuroAPI?.ai?.vault?.test?.(id)
      setMsg(r?.ok ? `Tes berhasil • HTTP ${r.status} • ${r.latencyMs}ms` : `Tes gagal • ${r?.error || r?.detail || 'endpoint menolak permintaan'}`)
    } finally { setRouterBusy(false); setTimeout(() => setMsg(''), 4000) }
  }

  if (!settings) return null

  const clear = async types => {
    if (window.kuroAPI) { await window.kuroAPI.privacy.clearData(types); setMsg('Data berhasil dihapus!') }
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div className="sp-overlay">
      <div className="sp-panel">
        <div className="sp-header">
          <div className="sp-brand">
            <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
              <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#e53535" strokeWidth="6" />
              <circle cx="50" cy="50" r="12" fill="#e53535" />
            </svg>
            <span className="sp-title">Pengaturan Kuro Akira</span>
          </div>
          <button className="sp-close" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" /><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" /></svg>
          </button>
        </div>

        <div className="sp-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`sp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="sp-content">
          {/* === Privasi === */}
          {tab === 'privacy' && <>
            <Sec title="Level Privasi">
              <div className="sp-priv-cards">
                {[
                  { id: 'standard', label: 'Standar', desc: 'Perlindungan dasar', color: 'var(--green)' },
                  { id: 'high', label: 'Tinggi', desc: 'Hapus referrer, header DNT', color: 'var(--silver)' },
                  { id: 'paranoid', label: 'Maksimal', desc: 'Hapus semua saat keluar', color: 'var(--red-main)' },
                ].map(lv => (
                  <div
                    key={lv.id}
                    className={`sp-priv-card ${settings.privacyLevel === lv.id ? 'sel' : ''}`}
                    onClick={() => onChange('privacyLevel', lv.id)}
                  >
                    <div className="sp-priv-dot" style={{ background: lv.color }} />
                    <div className="sp-priv-name">{lv.label}</div>
                    <div className="sp-priv-desc">{lv.desc}</div>
                  </div>
                ))}
              </div>
            </Sec>

            <Sec title="Anti-Fingerprinting">
              <Toggle label="Aktifkan Anti-Fingerprinting"
                desc="Samarkan canvas, ukuran layar, CPU, memori untuk mencegah pelacakan"
                value={settings.fingerprintProtection !== false}
                onChange={v => onChange('fingerprintProtection', v)} />
            </Sec>

            <Sec title="User-Agent">
              <Field label="Rotasi User-Agent" desc="Acak atau samarkan string User-Agent browser">
                <select className="sp-select" value={settings.userAgent || 'random'} onChange={e => onChange('userAgent', e.target.value)}>
                  <option value="random">Acak (disarankan)</option>
                  <option value="chrome">Chrome 126 Windows</option>
                  <option value="firefox">Firefox 127 Windows</option>
                  <option value="custom">Kustom</option>
                </select>
              </Field>
              {settings.userAgent === 'custom' && (
                <input className="sp-input" placeholder="Masukkan User-Agent kustom..." value={settings.customUserAgent || ''} onChange={e => onChange('customUserAgent', e.target.value)} />
              )}
            </Sec>

            <Sec title="Hapus Data Penelusuran">
              <div className="sp-clear-btns">
                <button className="sp-clear-btn" onClick={() => clear(['cookies'])}>Hapus Kuki</button>
                <button className="sp-clear-btn" onClick={() => clear(['cache'])}>Hapus Cache</button>
                <button className="sp-clear-btn" onClick={() => clear(['storage'])}>Hapus Penyimpanan</button>
                <button className="sp-clear-btn danger" onClick={() => clear(['cookies', 'cache', 'storage'])}>Hapus Semua</button>
              </div>
              {msg && <p className="sp-msg">{msg}</p>}
            </Sec>
          </>}

          {/* === Pemblokir === */}
          {tab === 'adblock' && <>
            <Sec title="Pemblokir Iklan">
              <Toggle label="Aktifkan Pemblokir Iklan"
                desc="Blokir iklan, pelacak, dan skrip berbahaya menggunakan daftar filter"
                value={settings.adBlockEnabled !== false}
                onChange={v => onChange('adBlockEnabled', v)} />
            </Sec>
            <Sec title="Statistik Pemblokiran">
              <div className="sp-stat-card">
                <div className="sp-stat-num">{blockedCount.toLocaleString('id')}</div>
                <div className="sp-stat-lbl">Iklan & Pelacak Diblokir</div>
                <button className="sp-clear-btn" onClick={onResetBlockedCount}>Reset Penghitung</button>
              </div>
            </Sec>
            <Sec title="Daftar Filter Aktif">
              {['EasyList (Iklan)', 'EasyPrivacy (Pelacak)', 'Google Ads', 'Facebook Pixel', 'DoubleClick', 'Taboola', 'Outbrain', 'Criteo', 'Hotjar', 'Google Analytics', 'Koin Kripto Miners', 'dan 100+ jaringan lainnya'].map(f => (
                <div key={f} className="sp-filter-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {f}
                </div>
              ))}
            </Sec>
          </>}

          {/* === Jaringan === */}
          {tab === 'network' && <>
            <Sec title="Jaringan Tor">
              <Toggle label="Gunakan Jaringan Tor"
                desc="Arahkan semua lalu lintas melalui Tor untuk anonimitas (perlu Tor berjalan)"
                value={settings.useTor || false}
                onChange={v => onChange('useTor', v)} />
              {settings.useTor && (
                <div className="sp-tor-cfg">
                  <Field label="Host Tor">
                    <input className="sp-input sm" value={settings.torHost || '127.0.0.1'} onChange={e => onChange('torHost', e.target.value)} />
                  </Field>
                  <Field label="Port Tor">
                    <input className="sp-input sm" type="number" value={settings.torPort || 9050} onChange={e => onChange('torPort', parseInt(e.target.value))} />
                  </Field>
                  <p className="sp-note">Unduh Tor Browser dari <a href="#" onClick={() => window.kuroAPI?.shell.openExternal('https://www.torproject.org')}>torproject.org</a></p>
                </div>
              )}
            </Sec>

            <Sec title="Penelusuran .onion">
              <Toggle label="Aktifkan Akses Situs Onion"
                desc="Izinkan penelusuran situs .onion melalui jaringan Tor"
                value={settings.onionEnabled || false}
                onChange={v => onChange('onionEnabled', v)} />
            </Sec>
          </>}

          {/* === AI & API Keys === */}
          {tab === 'ai' && <>
            <Sec title="Router AI / API Key">
              <Field label="Preset">
                <select className="sp-select" value="" onChange={e => {
                  if (e.target.value === '9router-local') setRouterForm(v => ({ ...v, id: '9router', name: '9Router', baseUrl: 'http://127.0.0.1:20128/v1', model: 'auto' }))
                  if (e.target.value === '9router-cloud') setRouterForm(v => ({ ...v, id: '9router-cloud', name: '9Router Cloud', baseUrl: 'https://9router.com/v1', model: 'auto' }))
                }}>
                  <option value="">Pilih preset atau isi manual</option>
                  <option value="9router-local">9Router lokal — 127.0.0.1:20128/v1</option>
                  <option value="9router-cloud">9Router Cloud — 9router.com/v1</option>
                </select>
              </Field>
              <Field label="Nama Provider" desc="Nama yang tampil di Kuro AI dan terminal">
                <input className="sp-input" value={routerForm.name} onChange={e => setRouterForm(v => ({ ...v, name: e.target.value }))} />
              </Field>
              <Field label="Base URL" desc="Harus HTTPS, kecuali endpoint lokal">
                <input className="sp-input" value={routerForm.baseUrl} onChange={e => setRouterForm(v => ({ ...v, baseUrl: e.target.value }))} placeholder="https://contoh.com/v1" />
              </Field>
              <Field label="API Key" desc="Kunci disimpan oleh proses utama Electron, bukan localStorage renderer">
                <input className="sp-input" type="password" value={routerForm.key} onChange={e => setRouterForm(v => ({ ...v, key: e.target.value }))} placeholder="Masukkan API key..." autoComplete="off" />
              </Field>
              <Field label="Model" desc="Gunakan ID model dari router; bisa 'auto' jika router mendukung">
                <input className="sp-input" value={routerForm.model} onChange={e => setRouterForm(v => ({ ...v, model: e.target.value }))} />
              </Field>
              <button className="sp-clear-btn" disabled={routerBusy || !routerForm.key} onClick={saveRouter}>{routerBusy ? 'Memproses...' : 'Simpan Provider'}</button>
              {routerProviders.length > 0 && <div style={{ marginTop: 10 }}>
                {routerProviders.map(p => <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <div className="sp-label">{p.name}</div>
                    <div className="sp-desc">{p.baseUrl} • {p.model} • {p.encrypted ? 'Key terenkripsi' : 'Key lokal'}</div>
                  </div>
                  <div style={{ display:'flex', gap:5 }}>
                    <button className="sp-clear-btn" disabled={routerBusy} onClick={() => testRouter(p.id)}>Tes</button>
                    <button className="sp-clear-btn danger" disabled={routerBusy} onClick={async () => { await window.kuroAPI.ai.vault.delete(p.id); setRouterProviders(await window.kuroAPI.ai.vault.list()) }}>Hapus</button>
                  </div>
                </div>)}
              </div>}
              <p className="sp-note" style={{ marginTop: 10 }}>Catatan: Kuro tidak memberikan API key gratis. Kamu memasukkan key dari layanan yang kamu punya/izinkan. 9Router mendukung endpoint OpenAI-compatible. </p>
            </Sec>

            <Sec title="Kuro AI — Sumber Model">
              <Field label="Sumber AI Utama" desc="Pilih backend yang digunakan Kuro AI">
                <select
                  className="sp-select"
                  value={settings.aiProvider || 'pollinations'}
                  onChange={e => onChange('aiProvider', e.target.value)}
                >
                  <option value="pollinations">Pollinations.ai (Gratis, tanpa API key)</option>
                  <option value="openai">OpenAI (GPT-4o / GPT-4-turbo)</option>
                  <option value="gemini">Google Gemini (gemini-1.5-flash)</option>
                  <option value="groq">Groq (Llama3, Mixtral — sangat cepat)</option>
                  <option value="openrouter">OpenRouter (100+ model)</option>
                </select>
              </Field>
            </Sec>

            {(settings.aiProvider === 'openai' || !settings.aiProvider || settings.aiProvider === 'pollinations') && (
              <Sec title="OpenAI API Key">
                <Field label="API Key" desc="Diperoleh dari platform.openai.com/api-keys">
                  <div className="sp-api-row">
                    <input
                      className="sp-input"
                      type="password"
                      placeholder="sk-..."
                      value={settings.openaiKey || ''}
                      onChange={e => onChange('openaiKey', e.target.value)}
                      autoComplete="off"
                    />
                    {settings.openaiKey && (
                      <span className="sp-api-ok">✓ Tersimpan</span>
                    )}
                  </div>
                </Field>
                <Field label="Model OpenAI" desc="Model yang digunakan saat aiProvider = openai">
                  <select
                    className="sp-select"
                    value={settings.openaiModel || 'gpt-4o-mini'}
                    onChange={e => onChange('openaiModel', e.target.value)}
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (cepat & hemat)</option>
                    <option value="gpt-4o">gpt-4o (pintar)</option>
                    <option value="gpt-4-turbo">gpt-4-turbo</option>
                    <option value="gpt-3.5-turbo">gpt-3.5-turbo (paling hemat)</option>
                  </select>
                </Field>
              </Sec>
            )}

            {settings.aiProvider === 'gemini' && (
              <Sec title="Google Gemini API Key">
                <Field label="API Key" desc="Diperoleh dari aistudio.google.com/app/apikey">
                  <div className="sp-api-row">
                    <input
                      className="sp-input"
                      type="password"
                      placeholder="AIza..."
                      value={settings.geminiKey || ''}
                      onChange={e => onChange('geminiKey', e.target.value)}
                      autoComplete="off"
                    />
                    {settings.geminiKey && <span className="sp-api-ok">✓ Tersimpan</span>}
                  </div>
                </Field>
                <Field label="Model Gemini">
                  <select
                    className="sp-select"
                    value={settings.geminiModel || 'gemini-1.5-flash'}
                    onChange={e => onChange('geminiModel', e.target.value)}
                  >
                    <option value="gemini-1.5-flash">gemini-1.5-flash (gratis tier)</option>
                    <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                    <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                  </select>
                </Field>
              </Sec>
            )}

            {settings.aiProvider === 'groq' && (
              <Sec title="Groq API Key">
                <Field label="API Key" desc="Diperoleh dari console.groq.com/keys">
                  <div className="sp-api-row">
                    <input
                      className="sp-input"
                      type="password"
                      placeholder="gsk_..."
                      value={settings.groqKey || ''}
                      onChange={e => onChange('groqKey', e.target.value)}
                      autoComplete="off"
                    />
                    {settings.groqKey && <span className="sp-api-ok">✓ Tersimpan</span>}
                  </div>
                </Field>
                <Field label="Model Groq">
                  <select
                    className="sp-select"
                    value={settings.groqModel || 'llama3-8b-8192'}
                    onChange={e => onChange('groqModel', e.target.value)}
                  >
                    <option value="llama3-8b-8192">llama3-8b (cepat)</option>
                    <option value="llama3-70b-8192">llama3-70b (pintar)</option>
                    <option value="mixtral-8x7b-32768">mixtral-8x7b</option>
                    <option value="gemma2-9b-it">gemma2-9b</option>
                  </select>
                </Field>
              </Sec>
            )}

            {settings.aiProvider === 'openrouter' && (
              <Sec title="OpenRouter API Key">
                <Field label="API Key" desc="Diperoleh dari openrouter.ai/keys">
                  <div className="sp-api-row">
                    <input
                      className="sp-input"
                      type="password"
                      placeholder="sk-or-..."
                      value={settings.openrouterKey || ''}
                      onChange={e => onChange('openrouterKey', e.target.value)}
                      autoComplete="off"
                    />
                    {settings.openrouterKey && <span className="sp-api-ok">✓ Tersimpan</span>}
                  </div>
                </Field>
                <Field label="Model ID" desc="Contoh: meta-llama/llama-3-8b-instruct">
                  <input
                    className="sp-input"
                    placeholder="meta-llama/llama-3-8b-instruct"
                    value={settings.openrouterModel || ''}
                    onChange={e => onChange('openrouterModel', e.target.value)}
                  />
                </Field>
              </Sec>
            )}

            <Sec title="Catatan Keamanan">
              <p className="sp-note" style={{ color: 'var(--text-muted)', fontSize: '11px', lineHeight: '1.6' }}>
                API key disimpan secara lokal di perangkat ini menggunakan electron-store. Key tidak pernah dikirim ke server Kuro Akira — hanya dikirim langsung ke provider AI yang kamu pilih.
              </p>
            </Sec>
          </>}

          {/* === Pintasan Keyboard === */}
          {tab === 'shortcuts' && (
            <div className="sp-shortcuts">
              {[
                {
                  group: 'Tab & Navigasi', items: [
                    { key: 'Ctrl+T', desc: 'Tab baru' },
                    { key: 'Ctrl+W', desc: 'Tutup tab' },
                    { key: 'Ctrl+N', desc: 'Jendela baru' },
                    { key: 'Ctrl+Shift+N', desc: 'Tab Onion/Tor' },
                    { key: 'Ctrl+R', desc: 'Muat ulang' },
                    { key: 'Ctrl+L', desc: 'Fokus address bar' },
                  ]
                },
                {
                  group: 'Tampilan', items: [
                    { key: 'F11', desc: 'Layar penuh / keluar' },
                    { key: 'Ctrl+=', desc: 'Perbesar' },
                    { key: 'Ctrl+-', desc: 'Perkecil' },
                    { key: 'Ctrl+0', desc: 'Reset zoom' },
                    { key: 'F12', desc: 'Terminal' },
                  ]
                },
                {
                  group: 'Panel & Fitur', items: [
                    { key: 'Ctrl+F', desc: 'Cari di halaman' },
                    { key: 'Ctrl+,', desc: 'Pengaturan' },
                    { key: 'Ctrl+Shift+B', desc: 'Panel Penanda' },
                    { key: 'Ctrl+Shift+H', desc: 'Panel Riwayat' },
                    { key: 'Ctrl+Shift+A', desc: 'Panel Kuro AI' },
                  ]
                },
              ].map(group => (
                <div key={group.group} className="sp-shortcut-group">
                  <div className="sp-shortcut-group-title">{group.group}</div>
                  {group.items.map(item => (
                    <div key={item.key} className="sp-shortcut-row">
                      <span className="sp-shortcut-desc">{item.desc}</span>
                      <kbd className="sp-kbd">{item.key}</kbd>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* === Tampilan === */}
          {tab === 'appearance' && <>
            <Sec title="Tema Warna">
              <div className="sp-themes">
                {[
                  { id: 'dark', label: 'Gelap Standar', bg: '#141414' },
                  { id: 'darker', label: 'Gelap Pekat', bg: '#050508' },
                  { id: 'gray', label: 'Abu-abu', bg: '#1e1e1e' },
                ].map(th => (
                  <div key={th.id} className={`sp-theme-card ${settings.theme === th.id ? 'sel' : ''}`} onClick={() => onChange('theme', th.id)}>
                    <div className="sp-theme-prev" style={{ background: th.bg }} />
                    <span>{th.label}</span>
                  </div>
                ))}
              </div>
            </Sec>
          </>}

          {/* === Tentang === */}
          {tab === 'about' && (
            <div className="sp-about">
              <svg width="56" height="56" viewBox="0 0 100 100" fill="none">
                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="none" stroke="#e53535" strokeWidth="5" />
                <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="none" stroke="rgba(229,53,53,.4)" strokeWidth="2" />
                <circle cx="50" cy="50" r="14" fill="#e53535" />
                <circle cx="50" cy="50" r="6" fill="#fff" />
              </svg>
              <h2 className="sp-about-name">Kuro Akira Browser</h2>
              <p className="sp-about-ver">Versi 2.6.0</p>
              <p className="sp-about-desc">Browser pribadi yang cepat, aman, dan penuh kendali. Dibangun dengan Electron + React.</p>
              <div className="sp-about-feats">
                {['Pemblokir Iklan & Pelacak', 'Anti-Fingerprinting', 'Dukungan Tor & Onion', 'KuroSearch (Mesin Pencari Sendiri)', 'Asisten AI Gratis', 'Multi-Profil & Akun Tak Terbatas', 'Terminal Terintegrasi', 'Manajemen Penanda', 'Antarmuka Bahasa Indonesia'].map(f => (
                  <div key={f} className="sp-about-feat">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
              <button className="sp-clear-btn" onClick={() => window.kuroAPI?.shell.openExternal('https://github.com/rizki-habibi/kuro-akira-browser')}>
                Lihat di GitHub
              </button>
              <button
                className="sp-clear-btn"
                style={{ marginTop: '4px' }}
                onClick={async () => {
                  setMsg('Memeriksa pembaruan...')
                  await window.kuroAPI?.updater.check()
                  setTimeout(() => setMsg(''), 8000)
                }}
              >
                🔄 Cek Pembaruan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
