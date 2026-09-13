import React, { useState, useEffect } from 'react'
import './ContainerPanel.css'

export default function ContainerPanel({ onClose, activeContainerId, onSelectContainer, onOpenTabWithContainer, onNavigate }) {
  const [containers, setContainers] = useState([])
  const [viewTab, setViewTab] = useState('list') // 'list' | 'cookies' | 'create'
  const [selectedContId, setSelectedContId] = useState(activeContainerId || 'proton-1')
  const [newContName, setNewContName] = useState('')
  const [newContCountry, setNewContCountry] = useState('Switzerland')
  const [newContColor, setNewContColor] = useState('#4caf50')
  const [cookieForm, setCookieForm] = useState({ name: '', value: '', domain: 'proton.me' })
  const [copiedId, setCopiedId] = useState(null)

  const reloadContainers = async () => {
    if (window.kuroAPI?.containers) {
      const list = await window.kuroAPI.containers.getAll()
      setContainers(list)
    }
  }

  useEffect(() => {
    reloadContainers()
  }, [])

  useEffect(() => {
    if (activeContainerId) setSelectedContId(activeContainerId)
  }, [activeContainerId])

  const selectedContainer = containers.find(c => c.id === selectedContId) || containers[0]

  const handleRotateIP = async (id) => {
    if (window.kuroAPI?.containers) {
      const newIP = await window.kuroAPI.containers.rotateIP(id)
      await reloadContainers()
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    }
  }

  const handleCreateContainer = async (e) => {
    e.preventDefault()
    if (!newContName.trim()) return
    if (window.kuroAPI?.containers) {
      const created = await window.kuroAPI.containers.create({
        name: newContName.trim(),
        country: newContCountry,
        color: newContColor
      })
      await reloadContainers()
      setSelectedContId(created.id)
      setViewTab('list')
      setNewContName('')
    }
  }

  const handleAddCookie = async (e) => {
    e.preventDefault()
    if (!cookieForm.name.trim() || !selectedContainer) return
    if (window.kuroAPI?.containers) {
      await window.kuroAPI.containers.setCookie(selectedContainer.id, {
        name: cookieForm.name.trim(),
        value: cookieForm.value.trim(),
        domain: cookieForm.domain.trim() || 'all'
      })
      await reloadContainers()
      setCookieForm({ name: '', value: '', domain: 'proton.me' })
    }
  }

  const handleDeleteCookie = async (cookieName, domain) => {
    if (window.kuroAPI?.containers && selectedContainer) {
      await window.kuroAPI.containers.deleteCookie(selectedContainer.id, cookieName, domain)
      await reloadContainers()
    }
  }

  const handleClearCookies = async (id) => {
    if (window.kuroAPI?.containers) {
      await window.kuroAPI.containers.clearCookies(id)
      await reloadContainers()
    }
  }

  const handleCloneContainer = async (id) => {
    if (window.kuroAPI?.containers) {
      const c = containers.find(x => x.id === id)
      const cloned = await window.kuroAPI.containers.cloneContainer(id, `${c?.name || 'Container'} (IP Baru)`)
      await reloadContainers()
      if (cloned) setSelectedContId(cloned.id)
    }
  }

  const handleOpenProton = (contId) => {
    if (onOpenTabWithContainer) {
      onOpenTabWithContainer('kuro://proton', contId)
    } else if (onNavigate) {
      onNavigate('kuro://proton')
    }
    if (onClose) onClose()
  }

  return (
    <div className="container-panel">
      {/* Header */}
      <div className="cp-header">
        <div className="cp-title-wrap">
          <span className="cp-title">Multi-Kukis & IP Container</span>
          <span className="cp-badge">{containers.length} Profil</span>
        </div>
        <button className="cp-close-btn" onClick={onClose} title="Tutup Panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="cp-tabs">
        <button className={`cp-tab-btn ${viewTab === 'list' ? 'active' : ''}`} onClick={() => setViewTab('list')}>
          Daftar Profil
        </button>
        <button className={`cp-tab-btn ${viewTab === 'cookies' ? 'active' : ''}`} onClick={() => setViewTab('cookies')}>
          Kelola Kukis ({selectedContainer?.cookies?.length || 0})
        </button>
        <button className={`cp-tab-btn ${viewTab === 'create' ? 'active' : ''}`} onClick={() => setViewTab('create')}>
          + Profil Baru
        </button>
      </div>

      {/* Body */}
      <div className="cp-body">
        {viewTab === 'list' && (
          <>
            <div className="cp-intro">
              Setiap container memiliki <strong>cookie jar terisolasi</strong> dan <strong>IP address virtual</strong> tersendiri. Anda dapat membuka beberapa akun (misal Proton #1, Proton #2, Proton #3) secara bersamaan tanpa saling menimpa.
            </div>

            <div className="cp-list">
              {containers.map(c => {
                const isActive = c.id === activeContainerId
                const isSelected = c.id === selectedContId
                return (
                  <div key={c.id} className={`cp-card ${isActive ? 'active' : ''}`}>
                    <div className="cp-card-top">
                      <div className="cp-card-name-group">
                        <span className="cp-color-dot" style={{ background: c.color }} />
                        <span className="cp-card-name">{c.name}</span>
                      </div>
                      {isActive && <span className="cp-active-tag">Tab Aktif</span>}
                    </div>

                    <div className="cp-card-details">
                      <div className="cp-detail-item">
                        <span className="cp-detail-label">Virtual IP:</span>
                        <span className="cp-detail-val">{c.flag} {c.ip}</span>
                      </div>
                      <div className="cp-detail-item">
                        <span className="cp-detail-label">Lokasi & ISP:</span>
                        <span className="cp-detail-val">{c.city} • {c.country}</span>
                      </div>
                      <div className="cp-detail-item">
                        <span className="cp-detail-label">Jumlah Kukis:</span>
                        <span className="cp-detail-val">{c.cookies?.length || 0} kukis aktif</span>
                      </div>
                      <div className="cp-detail-item">
                        <span className="cp-detail-label">Status Sesi:</span>
                        <span className="cp-detail-val" style={{ color: c.cookies?.length ? 'var(--green)' : 'var(--yellow)' }}>
                          {c.cookies?.length ? 'Sesi Tersimpan' : 'Kukis Bersih'}
                        </span>
                      </div>
                    </div>

                    <div className="cp-card-actions">
                      <button
                        className="cp-act-btn primary"
                        onClick={() => {
                          if (onOpenTabWithContainer) onOpenTabWithContainer('', c.id)
                          else if (onSelectContainer) onSelectContainer(c.id)
                        }}
                        title="Buka tab baru menggunakan container ini"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Buka Tab
                      </button>

                      <button
                        className="cp-act-btn green"
                        onClick={() => handleOpenProton(c.id)}
                        title="Buka portal akun Proton pada container ini"
                      >
                        🛡️ Buka Proton
                      </button>

                      <button
                        className="cp-act-btn"
                        onClick={() => handleRotateIP(c.id)}
                        title="Ganti ke IP baru di negara yang sama"
                      >
                        {copiedId === c.id ? '✓ IP Berganti!' : '🔄 Ganti IP'}
                      </button>

                      <button
                        className="cp-act-btn"
                        onClick={() => {
                          setSelectedContId(c.id)
                          setViewTab('cookies')
                        }}
                        title="Lihat dan edit kukis"
                      >
                        🍪 Kukis ({c.cookies?.length || 0})
                      </button>

                      <button
                        className="cp-act-btn"
                        onClick={() => handleCloneContainer(c.id)}
                        title="Gandakan profil ini dengan IP baru"
                      >
                        ⚡ Clone
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {viewTab === 'cookies' && (
          <div className="cp-cookie-view">
            <div className="cp-cookie-header">
              <div className="cp-cookie-selector">
                <span>Pilih Profil:</span>
                <select value={selectedContId} onChange={e => setSelectedContId(e.target.value)}>
                  {containers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.flag} {c.ip})</option>
                  ))}
                </select>
              </div>
              <button
                className="cp-act-btn"
                style={{ fontSize: '10px', color: 'var(--red-bright)' }}
                onClick={() => handleClearCookies(selectedContId)}
              >
                Hapus Semua
              </button>
            </div>

            <div className="cp-intro" style={{ padding: '8px 10px', fontSize: '11px' }}>
              Profil <strong>{selectedContainer?.name}</strong> menggunakan IP <strong>{selectedContainer?.ip}</strong> ({selectedContainer?.country}). Sesi web di container ini tersimpan dalam cookie jar di bawah ini.
            </div>

            {/* List Cookies */}
            <div className="cp-cookie-list">
              {(!selectedContainer?.cookies || selectedContainer.cookies.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '11.5px' }}>
                  Tidak ada kukis aktif pada container ini (Kukis Bersih / Clean Session).
                </div>
              ) : (
                selectedContainer.cookies.map((k, i) => (
                  <div key={i} className="cp-cookie-row">
                    <div className="cp-cookie-row-top">
                      <span className="cp-cookie-name">{k.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="cp-cookie-domain">{k.domain}</span>
                        <button
                          style={{ background: 'none', border: 'none', color: 'var(--red-main)', cursor: 'pointer', fontSize: '12px' }}
                          onClick={() => handleDeleteCookie(k.name, k.domain)}
                          title="Hapus kukis"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <span className="cp-cookie-val">{k.value}</span>
                  </div>
                ))
              )}
            </div>

            {/* Add cookie form */}
            <form onSubmit={handleAddCookie} className="cp-add-cookie-box">
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-white)' }}>+ Tambah / Injeksi Kukis Manual</span>
              <input
                className="cp-input"
                placeholder="Nama Kukis (misal: AUTH_USER)"
                value={cookieForm.name}
                onChange={e => setCookieForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <input
                className="cp-input"
                placeholder="Nilai Kukis (misal: alice.smith@proton.me)"
                value={cookieForm.value}
                onChange={e => setCookieForm(f => ({ ...f, value: e.target.value }))}
                required
              />
              <input
                className="cp-input"
                placeholder="Domain (misal: proton.me)"
                value={cookieForm.domain}
                onChange={e => setCookieForm(f => ({ ...f, domain: e.target.value }))}
              />
              <button type="submit" className="cp-act-btn primary" style={{ alignSelf: 'flex-start', marginTop: '4px' }}>
                Simpan ke Container
              </button>
            </form>
          </div>
        )}

        {viewTab === 'create' && (
          <form onSubmit={handleCreateContainer} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="cp-intro">
              Buat profil container baru dengan <strong>IP terdedikasi</strong> dan <strong>cookie jar kosong</strong> untuk mendaftar akun kedua/ketiga di Proton Mail atau situs lainnya.
            </div>

            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nama Profil Container:</label>
            <input
              className="cp-input"
              placeholder="Contoh: Akun Proton #4, Bisnis, Pribadi"
              value={newContName}
              onChange={e => setNewContName(e.target.value)}
              required
            />

            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pilih Lokasi Virtual IP & Proxy:</label>
            <select
              className="cp-input"
              value={newContCountry}
              onChange={e => setNewContCountry(e.target.value)}
            >
              <option value="Switzerland">🇨🇭 Swiss (Zurich - Proton Datacenter 185.70.41.x)</option>
              <option value="Netherlands">🇳🇱 Belanda (Amsterdam - Proton Exit 194.126.177.x)</option>
              <option value="Iceland">🇮🇸 Islandia (Reykjavik - Privacy Haven 185.159.158.x)</option>
              <option value="Germany">🇩🇪 Jerman (Frankfurt - Tor Relay 185.220.101.x)</option>
              <option value="USA">🇺🇸 Amerika Serikat (New York 198.51.100.x)</option>
              <option value="Indonesia">🇮🇩 Indonesia (Jakarta Cloudflare 104.28.19.x)</option>
            </select>

            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Warna Penanda Tab:</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#ff3b3b'].map(col => (
                <button
                  type="button"
                  key={col}
                  onClick={() => setNewContColor(col)}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: col,
                    border: newContColor === col ? '2px solid white' : 'none',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>

            <button type="submit" className="cp-act-btn primary" style={{ marginTop: '8px', padding: '9px 14px' }}>
              ✓ Buat Profil Container Baru
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
