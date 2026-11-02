import { create } from 'zustand'
import { STORAGE_KEYS } from '../privacy/surface'

interface AuthState {
  apiKey: string | null
  connected: boolean
  setApiKey: (key: string) => void
  setConnected: (ok: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: localStorage.getItem(STORAGE_KEYS.authorApiKey),
  connected: false,
  setApiKey: (key) => {
    localStorage.setItem(STORAGE_KEYS.authorApiKey, key)
    set({ apiKey: key })
  },
  setConnected: (ok) => set({ connected: ok }),
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.authorApiKey)
    set({ apiKey: null, connected: false })
  },
}))
