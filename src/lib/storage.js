// Safe LocalStorage wrapper for browser & restricted iframes
const memoryStore = {}

export const safeStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key)
      }
    } catch (_) {}
    return memoryStore[key] ?? null
  },
  setItem: (key, val) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(val))
        return
      }
    } catch (_) {}
    memoryStore[key] = String(val)
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key)
        return
      }
    } catch (_) {}
    delete memoryStore[key]
  },
  getJSON: (key, defaultVal = null) => {
    try {
      const raw = safeStorage.getItem(key)
      return raw ? JSON.parse(raw) : defaultVal
    } catch (_) {
      return defaultVal
    }
  },
  setJSON: (key, val) => {
    try {
      safeStorage.setItem(key, JSON.stringify(val))
    } catch (_) {}
  }
}
