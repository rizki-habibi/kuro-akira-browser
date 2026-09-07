# 🌑 Kuro Akira Browser

> **Private. Fast. Yours.**
> A personal browser built with Electron + React featuring ad blocking, anti-fingerprinting, Tor support, and a dark futuristic UI.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🚫 **Ad Blocker** | Blocks 100+ ad networks & trackers using built-in filter lists |
| 🛡 **Anti-Fingerprinting** | Spoof canvas, screen size, CPU cores, memory, WebRTC |
| 🎭 **User-Agent Rotation** | Random or custom UA to prevent tracking |
| 🧅 **Tor Support** | Route traffic through Tor SOCKS5 proxy |
| 🔒 **HTTPS Indicator** | Visual security indicator for all connections |
| 📑 **Multi-Tab** | Full tabbed browsing with smooth UI |
| 🗑 **Auto Clear** | Clear all data on exit (Paranoid mode) |
| 🌐 **Privacy Search** | Default search via Brave Search |
| 🎨 **Dark Futuristic UI** | Custom frameless window with gradient design |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v18+ 
- npm v9+
- (Optional) [Tor Browser](https://www.torproject.org) for Tor routing

### Install & Run (Development)

```bash
# Install dependencies
npm install

# Start in dev mode (Vite + Electron)
npm run dev
```

### Build for Windows

```bash
# Build distributable installer (.exe)
npm run dist
```

Output will be in `dist-app/` folder.

---

## 📁 Project Structure

```
kuro-akira/
├── electron/
│   ├── main.js          # Electron main process (privacy, ad block, Tor)
│   └── preload.js       # Secure IPC bridge + anti-fingerprint injection
├── src/
│   ├── components/
│   │   ├── TitleBar      # Custom frameless title bar
│   │   ├── TabBar        # Multi-tab management
│   │   ├── NavigationBar # Address bar + nav controls
│   │   ├── BrowserView   # Webview wrapper
│   │   ├── StatusBar     # Privacy status bar
│   │   └── SettingsPanel # Full settings UI
│   ├── pages/
│   │   └── NewTabPage    # Beautiful new tab with search & quick links
│   └── styles/
│       └── global.css    # Dark futuristic design system
├── filters/
│   └── easylist-core.txt # Built-in ad/tracker block list (100+ networks)
├── public/icons/         # App icons
├── package.json
└── vite.config.js
```

---

## ⚙️ Privacy Levels

| Level | What it does |
|---|---|
| **Standard** | Basic ad/tracker blocking |
| **High** | + Strip Referer header, send DNT/GPC headers |
| **Paranoid** | + Remove all Client Hints headers, clear all data on exit |

---

## 🧅 Tor Setup

1. Download and install [Tor Browser](https://www.torproject.org/download/)
2. Start Tor Browser (it runs a SOCKS5 proxy on `127.0.0.1:9150`) or install Tor service (port `9050`)
3. In Kuro Akira Settings → Network → Enable Tor
4. Set Host: `127.0.0.1`, Port: `9050` (or `9150` for Tor Browser)

---

## 🔧 Adding Custom Filter Lists

Drop `.txt` files in the `filters/` folder using EasyList format:

```
||example-ads.com^
||tracker.example.net^
```

Restart the browser to reload filters.

---

## 🛠 Tech Stack

- **Electron** 31 — Desktop shell
- **React** 18 + **Vite** 5 — UI framework
- **electron-store** — Persistent settings
- **Space Grotesk + Inter** — Typography

---

## 📜 License

MIT — Personal use. Built for privacy.

---

*Kuro Akira — Black Tomorrow. Your browser, your rules.*
