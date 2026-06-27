import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Dev-only routing for the portal SPA (Phase 6 / T4b, ratify Q1=A). The portal
// is a SECOND Vite input (portal.html) and its routes are /<tenant-id>/...
// where the tenant is a UUID (ratify Q3). In `npm run dev` a request whose
// first path segment is a UUID is a portal deep-link → serve portal.html, so
// the portal boots at clean URLs. Author routes (/, /login, /course, /cost —
// never a UUID first segment) fall through to Vite's default index.html. Build
// is untouched (apply: 'serve'); module/asset requests are absolute (/src,
// /@vite, /node_modules), never under a UUID segment, so they are not rewritten.
//
// Allowlist-by-UUID is intentional, and so is its one limitation — vision-side
// ratified at T4b c1 live-acceptance gesture (g):
//   (i)   We match the portal by a UUID first segment (allowlist), not by the
//         author's route set.
//   (ii)  Prod-equivalence comes from Q1=A: the portal deploys to its OWN
//         origin with its own SPA fallback, so in prod EVERY path (including
//         /not-a-uuid/home) serves the portal SPA → InvalidPortalLink.
//   (iii) Dev limitation: a DIRECT non-UUID-tenant URL (e.g. /not-a-uuid/home)
//         does NOT reach the portal in this shared dev server — it falls to the
//         author app. The portal's invalid-tenant handling (InvalidPortalLink +
//         zero backend fetch) is exercised in dev only via the catch-all
//         (/<uuid>/<unknown> → InvalidPortalLink) and the unit tests
//         (PortalLoginPage / PortalProtectedRoute). Not a surface defect — a
//         dev-harness artifact of one shared origin.
//   (iv)  A denylist (rewrite everything that ISN'T an author route) was
//         rejected: it would couple this portal dev-config to the author route
//         table — the same author-route coupling/collision class rejected in Q1
//         (A over B). The allowlist flaw self-isolates: it encodes nothing about
//         the author app, does not drift when author routes change, never ships.
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
