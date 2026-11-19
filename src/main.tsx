import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from './router'
import { LanguageProvider } from './i18n/LanguageProvider'
import './fonts'
import './index.css'
import './author.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <RouterProvider router={createAppRouter()} />
    </LanguageProvider>
  </StrictMode>,
)
