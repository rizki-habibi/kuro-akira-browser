import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initKuroWebAPI } from './lib/kuroWebAPI'
import './styles/global.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[KuroApp] Render error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d0d0d',
          color: '#f0f0f0',
          fontFamily: 'Segoe UI, sans-serif',
          padding: 24,
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#ff3b3b', marginBottom: 12 }}>Terjadi Kesalahan Tampilan</h2>
          <p style={{ color: '#9e9e9e', maxWidth: 480, marginBottom: 20 }}>
            {this.state.error?.message || 'Gagal memuat komponen Kuro Akira Browser.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            style={{
              background: '#e53535',
              color: '#fff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

try {
  initKuroWebAPI()
} catch (e) {
  console.warn('[KuroApp] initKuroWebAPI warning:', e)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

