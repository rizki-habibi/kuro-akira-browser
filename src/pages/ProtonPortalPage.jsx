import React, { useState, useEffect } from 'react'
import './ProtonPortalPage.css'

export default function ProtonPortalPage({ containerId = 'proton-1', onOpenTabWithContainer, onNavigate }) {
  const [container, setContainer] = useState(null)
  const [cookies, setCookies] = useState([])
  const [selectedFolder, setSelectedFolder] = useState('inbox')
  const [selectedMailIndex, setSelectedMailIndex] = useState(0)
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [isComposing, setIsComposing] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sentNotice, setSentNotice] = useState(false)

  const loadContainerData = async () => {
    if (window.kuroAPI?.containers) {
      const c = await window.kuroAPI.containers.get(containerId)
      setContainer(c)
      const cks = await window.kuroAPI.containers.getCookies(containerId)
      setCookies(cks)
    }
  }

  useEffect(() => {
    loadContainerData()
  }, [containerId])

  const authUserCookie = cookies.find(k => k.name === 'AUTH_USER')?.value
  const sessionTokenCookie = cookies.find(k => k.name === 'SessionToken')?.value

  // Pre-configured mails based on logged in user
  const getMails = () => {
    if (authUserCookie?.includes('alice')) {
      return [
        {
          id: 1,
          sender: 'Proton Security Team <security@proton.me>',
          time: '10:42',
          subject: '🛡️ Kunci Enkripsi PGP 4096-bit Terverifikasi',
          body: `Halo Alice,\n\nAkun Proton Anda aman di server Swiss. Koneksi sesi ini aktif melalui rute Virtual IP: ${container?.ip || '185.70.41.12'} (${container?.city || 'Zurich'}, ${container?.country || 'Switzerland'}).\n\nKukis sesi container Anda terisolasi sempurna dari tab Kuro Akira Browser lainnya. Anda dapat membuka akun Proton Bob atau akun lain tanpa takut sesi saling menimpa.`
        },
        {
          id: 2,
          sender: 'Swiss Privacy Foundation <notify@privacy.ch>',
          time: 'Kemarin',
          subject: '🇨🇭 Privasi Tingkat Tinggi di Yurisdiksi Swiss',
          body: `Perlindungan data Anda diatur oleh Undang-Undang Federal Swiss (FADP) dan konstitusi netralitas. Kuro Akira Browser memastikan jejak digital dan fingerprint browser Anda disamarkan.`
        },
        {
          id: 3,
          sender: 'Kuro Akira Core <update@kuroakira.dev>',
          time: '12 Sep',
          subject: 'Kuro Akira v2.6.1: Multi-Container Aktif',
          body: `Fitur Multi-Container dengan Kukis & IP Terisolasi berhasil diterapkan!\n\nSetiap tab browser dapat menjalankan profil berbeda dengan IP negara yang berbeda sesuai kebutuhan Anda.`
        }
      ]
    } else if (authUserCookie?.includes('bob')) {
      return [
        {
          id: 1,
          sender: 'Bob Crypto Vault <treasury@bob.crypto>',
          time: '09:15',
          subject: '🚀 Konfirmasi Akses dari Sesi Amsterdam',
          body: `Halo Bob,\n\nSesi aktif terdeteksi dari IP: ${container?.ip || '194.126.177.8'} (${container?.country || 'Netherlands'}). Cookie sesi Anda (AUTH_USER: bob.crypto@proton.me) beroperasi secara independen dari Akun Alice di tab lain.`
        },
        {
          id: 2,
          sender: 'Proton Mail Support <support@proton.me>',
          time: '08 Sep',
          subject: '🔐 Kunci Pemulihan Enkripsi Telah Dibuat',
          body: `Kunci pemulihan 256-bit Anda telah diamankan. Pastikan Anda tidak membagikan kunci ini kepada siapa pun.`
        }
      ]
    } else if (authUserCookie) {
      return [
        {
          id: 1,
          sender: 'Proton Mail Welcome <welcome@proton.me>',
          time: 'Baru saja',
          subject: `Selamat datang di Proton, ${authUserCookie}!`,
          body: `Halo ${authUserCookie},\n\nAkun baru Anda berhasil didaftarkan dengan sesi container terisolasi pada IP: ${container?.ip} (${container?.country}).\n\nKukis sesi dan token enkripsi Anda tersimpan di container ini.`
        }
      ]
    }
    return []
  }

  const mails = getMails()
  const activeMail = mails[selectedMailIndex] || mails[0]

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regUsername.trim()) return

    const email = regUsername.trim().includes('@') ? regUsername.trim() : `${regUsername.trim()}@proton.me`
    const token = 'pro_sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36)

    if (window.kuroAPI?.containers && container) {
      await window.kuroAPI.containers.setCookie(container.id, {
        name: 'AUTH_USER',
        value: email,
        domain: 'proton.me'
      })
      await window.kuroAPI.containers.setCookie(container.id, {
        name: 'SessionToken',
        value: token,
        domain: 'proton.me'
      })
      await window.kuroAPI.containers.update(container.id, {
        name: `Akun Proton (${email.split('@')[0]})`
      })
      await loadContainerData()
    }
  }

  const handleLogout = async () => {
    if (window.kuroAPI?.containers && container) {
      await window.kuroAPI.containers.deleteCookie(container.id, 'AUTH_USER', 'proton.me')
      await window.kuroAPI.containers.deleteCookie(container.id, 'SessionToken', 'proton.me')
      await loadContainerData()
    }
  }

  const handleRotateIP = async () => {
    if (window.kuroAPI?.containers && container) {
      await window.kuroAPI.containers.rotateIP(container.id)
      await loadContainerData()
    }
  }

  const handleSendMail = (e) => {
    e.preventDefault()
    setIsComposing(false)
    setSentNotice(true)
    setTimeout(() => setSentNotice(false), 3000)
    setComposeTo('')
    setComposeSubject('')
    setComposeBody('')
  }

  return (
    <div className="proton-portal">
      {/* Header bar */}
      <div className="proton-header">
        <div className="proton-logo-area">
          <div className="proton-logo">
            <div className="proton-icon-badge">P</div>
            <span>Proton Mail</span>
          </div>
          <span className="proton-sec-tag">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            End-to-End Encrypted (Swiss)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {authUserCookie && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>{authUserCookie}</span>
              <button
                onClick={handleLogout}
                style={{ background: '#262630', border: '1px solid rgba(255,255,255,0.1)', color: '#f87171', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                title="Hapus kukis sesi di container ini"
              >
                Logout (Hapus Kukis)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Container & IP Diagnostic Banner */}
      <div className="proton-container-banner">
        <div className="proton-diag-pill">
          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: container?.color || '#4caf50' }} />
          <strong>Profil Container:</strong>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{container?.name || 'Loading...'}</span>
          <span>•</span>
          <span>Virtual IP:</span>
          <span className="proton-ip-badge">{container?.flag} {container?.ip}</span>
          <button
            onClick={handleRotateIP}
            style={{ background: '#262633', border: 'none', color: '#93c5fd', padding: '2px 6px', borderRadius: '4px', fontSize: '10.5px', cursor: 'pointer' }}
            title="Ganti ke IP baru di negara ini"
          >
            🔄 Ganti IP
          </button>
          <span>•</span>
          <span>Kukis:</span>
          <span className="proton-cookie-badge">{cookies.length} item aktif</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onOpenTabWithContainer && onOpenTabWithContainer('kuro://proton', 'proton-1')}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Tab Akun #1 (Alice)
          </button>
          <button
            onClick={() => onOpenTabWithContainer && onOpenTabWithContainer('kuro://proton', 'proton-2')}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            Tab Akun #2 (Bob)
          </button>
          <button
            onClick={() => onOpenTabWithContainer && onOpenTabWithContainer('kuro://proton', 'proton-fresh')}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#f59e0b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
          >
            + Tab Kukis Bersih
          </button>
        </div>
      </div>

      {sentNotice && (
        <div style={{ background: '#10b981', color: '#ffffff', padding: '8px 16px', fontSize: '12px', textAlign: 'center', fontWeight: 600 }}>
          ✓ Pesan terenkripsi PGP berhasil dikirim dari IP {container?.ip}!
        </div>
      )}

      {/* Main Mailbox View (if logged in) OR Clean Registration (if no auth cookie) */}
      <div className="proton-body">
        {authUserCookie ? (
          <>
            {/* Sidebar */}
            <div className="proton-sidebar">
              <button className="proton-compose-btn" onClick={() => setIsComposing(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Pesan Baru
              </button>

              <button className={`proton-nav-item ${selectedFolder === 'inbox' ? 'active' : ''}`} onClick={() => setSelectedFolder('inbox')}>
                <span>Kotak Masuk</span>
                <span style={{ fontSize: '11px', background: '#6d4aff', color: 'white', padding: '1px 6px', borderRadius: '99px' }}>{mails.length}</span>
              </button>

              <button className={`proton-nav-item ${selectedFolder === 'starred' ? 'active' : ''}`} onClick={() => setSelectedFolder('starred')}>
                <span>Berbintang</span>
              </button>

              <button className={`proton-nav-item ${selectedFolder === 'sent' ? 'active' : ''}`} onClick={() => setSelectedFolder('sent')}>
                <span>Terkirim</span>
              </button>

              <button className={`proton-nav-item ${selectedFolder === 'drafts' ? 'active' : ''}`} onClick={() => setSelectedFolder('drafts')}>
                <span>Draf</span>
              </button>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />

              <div style={{ padding: '8px 10px', fontSize: '11px', color: '#64748b' }}>
                <div><strong>Kukis Sesi Aktif:</strong></div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#94a3b8', marginTop: '4px', wordBreak: 'break-all' }}>
                  AUTH_USER: {authUserCookie}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#94a3b8', marginTop: '2px', wordBreak: 'break-all' }}>
                  Token: {sessionTokenCookie ? sessionTokenCookie.substring(0, 16) + '...' : 'none'}
                </div>
              </div>
            </div>

            {/* Inbox List */}
            <div className="proton-inbox-list">
              <div className="proton-inbox-header">
                <span>Kotak Masuk ({mails.length})</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>PGP Aktif</span>
              </div>

              {mails.map((m, idx) => (
                <div
                  key={m.id}
                  className={`proton-mail-item ${selectedMailIndex === idx ? 'selected' : ''}`}
                  onClick={() => setSelectedMailIndex(idx)}
                >
                  <div className="pmail-sender">
                    <span>{m.sender.split('<')[0]}</span>
                    <span className="pmail-time">{m.time}</span>
                  </div>
                  <div className="pmail-subject">{m.subject}</div>
                  <div className="pmail-preview">{m.body.substring(0, 70)}...</div>
                </div>
              ))}
            </div>

            {/* Email View */}
            <div className="proton-mail-view">
              {activeMail ? (
                <>
                  <div className="pview-header">
                    <h2 className="pview-title">{activeMail.subject}</h2>
                    <div className="pview-meta">
                      <div>
                        <strong>Dari:</strong> {activeMail.sender}
                      </div>
                      <div>{activeMail.time}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Tanda tangan digital PGP valid • Terenkripsi end-to-end dengan kunci sesi container
                    </div>
                  </div>

                  <div className="pview-body">
                    {activeMail.body}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', color: '#64748b', marginTop: '60px' }}>Pilih email untuk membaca</div>
              )}
            </div>
          </>
        ) : (
          /* Registration Form for Fresh / Clean Container */
          <div className="proton-reg-container">
            <div className="proton-reg-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '20px' }}>🛡️</span>
                <h1 className="reg-title">Buat Akun Proton Baru</h1>
              </div>
              <p className="reg-subtitle">
                Anda berada di profil <strong>{container?.name}</strong> dengan Virtual IP <strong>{container?.ip} ({container?.country})</strong>. Cookie jar container ini saat ini <strong>bersih (kosong)</strong>, siap digunakan untuk mendaftarkan akun baru tanpa terhubung ke akun lain.
              </p>

              <form onSubmit={handleRegister}>
                <div className="reg-field">
                  <label className="reg-label">Nama Pengguna Proton:</label>
                  <div className="reg-input-group">
                    <input
                      className="reg-input"
                      placeholder="pilih-nama-pengguna"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
                      required
                    />
                    <div className="reg-suffix">@proton.me</div>
                  </div>
                </div>

                <div className="reg-field">
                  <label className="reg-label">Kata Sandi:</label>
                  <div className="reg-input-group">
                    <input
                      className="reg-input"
                      type="password"
                      placeholder="••••••••••••"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ background: '#14141d', padding: '10px 12px', borderRadius: '6px', fontSize: '11.5px', color: '#94a3b8', margin: '14px 0', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div><strong>🔒 Keamanan Multi-Container:</strong></div>
                  <div>• IP Pendaftaran: <code>{container?.ip}</code> ({container?.country})</div>
                  <div>• Cookie Jar: Terisolasi (tidak dapat dibaca oleh tab lain)</div>
                  <div>• Kunci Enkripsi: Otomatis dibuat secara lokal</div>
                </div>

                <button type="submit" className="reg-submit-btn">
                  Buat Akun & Masuk Sekarang
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {isComposing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: '520px', background: '#1b1b24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#232330', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Pesan Terenkripsi Baru</span>
              <button onClick={() => setIsComposing(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>

            <form onSubmit={handleSendMail} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                placeholder="Kepada (misal: bob.crypto@proton.me)"
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                required
                style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 12px', color: 'white', fontSize: '12.5px', outline: 'none' }}
              />
              <input
                placeholder="Subjek"
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                required
                style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 12px', color: 'white', fontSize: '12.5px', outline: 'none' }}
              />
              <textarea
                placeholder="Tulis pesan Anda..."
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                rows={6}
                required
                style={{ background: '#13131a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '8px 12px', color: 'white', fontSize: '12.5px', outline: 'none', resize: 'vertical' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" onClick={() => setIsComposing(false)} style={{ background: '#262630', border: 'none', color: '#94a3b8', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" style={{ background: '#6d4aff', border: 'none', color: 'white', padding: '8px 18px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  Kirim (PGP Encrypted)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
