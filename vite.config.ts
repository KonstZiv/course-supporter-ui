import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only routing for the portal SPA (Phase 6 / T4b, ratify Q1=A). The portal
// is a SECOND Vite input (portal.html) and its routes are /<tenant-id>/...
// where the tenant is a UUID (ratify Q3). In `npm run dev` a request whose
// first path segment is a UUID is a portal deep-link → serve portal.html, so
// the portal boots at clean URLs, mirroring its own-origin SPA fallback in
// production. Author routes (/, /login, /course, /cost — never a UUID first
// segment) fall through to Vite's default index.html. Build is untouched
// (apply: 'serve'); module/asset requests are absolute (/src, /@vite, /node_
// modules), never under a UUID segment, so they are not rewritten.
function portalDevRouting(): Plugin {
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return {
    name: 'portal-dev-routing',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // ``req`` is a connect IncomingMessage; read/write ``url`` via a narrow
        // cast (the repo does not depend on @types/node for the config scope).
        const r = req as { url?: string }
        const url = r.url ?? '/'
        const pathname = url.split('?')[0] ?? '/'
        const first = pathname.split('/').filter(Boolean)[0] ?? ''
        if (UUID_RE.test(first)) {
          r.url = '/portal.html'
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), portalDevRouting()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Default proxy points at local backend for sub-area `ui`
        // smoke-testing (Phase 1 KD-η.2/η.3). Override per
        // developer if hitting prod is needed.
        target: 'https://api.pythoncourse.me',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      // Two SPA inputs: author (index.html) + portal (portal.html). Each is a
      // separate static bundle (ratify Q1=A).
      input: {
        main: './index.html',
        portal: './portal.html',
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          flow: ['@xyflow/react', '@dagrejs/dagre'],
          ui: ['framer-motion', 'lucide-react', 'react-markdown', 'react-dropzone']
        }
      }
    }
  }
})
