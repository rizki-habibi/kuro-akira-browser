import React, { useState } from 'react'
import './ProfilePanel.css'

const AVATAR_COLORS = ['#e53535','#c22020','#505050','#353535','#9e9e9e','#4caf50','#2196f3','#ff6b35']

export default function ProfilePanel({ onClose, settings, onChange }) {
  const [profiles, setProfiles] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ka_profiles') || JSON.stringify([
      { id: 1, name: 'Profil Utama', color: '#e53535', accounts: [], active: true }
    ])) } catch { return [] }
  })
  const [activeProfile, setActiveProfile] = useState(() => profiles.find(p=>p.active)?.id || 1)
  const [addMode, setAddMode] = useState(false)
  const [addAccountMode, setAddAccountMode] = useState(null)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#e53535')
  const [newAccount, setNewAccount] = useState({ type:'Gmail', email:'', note:'' })

  const saveProfiles = list => {
    setProfiles(list)
    localStorage.setItem('ka_profiles', JSON.stringify(list))
  }

  const addProfile = () => {
    if (!newName) return
    const np = { id: Date.now(), name: newName, color: newColor, accounts: [], active: false }
    saveProfiles([...profiles, np])
    setNewName(''); setAddMode(false)
  }

  const switchProfile = id => {
    const updated = profiles.map(p => ({...p, active: p.id === id}))
    saveProfiles(updated)
    setActiveProfile(id)
    onChange && onChange('activeProfile', profiles.find(p=>p.id===id)?.name)
  }

  const removeProfile = id => {
    if (profiles.length <= 1) return
    const updated = profiles.filter(p => p.id !== id)
    if (activeProfile === id) { updated[0].active = true; setActiveProfile(updated[0].id) }
    saveProfiles(updated)
  }

  const addAccount = (profileId) => {
    if (!newAccount.email) return
    const updated = profiles.map(p => {
      if (p.id !== profileId) return p
      return { ...p, accounts: [...(p.accounts||[]), { ...newAccount, id: Date.now() }] }
    })
    saveProfiles(updated)
    setNewAccount({ type:'Gmail', email:'', note:'' })
    setAddAccountMode(null)
  }

  const removeAccount = (profileId, accountId) => {
    const updated = profiles.map(p => {
      if (p.id !== profileId) return p
      return { ...p, accounts: (p.accounts||[]).filter(a => a.id !== accountId) }
    })
    saveProfiles(updated)
  }

  const ACCOUNT_TYPES = ['Gmail','Outlook','Yahoo Mail','Instagram','Twitter/X','Facebook','TikTok','GitHub','Lainnya']

  return (
    <div className="profile-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          Profil &amp; Akun
        </div>
        <div style={{display:'flex',gap:'4px'}}>
          <button className="prof-add-btn" onClick={() => setAddMode(v=>!v)}>+ Profil</button>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </div>

      {addMode && (
        <div className="prof-add-form">
          <input className="prof-input" placeholder="Nama profil" value={newName} onChange={e=>setNewName(e.target.value)} />
          <div className="prof-colors">
            {AVATAR_COLORS.map(c => (
              <button key={c} className={`prof-color ${newColor===c?'sel':''}`} style={{background:c}} onClick={()=>setNewColor(c)} />
            ))}
          </div>
          <button className="prof-save-btn" onClick={addProfile}>Buat Profil</button>
        </div>
      )}

      <div className="prof-list">
        {profiles.map(p => (
          <div key={p.id} className={`prof-card ${p.id===activeProfile?'active':''}`}>
            <div className="prof-card-top">
              <div className="prof-avatar" style={{background:p.color}}>
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="prof-info">
                <div className="prof-name">{p.name}</div>
                <div className="prof-meta">{(p.accounts||[]).length} akun tersimpan (tak terbatas)</div>
              </div>
              <div className="prof-actions">
                {p.id !== activeProfile && (
                  <button className="prof-switch-btn" onClick={() => switchProfile(p.id)}>Gunakan</button>
                )}
                {p.id === activeProfile && <span className="prof-active-badge">Aktif</span>}
                <button className="prof-del-btn" onClick={() => removeAccount(p.id)} title="Hapus profil">
                  <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
                </button>
              </div>
            </div>

            {/* Daftar akun */}
            <div className="prof-accounts">
              <div className="prof-accounts-header">
                <span>Akun Tersimpan</span>
                <button className="prof-acc-add" onClick={() => setAddAccountMode(p.id)}>+ Akun</button>
              </div>

              {addAccountMode === p.id && (
                <div className="prof-acc-form">
                  <select className="prof-select" value={newAccount.type} onChange={e=>setNewAccount(a=>({...a,type:e.target.value}))}>
                    {ACCOUNT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input className="prof-input sm" placeholder="Email/username" value={newAccount.email} onChange={e=>setNewAccount(a=>({...a,email:e.target.value}))} />
                  <input className="prof-input sm" placeholder="Catatan (opsional)" value={newAccount.note} onChange={e=>setNewAccount(a=>({...a,note:e.target.value}))} />
                  <button className="prof-save-btn sm" onClick={() => addAccount(p.id)}>Simpan</button>
                </div>
              )}

              {(p.accounts||[]).length === 0 && <div className="prof-no-acc">Belum ada akun. Klik + Akun untuk menambah.</div>}
              {(p.accounts||[]).map(acc => (
                <div key={acc.id} className="prof-acc-item">
                  <div className="prof-acc-type">{acc.type}</div>
                  <div className="prof-acc-email">{acc.email}</div>
                  {acc.note && <div className="prof-acc-note">{acc.note}</div>}
                  <button className="prof-acc-del" onClick={() => removeAccount(p.id, acc.id)}>
                    <svg width="8" height="8" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="prof-note">
        Simpan akun tak terbatas di setiap profil. Data disimpan lokal dan terenkripsi di perangkat Anda.
      </div>
    </div>
  )
}
