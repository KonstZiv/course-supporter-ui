import { create } from 'zustand'

// Portal student session store (Phase 6 / T4b, ratify Q5). Mirrors the
// author app's localStorage-backed Zustand pattern (``stores/auth.ts``) but
// is a SEPARATE store with its own keys — the bearer session never shares
// state with the apiKey store.
//
// The token is a stateless HS256 JWT (12h TTL, backend ``portal_session_ttl_
// hours``); we keep no server session record. ``tenantId`` is captured at
// login (from the URL segment / login form) and feeds the
// ``PortalProtectedRoute`` tenant-match guard (ratify Q3). No proactive TTL
// timer — invalidation is lazy, centralised in ``portalClient`` (any bearer
// call returning 401 → ``clear()`` + redirect to login).

const TOKEN_KEY = 'cs_portal_token'
const TENANT_KEY = 'cs_portal_tenant'
const STUDENT_KEY = 'cs_portal_student'
const NAME_KEY = 'cs_portal_name'

interface SessionData {
  token: string
  tenantId: string
  studentId: string
  displayName: string | null
}

interface PortalSessionState {
  token: string | null
  tenantId: string | null
  studentId: string | null
  displayName: string | null
  setSession: (data: SessionData) => void
  clear: () => void
}

export const usePortalSession = create<PortalSessionState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  tenantId: localStorage.getItem(TENANT_KEY),
  studentId: localStorage.getItem(STUDENT_KEY),
  displayName: localStorage.getItem(NAME_KEY),
  setSession: ({ token, tenantId, studentId, displayName }) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(TENANT_KEY, tenantId)
    localStorage.setItem(STUDENT_KEY, studentId)
    if (displayName !== null) {
      localStorage.setItem(NAME_KEY, displayName)
    } else {
      localStorage.removeItem(NAME_KEY)
    }
    set({ token, tenantId, studentId, displayName })
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TENANT_KEY)
    localStorage.removeItem(STUDENT_KEY)
    localStorage.removeItem(NAME_KEY)
    set({ token: null, tenantId: null, studentId: null, displayName: null })
  },
}))
