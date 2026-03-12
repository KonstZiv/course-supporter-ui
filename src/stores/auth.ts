import { create } from 'zustand'

interface AuthState {
  apiKey: string | null
  connected: boolean
  setApiKey: (key: string) => void
  setConnected: (ok: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: localStorage.getItem('cs_api_key'),
  connected: false,
  setApiKey: (key) => {
    localStorage.setItem('cs_api_key', key)
    set({ apiKey: key })
  },
  setConnected: (ok) => set({ connected: ok }),
  logout: () => {
    localStorage.removeItem('cs_api_key')
    set({ apiKey: null, connected: false })
  },
}))
