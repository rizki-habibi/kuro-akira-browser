import React, { useState, useEffect, useCallback, useRef } from 'react'
import TitleBar from './components/TitleBar'
import TabBar from './components/TabBar'
import NavigationBar from './components/NavigationBar'
import BrowserView from './components/BrowserView'
import SidebarLeft from './components/SidebarLeft'
import AIPanel from './components/AIPanel'
import BookmarkPanel from './components/BookmarkPanel'
import HistoryPanel from './components/HistoryPanel'
import ProfilePanel from './components/ProfilePanel'
import TerminalPanel from './components/TerminalPanel'
import SettingsPanel from './components/SettingsPanel'
import VPNPanel from './components/VPNPanel'
import RewardPanel from './components/RewardPanel'
import UpdateNotification from './components/UpdateNotification'
import NewTabPage from './pages/NewTabPage'
import KuroSearchPage from './pages/KuroSearchPage'
import KuroAccountPanel from './components/KuroAccountPanel'
import TorPanel from './components/TorPanel'
import StatusBar from './components/StatusBar'
import FindBar from './components/FindBar'
import './styles/App.css'

/* ─── Tab helpers ─────────────────────────────────── */
let tabIdCounter = 1
const mkTab = (url = '') => ({
  id: tabIdCounter++,
  url: url || '',
  title: url ? 'Memuat...' : 'Tab Baru',
  favicon: null,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  isNewTab: !url,
})

const parseKuro = (url) => {
  if (!url?.startsWith('kuro://')) return null
  const without = url.replace('kuro://', '')
  const [path, qs] = without.split('?')
  const params = {}
  if (qs) qs.split('&').forEach(p => {
    const [k, v] = p.split('=')
    if (k) params[k] = decodeURIComponent(v || '')
  })
  return { path, params }
}

/* ─── App version ─────────────────────────────────── */
export const APP_VERSION = '2.6.0'

/* ─── Search engine URLs ──────────────────────────── */
const ENGINE_URLS = {
  kuro: 'kuro://search?q=',
  google: 'https://www.google.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  ddg: 'https://duckduckgo.com/?q=',
  yahoo: 'https://search.yahoo.com/search?p=',
  brave: 'https://search.brave.com/search?q=',
  onion: 'kuro://search?onion=1&q=',
}

/* ─── RIGHT PANEL WIDTHS ──────────────────────────── */
const PANEL_WIDTHS = {
  ai: 340, bookmark: 320, profile: 360,
  vpn: 340, reward: 320, settings: 500,
  account: 340, tor: 340, history: 340,
}

// Simpan history navigasi
const navHistory = JSON.parse(localStorage.getItem('ka_nav_history') || '[]')
function pushHistory(url, title) {
  if (!url || url.startsWith('kuro://')) return
  const entry = { url, title: title || url, ts: Date.now() }
  navHistory.unshift(entry)
  if (navHistory.length > 500) navHistory.splice(500)
  localStorage.setItem('ka_nav_history', JSON.stringify(navHistory.slice(0, 500)))
}

export default function App() {
  const [tabs, setTabs] = useState([mkTab()])
  const [activeTabId, setActiveTabId] = useState(1)
  const [activePanel, setActivePanel] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showFind, setShowFind] = useState(false)
  const [findQuery, setFindQuery] = useState('')
  const [blockedCount, setBlockedCount] = useState(0)
  const [kuroCoins, setKuroCoins] = useState(0)
  const [settings, setSettings] = useState(null)
  const [searchEngine, setSearchEngine] = useState('kuro')
  const [memInfo, setMemInfo] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1)

  // Lazy loading + suspend refs
  const activatedTabs = useRef(new Set([1]))
  const tabLastActive = useRef({ 1: Date.now() })

  /* ─ Init ─ */
  useEffect(() => {
    const init = async () => {
      if (!window.kuroAPI) return
      const s = await window.kuroAPI.settings.get()
      const bc = await window.kuroAPI.stats.getBlocked()
      const kc = await window.kuroAPI.stats.getCoins()
      setSettings(s)
      setBlockedCount(bc)
      setKuroCoins(kc)
      if (s.searchEngine) setSearchEngine(s.searchEngine)
    }
    init()
    const iv = setInterval(async () => {
      if (!window.kuroAPI) return
      const bc = await window.kuroAPI.stats.getBlocked()
      const kc = await window.kuroAPI.stats.getCoins()
      setBlockedCount(bc)
      setKuroCoins(kc)
    }, 3000)
    const memIv = setInterval(async () => {
      if (!window.kuroAPI) return
      const m = await window.kuroAPI.system.memory().catch(() => null)
      if (m) setMemInfo(m)
    }, 30000)
    window.kuroAPI?.system?.memory().then(m => setMemInfo(m)).catch(() => { })
    return () => { clearInterval(iv); clearInterval(memIv) }
  }, [])

  /* ─ Keyboard shortcuts ─ */
  useEffect(() => {
    const h = e => {
      const ctrl = e.ctrlKey || e.metaKey

      // Tab management
      if (ctrl && e.key === 't') { e.preventDefault(); addTab() }
      if (ctrl && e.key === 'n' && !e.shiftKey) { e.preventDefault(); window.kuroAPI?.window.openNew() }
      if (ctrl && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault()
        addTab('kuro://search?onion=1&q=')
        if (!settings?.useTor) changeSetting('useTor', true)
      }
      if (ctrl && e.key === 'w') { e.preventDefault(); if (activeTab) closeTab(activeTab.id) }

      // Navigation
      if (ctrl && e.key === 'r') { e.preventDefault(); updateTab(activeTabId, { _action: 'reload', _ts: Date.now() }) }
      if (ctrl && e.key === 'l') { e.preventDefault(); document.querySelector('.addr-input')?.focus() }

      // Find in page
      if (ctrl && e.key === 'f') { e.preventDefault(); setShowFind(v => !v) }
      if (e.key === 'Escape' && showFind) { setShowFind(false); setFindQuery('') }

      // Zoom
      if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(z => Math.min(3, +(z + 0.1).toFixed(1))) }
      if (ctrl && e.key === '-') { e.preventDefault(); setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1))) }
      if (ctrl && e.key === '0') { e.preventDefault(); setZoom(1) }

      // Fullscreen
      if (e.key === 'F11') { e.preventDefault(); setIsFullscreen(v => !v) }

      // Terminal & settings
      if (e.key === 'F12') { setShowTerminal(v => !v) }
      if (ctrl && e.key === ',') { setShowSettings(v => !v) }

      // Panel shortcuts
      if (ctrl && e.shiftKey && e.key === 'B') { e.preventDefault(); togglePanel('bookmark') }
      if (ctrl && e.shiftKey && e.key === 'H') { e.preventDefault(); togglePanel('history') }
      if (ctrl && e.shiftKey && e.key === 'A') { e.preventDefault(); togglePanel('ai') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeTabId, settings, showFind])

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  /* ─ Tab activation tracking ─ */
  const handleTabSelect = useCallback((id) => {
    activatedTabs.current.add(id)
    tabLastActive.current[id] = Date.now()
    setActiveTabId(id)
  }, [])

  const SUSPEND_AFTER_MS = 5 * 60 * 1000
  const isSuspended = useCallback((tab) => {
    if (tab.id === activeTabId) return false
    if (tab.isNewTab || !tab.url || tab.url.startsWith('kuro://')) return false
    const last = tabLastActive.current[tab.id] || 0
    return (Date.now() - last) > SUSPEND_AFTER_MS
  }, [activeTabId])

  /* ─ Tab actions ─ */
  const addTab = useCallback((url = '') => {
    const t = mkTab(url)
    activatedTabs.current.add(t.id)
    tabLastActive.current[t.id] = Date.now()
    setTabs(prev => [...prev, t])
    setActiveTabId(t.id)
  }, [])

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      if (next.length === 0) {
        const f = mkTab()
        activatedTabs.current.add(f.id)
        setActiveTabId(f.id)
        return [f]
      }
      if (activeTabId === id) {
        const idx = prev.findIndex(t => t.id === id)
        setActiveTabId((prev[idx + 1] || prev[idx - 1]).id)
      }
      return next
    })
  }, [activeTabId])

  const updateTab = useCallback((id, updates) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  /* ─ Navigate ─ */
  const navigate = useCallback((url, tabId) => {
    const tid = tabId || activeTabId
    if (!url) return
    let final = url.trim()
    if (!final.startsWith('http') && !final.startsWith('kuro://') && !final.startsWith('about:')) {
      const looksLikeUrl = /^[a-z0-9.-]+\.[a-z]{2,}/i.test(final)
      if (looksLikeUrl) final = 'https://' + final
      else final = (ENGINE_URLS[searchEngine] || ENGINE_URLS.kuro) + encodeURIComponent(final)
    }
    updateTab(tid, { url: final, isNewTab: false, isLoading: !final.startsWith('kuro://') })
    activatedTabs.current.add(tid)
    tabLastActive.current[tid] = Date.now()
  }, [activeTabId, searchEngine, updateTab])

  /* ─ Settings ─ */
  const changeSetting = async (key, val) => {
    // Fix: handle internal panel toggle calls
    if (key === '_setting_useTor_false') { await window.kuroAPI?.settings.set('useTor', false); setSettings(p => ({ ...p, useTor: false })); return }
    if (window.kuroAPI) await window.kuroAPI.settings.set(key, val)
    setSettings(prev => ({ ...prev, [key]: val }))
    if (key === 'searchEngine') setSearchEngine(val)
  }

  /* ─ Panel toggle ─ */
  const togglePanel = (id) => {
    if (id === 'terminal') { setShowTerminal(v => !v); return }
    if (id === 'settings') { setShowSettings(v => !v); return }
    if (id === 'home') { addTab(); return }
    if (id === 'download') { navigate('kuro://downloads'); return }
    setActivePanel(prev => prev === id ? null : id)
  }

  /* ─ Zoom: apply to active webview ─ */
  useEffect(() => {
    const wv = window.__activeWebview
    if (wv?.setZoomFactor) { try { wv.setZoomFactor(zoom) } catch (_) { } }
  }, [zoom])

  /* ─ Render panel kanan ─ */
  const renderRightPanel = () => {
    if (!activePanel) return null
    const w = PANEL_WIDTHS[activePanel] || 320
    const panelContent = {
      ai: <AIPanel onClose={() => setActivePanel(null)} currentUrl={activeTab?.url} />,
      bookmark: <BookmarkPanel onClose={() => setActivePanel(null)} onNavigate={navigate} />,
      history: <HistoryPanel onClose={() => setActivePanel(null)} onNavigate={navigate} />,
      profile: <ProfilePanel onClose={() => setActivePanel(null)} settings={settings} onChange={changeSetting} />,
      vpn: <VPNPanel onClose={() => setActivePanel(null)} settings={settings} onChange={changeSetting} />,
      reward: <RewardPanel onClose={() => setActivePanel(null)} blockedCount={blockedCount} />,
      account: <KuroAccountPanel onClose={() => setActivePanel(null)} onAccountChange={(s) => changeSetting('activeProfile', s?.displayName || 'Profil Utama')} />,
      tor: <TorPanel onClose={() => setActivePanel(null)} settings={settings} onChange={changeSetting} />,
    }[activePanel]
    if (!panelContent) return null
    return <div className="right-panel" style={{ width: w }}>{panelContent}</div>
  }

  const isOnionTab = activeTab?.url?.includes('.onion')

  return (
    <div className={`app-root ${isFullscreen ? 'app-fullscreen' : ''}`}>
      <UpdateNotification />

      {/* Sembunyikan chrome saat fullscreen */}
      {!isFullscreen && (
        <>
          <TitleBar
            onSettingsClick={() => setShowSettings(v => !v)}
            blockedCount={blockedCount}
            privacyLevel={settings?.privacyLevel || 'high'}
            useTor={settings?.useTor || false}
            vpnEnabled={settings?.vpnEnabled || false}
            activeProfile={settings?.activeProfile}
            onNewWindow={() => window.kuroAPI?.window.openNew()}
          />
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={handleTabSelect}
            onTabClose={closeTab}
            onNewTab={() => addTab()}
          />
        </>
      )}

      {/* Fullscreen minimal bar */}
      {isFullscreen && (
        <div className="fs-bar">
          <span className="fs-title">{activeTab?.title || 'Kuro Akira'}</span>
          <div className="fs-controls">
            <button className="fs-btn" onClick={() => setIsFullscreen(false)} title="Keluar fullscreen (F11)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <NavigationBar
        currentUrl={activeTab?.url || ''}
        isLoading={activeTab?.isLoading || false}
        canGoBack={activeTab?.canGoBack || false}
        canGoForward={activeTab?.canGoForward || false}
        onNavigate={navigate}
        onBack={() => updateTab(activeTabId, { _action: 'back', _ts: Date.now() })}
        onForward={() => updateTab(activeTabId, { _action: 'forward', _ts: Date.now() })}
        onReload={() => updateTab(activeTabId, { _action: 'reload', _ts: Date.now() })}
        onStop={() => updateTab(activeTabId, { _action: 'stop', _ts: Date.now() })}
        privacyLevel={settings?.privacyLevel || 'high'}
        adBlockEnabled={settings?.adBlockEnabled !== false}
        searchEngine={searchEngine}
        onSearchEngineChange={v => changeSetting('searchEngine', v)}
        zoom={zoom}
        onZoomIn={() => setZoom(z => Math.min(3, +(z + 0.1).toFixed(1)))}
        onZoomOut={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))}
        onZoomReset={() => setZoom(1)}
        onToggleFullscreen={() => setIsFullscreen(v => !v)}
        isFullscreen={isFullscreen}
      />

      {/* Find bar */}
      {showFind && (
        <FindBar
          query={findQuery}
          onChange={setFindQuery}
          onClose={() => { setShowFind(false); setFindQuery('') }}
        />
      )}

      <div className="browser-body">
        {!isFullscreen && (
          <SidebarLeft
            activePanel={activePanel}
            onPanelToggle={togglePanel}
            kuroCoins={kuroCoins}
            showTerminal={showTerminal}
          />
        )}

        <div className="browser-main">
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {tabs.map(tab => {
              const kUrl = parseKuro(tab.url)
              const hasBeenActivated = activatedTabs.current.has(tab.id)
              const suspended = isSuspended(tab)
              return (
                <div key={tab.id} className={`tab-content ${tab.id === activeTabId ? 'active' : ''}`}>
                  {(!tab.url || tab.isNewTab) && (
                    <NewTabPage
                      onNavigate={navigate}
                      blockedCount={blockedCount}
                      settings={settings}
                      onPanelToggle={togglePanel}
                      onOpenTerminal={() => setShowTerminal(true)}
                    />
                  )}
                  {kUrl?.path === 'search' && (
                    <KuroSearchPage
                      query={kUrl.params.q || ''}
                      onion={kUrl.params.onion === '1'}
                      onNavigate={navigate}
                    />
                  )}
                  {tab.url && !tab.isNewTab && !kUrl && hasBeenActivated && !suspended && (
                    <BrowserView
                      tabId={tab.id}
                      url={tab.url}
                      isActive={tab.id === activeTabId}
                      action={tab._action}
                      actionTs={tab._ts}
                      findQuery={tab.id === activeTabId ? findQuery : ''}
                      zoom={zoom}
                      onTitleChange={t => {
                        updateTab(tab.id, { title: t })
                        pushHistory(tab.url, t)
                      }}
                      onFaviconChange={f => updateTab(tab.id, { favicon: f })}
                      onLoadStart={() => updateTab(tab.id, { isLoading: true })}
                      onLoadEnd={u => updateTab(tab.id, { isLoading: false, url: u })}
                      onNavigationState={(b, f) => updateTab(tab.id, { canGoBack: b, canGoForward: f })}
                      onNewTabRequested={u => addTab(u)}
                    />
                  )}
                  {tab.url && !tab.isNewTab && !kUrl && suspended && (
                    <div className="tab-suspended">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.5">
                        <path d="M10 9v6m4-6v6" /><rect x="3" y="3" width="18" height="18" rx="2" />
                      </svg>
                      <p>Tab dijeda untuk hemat memori</p>
                      <button onClick={() => {
                        tabLastActive.current[tab.id] = Date.now()
                        updateTab(tab.id, { _action: 'reload', _ts: Date.now() })
                      }}>▶ Lanjutkan</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {showTerminal && <TerminalPanel onClose={() => setShowTerminal(false)} />}
        </div>

        {!isFullscreen && renderRightPanel()}

        {showSettings && (
          <SettingsPanel
            settings={settings}
            onClose={() => setShowSettings(false)}
            onChange={changeSetting}
            blockedCount={blockedCount}
            onResetBlockedCount={async () => {
              if (window.kuroAPI) await window.kuroAPI.stats.resetBlocked()
              setBlockedCount(0)
            }}
          />
        )}
      </div>

      <StatusBar
        url={activeTab?.url || ''}
        isLoading={activeTab?.isLoading || false}
        privacyLevel={settings?.privacyLevel || 'high'}
        useTor={settings?.useTor || false}
        vpnEnabled={settings?.vpnEnabled || false}
        adBlockEnabled={settings?.adBlockEnabled !== false}
        blockedCount={blockedCount}
        memInfo={memInfo}
        zoom={zoom}
      />
    </div>
  )
}
