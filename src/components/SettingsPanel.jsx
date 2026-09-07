import React, { useState } from 'react'
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
  { id: 'appearance', label: 'Tampilan' },
  { id: 'about', label: 'Tentang' },
]

export default function SettingsPanel({ settings, onClose, onChange, blockedCount, onResetBlockedCount }) {
  const [tab, setTab] = useState('privacy')
  const [msg, setMsg] = useState('')

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
              <p className="sp-about-ver">Versi 2.0.0</p>
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
              <button className="sp-clear-btn" onClick={() => window.kuroAPI?.shell.openExternal('https://github.com/kuro-akira/kuro-akira-browser')}>
                Lihat di GitHub
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
