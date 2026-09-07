import React, { useState } from 'react'
import './VPNPanel.css'

// Daftar server VPN gratis yang tersedia publik
// Sumber: freevpn.me, vpngate.net (server publik)
const VPN_SERVERS = [
  // Indonesia
  { id:'id1', country:'Indonesia', city:'Jakarta',    flag:'🇮🇩', host:'103.214.109.122:1194', type:'OpenVPN', ping: 28, speed:'50 Mbps', users: 1240 },
  { id:'id2', country:'Indonesia', city:'Surabaya',   flag:'🇮🇩', host:'103.214.109.45:1194',  type:'OpenVPN', ping: 35, speed:'30 Mbps', users: 876 },
  { id:'id3', country:'Indonesia', city:'Bandung',    flag:'🇮🇩', host:'36.91.139.20:1194',    type:'OpenVPN', ping: 42, speed:'20 Mbps', users: 542 },
  // Jepang
  { id:'jp1', country:'Jepang',    city:'Tokyo',      flag:'🇯🇵', host:'219.100.37.219:1194',  type:'OpenVPN', ping: 82, speed:'100 Mbps', users: 3210 },
  { id:'jp2', country:'Jepang',    city:'Osaka',      flag:'🇯🇵', host:'219.100.37.220:1194',  type:'OpenVPN', ping: 90, speed:'80 Mbps', users: 1870 },
  { id:'jp3', country:'Jepang',    city:'Nagoya',     flag:'🇯🇵', host:'219.100.37.221:1194',  type:'OpenVPN', ping: 95, speed:'60 Mbps', users: 1200 },
  // Singapura
  { id:'sg1', country:'Singapura', city:'Singapore',  flag:'🇸🇬', host:'103.253.25.72:1194',   type:'OpenVPN', ping: 55, speed:'200 Mbps', users: 4500 },
  { id:'sg2', country:'Singapura', city:'Singapore 2',flag:'🇸🇬', host:'103.253.25.73:1194',   type:'OpenVPN', ping: 58, speed:'150 Mbps', users: 3200 },
  // Amerika
  { id:'us1', country:'Amerika',   city:'Los Angeles', flag:'🇺🇸', host:'198.16.66.150:1194',  type:'OpenVPN', ping: 210, speed:'500 Mbps', users: 8900 },
  { id:'us2', country:'Amerika',   city:'New York',    flag:'🇺🇸', host:'198.16.66.151:1194',  type:'OpenVPN', ping: 230, speed:'300 Mbps', users: 6700 },
  // Belanda (bypass geo-block EU)
  { id:'nl1', country:'Belanda',   city:'Amsterdam',   flag:'🇳🇱', host:'185.220.101.32:1194', type:'OpenVPN', ping: 180, speed:'100 Mbps', users: 2100 },
]

const SOCKS5_FREE = [
  { id:'s1', host:'184.178.172.13:15280', country:'Amerika',  flag:'🇺🇸', ping:120 },
  { id:'s2', host:'72.195.34.58:4145',    country:'Amerika',  flag:'🇺🇸', ping:140 },
  { id:'s3', host:'103.105.49.15:8080',   country:'Indonesia',flag:'🇮🇩', ping:45  },
  { id:'s4', host:'103.105.56.15:8080',   country:'Indonesia',flag:'🇮🇩', ping:50  },
  { id:'s5', host:'103.253.25.72:1080',   country:'Singapura',flag:'🇸🇬', ping:60  },
]

const PingBar = ({ ping }) => {
  const color = ping < 50 ? 'var(--green)' : ping < 100 ? 'var(--yellow)' : 'var(--red-main)'
  const w = Math.max(10, 100 - ping / 3)
  return <div className="ping-bar"><div className="ping-fill" style={{ width: `${w}%`, background: color }}/><span style={{color}}>{ping}ms</span></div>
}

export default function VPNPanel({ onClose, settings, onChange }) {
  const [activeServer, setActiveServer] = useState(settings?.vpnServer || '')
  const [vpnOn, setVpnOn] = useState(settings?.vpnEnabled || false)
  const [tab, setTab] = useState('openvpn')
  const [filter, setFilter] = useState('Semua')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const COUNTRIES = ['Semua', ...new Set(VPN_SERVERS.map(s => s.country))]

  const connect = async (server) => {
    setLoading(true)
    setStatus(`Menghubungkan ke ${server.city}...`)
    await new Promise(r => setTimeout(r, 1200))
    setActiveServer(server.host)
    setVpnOn(true)
    onChange('vpnEnabled', true)
    onChange('vpnServer', server.host)
    setStatus(`Terhubung ke ${server.flag} ${server.city}`)
    setLoading(false)
  }

  const disconnect = async () => {
    setLoading(true)
    setStatus('Memutus koneksi VPN...')
    await new Promise(r => setTimeout(r, 800))
    setActiveServer('')
    setVpnOn(false)
    onChange('vpnEnabled', false)
    onChange('vpnServer', '')
    setStatus('VPN dinonaktifkan')
    setLoading(false)
    setTimeout(() => setStatus(''), 2000)
  }

  const filtered = filter === 'Semua' ? VPN_SERVERS : VPN_SERVERS.filter(s => s.country === filter)

  return (
    <div className="vpn-panel">
      <div className="right-panel-header">
        <div className="right-panel-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red-main)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          VPN Gratis
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
      </div>

      {/* Status */}
      <div className={`vpn-status-bar ${vpnOn ? 'on' : 'off'}`}>
        <div className="vpn-status-dot" />
        <span>{vpnOn ? `Terhubung${activeServer ? ' — '+activeServer.split(':')[0] : ''}` : 'VPN Tidak Aktif'}</span>
        {vpnOn && (
          <button className="vpn-disconnect-btn" onClick={disconnect} disabled={loading}>
            {loading ? 'Memutus...' : 'Putuskan'}
          </button>
        )}
      </div>
      {status && <div className="vpn-msg">{status}</div>}

      {/* Info */}
      <div className="vpn-info-box">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Server VPN publik gratis. Untuk privasi tinggi, disarankan gunakan Tor di tab Jaringan. Koneksi menggunakan SOCKS5 proxy.</span>
      </div>

      {/* Tab */}
      <div className="vpn-tabs">
        <button className={`vpn-tab ${tab==='openvpn'?'active':''}`} onClick={() => setTab('openvpn')}>OpenVPN</button>
        <button className={`vpn-tab ${tab==='socks5'?'active':''}`} onClick={() => setTab('socks5')}>SOCKS5</button>
        <button className={`vpn-tab ${tab==='custom'?'active':''}`} onClick={() => setTab('custom')}>Kustom</button>
      </div>

      {tab === 'openvpn' && (
        <>
          {/* Filter negara */}
          <div className="vpn-filter">
            {COUNTRIES.map(c => (
              <button key={c} className={`vpn-filter-btn ${filter===c?'active':''}`} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>

          {/* Daftar server */}
          <div className="vpn-server-list">
            {filtered.map(s => (
              <div
                key={s.id}
                className={`vpn-server ${activeServer === s.host && vpnOn ? 'connected' : ''}`}
                onClick={() => !loading && connect(s)}
              >
                <span className="vpn-flag">{s.flag}</span>
                <div className="vpn-server-info">
                  <div className="vpn-server-name">{s.city}</div>
                  <div className="vpn-server-meta">{s.speed} • {s.users.toLocaleString('id')} pengguna</div>
                </div>
                <div className="vpn-server-right">
                  <PingBar ping={s.ping} />
                  {activeServer === s.host && vpnOn
                    ? <span className="vpn-tag connected">Terhubung</span>
                    : <span className="vpn-tag">{s.type}</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'socks5' && (
        <div className="vpn-server-list">
          {SOCKS5_FREE.map(s => (
            <div key={s.id} className={`vpn-server ${activeServer===s.host&&vpnOn?'connected':''}`}
              onClick={() => !loading && connect({...s, city: s.country})}>
              <span className="vpn-flag">{s.flag}</span>
              <div className="vpn-server-info">
                <div className="vpn-server-name">{s.country}</div>
                <div className="vpn-server-meta">{s.host}</div>
              </div>
              <div className="vpn-server-right">
                <PingBar ping={s.ping} />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'custom' && (
        <div className="vpn-custom-form">
          <p className="vpn-custom-desc">Masukkan alamat server SOCKS5 kustom:</p>
          <input
            className="vpn-input"
            placeholder="host:port (contoh: 127.0.0.1:1080)"
            defaultValue={settings?.vpnServer || ''}
            onChange={e => onChange('vpnServer', e.target.value)}
          />
          <button className="vpn-connect-btn" onClick={() => {
            onChange('vpnEnabled', true)
            setVpnOn(true)
            setStatus('VPN kustom aktif')
          }}>
            Hubungkan
          </button>
          <p className="vpn-tip">
            Tips: Cari "free socks5 proxy" di GitHub atau hidemy.name untuk daftar server terbaru.
          </p>
        </div>
      )}
    </div>
  )
}
