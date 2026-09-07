import React, { useRef, useEffect } from 'react'
import './BrowserView.css'

export default function BrowserView({
  tabId, url, isActive, action, actionTs,
  onTitleChange, onFaviconChange, onLoadStart, onLoadEnd,
  onNavigationState, onNewTabRequested
}) {
  const viewRef = useRef(null)

  useEffect(() => {
    const wv = viewRef.current
    if (!wv) return
    const onStart = () => onLoadStart()
    const onStop = () => { onLoadEnd(wv.getURL()); onNavigationState(wv.canGoBack(), wv.canGoForward()) }
    const onTitle = e => onTitleChange(e.title)
    const onFav = e => { if (e.favicons?.[0]) onFaviconChange(e.favicons[0]) }
    const onNew = e => { e.preventDefault(); if (e.url) onNewTabRequested(e.url) }
    wv.addEventListener('did-start-loading', onStart)
    wv.addEventListener('did-stop-loading', onStop)
    wv.addEventListener('page-title-updated', onTitle)
    wv.addEventListener('page-favicon-updated', onFav)
    wv.addEventListener('new-window', onNew)
    return () => {
      wv.removeEventListener('did-start-loading', onStart)
      wv.removeEventListener('did-stop-loading', onStop)
      wv.removeEventListener('page-title-updated', onTitle)
      wv.removeEventListener('page-favicon-updated', onFav)
      wv.removeEventListener('new-window', onNew)
    }
  }, [])

  useEffect(() => {
    const wv = viewRef.current
    if (!wv || !action) return
    try {
      if (action === 'back' && wv.canGoBack()) wv.goBack()
      else if (action === 'forward' && wv.canGoForward()) wv.goForward()
      else if (action === 'reload') wv.reload()
      else if (action === 'stop') wv.stop()
    } catch (_) { }
  }, [action, actionTs])

  return (
    <div className={`bview-container ${isActive ? 'active' : ''}`}>
      <webview
        ref={viewRef}
        src={url}
        className="bview-wv"
        allowpopups="false"
        nodeintegration="false"
        contextIsolation="true"
        partition="persist:main"
        webpreferences="contextIsolation=yes,nodeIntegration=no,javascript=yes"
      />
    </div>
  )
}
