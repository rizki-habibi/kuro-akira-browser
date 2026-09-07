import React, { useState, useEffect, useCallback } from 'react'
import TitleBar from './components/TitleBar'
import TabBar from './components/TabBar'
import NavigationBar from './components/NavigationBar'
import BrowserView from './components/BrowserView'
import SidebarLeft from './components/SidebarLeft'
import AIPanel from './components/AIPanel'
import BookmarkPanel from './components/BookmarkPanel'
import ProfilePanel from './components/ProfilePanel'
import TerminalPanel from './components/TerminalPanel'
import SettingsPanel from './components/SettingsPanel'
import NewTabPage from './pages/NewTabPage'
import KuroSearchPage from './pages/KuroSearchPage'
import StatusBar from './components/StatusBar'
import './styles/App.css'

let tabIdCounter = 1
const createTab = (url = '') => ({
  id: tabIdCounter++,
  url: url || '',
  title: url ? 'Memuat...' : 'Tab Baru',
  favicon: null,
  isLoading: false,
  canGoBack: false,
  canGoForward: false,
  isNewTab: !url,
})

const parseKuroUrl = (url) => {
  if (!url?.startsWith('kuro://')) return null
  const without = url.replace('kuro://', '')
  const [path, qs] = without.split('?')
  const params = {}
  if (qs) qs.split('&').forEach(p => { const [k, v] = p.split('='); if (k) params[k] = decodeURIComponent(v || '') })
  return { path, params }
}

export default function App() {
  const [tabs, setTabs] = useState([createTab()])
  const [activeTabId, setActiveTabId] = useState(1)
  const [activePanel, setActivePanel] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)
  const [settings, setSettings] = useState(null)
  const [searchEngine, setSearchEngine] = useState('kuro')

  useEffect(() => {
    const load = async () => {
      if (window.kuroAPI) {
        const s = await window.kuroAPI.settings.get()
        setSettings(s)
        const c = await window.kuroAPI.stats.getBlocked()
        setBlockedCount(c)
        if (s.searchEngine) setSearchEngine(s.searchEngine)
      }
    }
    load()
    const iv = setInterval(async () => {
      if (window.kuroAPI) setBlockedCount(await window.kuroAPI.stats.getBlocked())
    }, 3000)
    return () => clearInterval(iv)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = e => {
      if (e.ctrlKey && e.key === 't') { e.preventDefault(); addTab() }
      if (e.ctrlKey && e.key === 'w') { e.preventDefault(); if (activeTab) closeTab(activeTab.id) }
      if (e.key === 'F12') { setShowTerminal(v => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTabId])

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0]

  const addTab = useCallback((url = '') => {
    const t = createTab(url)
    setTabs(prev => [...prev, t])
    setActiveTabId(t.id)
  }, [])

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      const next = prev.filter(t => t.id !== id)
      if (next.length === 0) { const f = createTab(); setActiveTabId(f.id); return [f] }
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

  const navigate = useCallback((url, tabId = null) => {
    const tid = tabId || activeTabId
    if (!url) return
    let final = url.trim()
    if (!final.startsWith('http') && !final.startsWith('kuro://') && !final.startsWith('about:')) {
      const isUrl = /^[a-z0-9.-]+\.[a-z]{2,}/i.test(final)
      if (isUrl) final = 'https://' + final
      else {
        // Pakai mesin pencari yang dipilih
        const engines = {
          kuro: 'kuro://search?q=',
          google: 'https://www.google.com/search?q=',
          bing: 'https://www.bing.com/search?q=',
          ddg: 'https://duckduckgo.com/?q=',
          yahoo: 'https://search.yahoo.com/search?p=',
          brave: 'https://search.brave.com/search?q=',
        }
        final = (engines[searchEngine] || engines.kuro) + encodeURIComponent(final)
      }
    }
    updateTab(tid, { url: final, isNewTab: false, isLoading: !final.startsWith('kuro://') })
  }, [activeTabId, searchEngine, updateTab])

  const handleSettingChange = async (key, value) => {
    if (window.kuroAPI) await window.kuroAPI.settings.set(key, value)
    setSettings(prev => ({ ...prev, [key]: value }))
    if (key === 'searchEngine') setSearchEngine(value)
  }

  const handlePanelToggle = (id) => {
    if (id === 'terminal') { setShowTerminal(v => !v); return }
    setActivePanel(prev => prev === id ? null : id)
  }

  const kuroUrl = activeTab ? parseKuroUrl(activeTab.url) : null

  return (
    <div className="app-root">
      <TitleBar
        onSettingsClick={() => setShowSettings(v => !v)}
        blockedCount={blockedCount}
        privacyLevel={settings?.privacyLevel || 'high'}
        useTor={settings?.useTor || false}
        activeProfile={settings?.activeProfile}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onTabSelect={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={() => addTab()}
      />
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
        onSearchEngineChange={v => handleSettingChange('searchEngine', v)}
      />

      <div className="browser-body">
        {/* Sidebar kiri */}
        <SidebarLeft activePanel={activePanel} onPanelToggle={handlePanelToggle} />

        {/* Konten browser */}
        <div className="browser-main">
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {tabs.map(tab => {
              const ku = parseKuroUrl(tab.url)
              return (
                <div key={tab.id} className={`tab-content ${tab.id === activeTabId ? 'active' : ''}`}>
                  {(!tab.url || tab.isNewTab) && (
                    <NewTabPage onNavigate={navigate} blockedCount={blockedCount} settings={settings} />
                  )}
                  {ku?.path === 'search' && (
                    <KuroSearchPage query={ku.params.q} onNavigate={navigate} />
                  )}
                  {tab.url && !tab.isNewTab && !ku && (
                    <BrowserView
                      tabId={tab.id}
                      url={tab.url}
                      isActive={tab.id === activeTabId}
                      action={tab._action}
                      actionTs={tab._ts}
                      onTitleChange={t => updateTab(tab.id, { title: t })}
                      onFaviconChange={f => updateTab(tab.id, { favicon: f })}
                      onLoadStart={() => updateTab(tab.id, { isLoading: true })}
                      onLoadEnd={u => updateTab(tab.id, { isLoading: false, url: u })}
                      onNavigationState={(b, f) => updateTab(tab.id, { canGoBack: b, canGoForward: f })}
                      onNewTabRequested={u => addTab(u)}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Terminal bawah */}
          {showTerminal && <TerminalPanel onClose={() => setShowTerminal(false)} />}
        </div>

        {/* Panel kanan */}
        {activePanel === 'ai' && (
          <div className="right-panel">
            <AIPanel onClose={() => setActivePanel(null)} />
          </div>
        )}
        {activePanel === 'bookmark' && (
          <div className="right-panel">
            <BookmarkPanel onClose={() => setActivePanel(null)} onNavigate={navigate} />
          </div>
        )}
        {activePanel === 'profile' && (
          <div className="right-panel" style={{ width: 340 }}>
            <ProfilePanel onClose={() => setActivePanel(null)} settings={settings} onChange={handleSettingChange} />
          </div>
        )}

        {/* Settings overlay */}
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onClose={() => setShowSettings(false)}
            onChange={handleSettingChange}
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
        adBlockEnabled={settings?.adBlockEnabled !== false}
        blockedCount={blockedCount}
      />
    </div>
  )
}
