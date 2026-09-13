import React, { useState, useEffect } from 'react'
import { safeStorage } from '../lib/storage'
import './BookmarkPanel.css'

export default function BookmarkPanel({ onClose, onNavigate }) {
  const [bookmarks, setBookmarks] = useState(() => safeStorage.getJSON('ka_bookmarks', []))
  const [folder, setFolder] = useState('Semua')
  const [search, setSearch] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [form, setForm] = useState({ title:'', url:'', folder:'Umum', tags:'' })

  const folders = ['Semua', ...new Set(bookmarks.map(b => b.folder || 'Umum'))]

  const save = list => {
    setBookmarks(list)
    safeStorage.setJSON('ka_bookmarks', list)
  }

  const add = () => {
    if (!form.url) return
    const nb = { id: Date.now(), title: form.title || form.url, url: form.url, folder: form.folder, tags: form.tags, addedAt: new Date().toISOString() }
    save([...bookmarks, nb])
    setForm({ title:'', url:'', folder:'Umum', tags:'' })
    setAddMode(false)
  }

  const remove = id => save(bookmarks.filter(b => b.id !== id))

  const filtered = bookmarks.filter(b => {
    const inFolder = folder === 'Semua' || b.folder === folder
    const inSearch = !search || b.title?.toLowerCase().includes(search.toLowerCase()) || b.url?.includes(search)
    return inFolder && inSearch
  })

  return (
    <div className="bm-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Penanda
        </div>
        <div style={{display:'flex',gap:'4px'}}>
          <button className="bm-add-btn" onClick={() => setAddMode(v=>!v)}>+ Tambah</button>
          <button className="panel-close-btn" onClick={onClose}>
            <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </div>

      {addMode && (
        <div className="bm-add-form">
          <input className="bm-input" placeholder="Judul" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
          <input className="bm-input" placeholder="URL (wajib)" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} />
          <input className="bm-input" placeholder="Folder" value={form.folder} onChange={e=>setForm(f=>({...f,folder:e.target.value}))} />
          <input className="bm-input" placeholder="Tag (pisah koma)" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />
          <button className="bm-save-btn" onClick={add}>Simpan</button>
        </div>
      )}

      <div className="bm-search-wrap">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input className="bm-search" placeholder="Cari penanda..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="bm-folders">
        {folders.map(f => (
          <button key={f} className={`bm-folder-btn ${folder===f?'active':''}`} onClick={()=>setFolder(f)}>{f}</button>
        ))}
      </div>

      <div className="bm-list">
        {filtered.length === 0 && <div className="bm-empty">Tidak ada penanda</div>}
        {filtered.map(bm => (
          <div key={bm.id} className="bm-item">
            <div className="bm-favicon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div className="bm-info" onClick={() => onNavigate(bm.url)}>
              <div className="bm-title">{bm.title}</div>
              <div className="bm-url">{bm.url}</div>
            </div>
            <button className="bm-del" onClick={() => remove(bm.id)} title="Hapus">
              <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
