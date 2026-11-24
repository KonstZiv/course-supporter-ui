import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from './router'
import { PanelLanguageProvider } from './components/layout/PanelLanguageProvider'
import './fonts'
import './index.css'
import './author.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PanelLanguageProvider>
      <RouterProvider router={createAppRouter()} />
    </PanelLanguageProvider>
  </StrictMode>,
)
