import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PortalApp } from './App'
import '../index.css'

// Portal SPA entry point (Phase 6 / T4b, c1) — a SECOND Vite input
// (portal.html), separate from the author app's main.tsx. Reuses the shared
// index.css (Tailwind layers); the author app is untouched.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PortalApp />
    </BrowserRouter>
  </StrictMode>,
)
