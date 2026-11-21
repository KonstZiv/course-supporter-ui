import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PortalApp } from './App'
import { PortalLanguageProvider } from './components/PortalLanguageProvider'
import { takeLanguageFromAddress } from './stores/language'
import '../fonts'
import '../index.css'

// Portal SPA entry point (Phase 6 / T4b, c1) — a SECOND Vite input
// (portal.html), separate from the author app's main.tsx. Reuses the shared
// index.css (Tailwind layers); the author app is untouched.
//
// The language the site led in with (`?lang=`) is taken before the router
// reads the address.
takeLanguageFromAddress()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PortalLanguageProvider>
      <BrowserRouter>
        <PortalApp />
      </BrowserRouter>
    </PortalLanguageProvider>
  </StrictMode>,
)
