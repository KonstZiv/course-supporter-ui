import { describe, it, expect, beforeEach } from 'vitest'
import { usePortalSession } from './session'

const SESSION = {
  token: 'jwt-token',
  tenantId: '019eda80-67ea-7060-b4c4-9dc85761690e',
  studentId: '019edaa5-1111-7000-8000-000000000001',
  displayName: 'Олена',
}

describe('usePortalSession', () => {
  beforeEach(() => {
    localStorage.clear()
    usePortalSession.getState().clear()
  })

  it('setSession persists every field to state and localStorage', () => {
    usePortalSession.getState().setSession(SESSION)

    const state = usePortalSession.getState()
    expect(state.token).toBe(SESSION.token)
    expect(state.tenantId).toBe(SESSION.tenantId)
    expect(state.studentId).toBe(SESSION.studentId)
    expect(state.displayName).toBe(SESSION.displayName)

    expect(localStorage.getItem('cs_portal_token')).toBe(SESSION.token)
    expect(localStorage.getItem('cs_portal_tenant')).toBe(SESSION.tenantId)
    expect(localStorage.getItem('cs_portal_student')).toBe(SESSION.studentId)
    expect(localStorage.getItem('cs_portal_name')).toBe(SESSION.displayName)
  })

  it('setSession with null display_name removes the name key', () => {
    usePortalSession.getState().setSession({ ...SESSION, displayName: 'X' })
    usePortalSession.getState().setSession({ ...SESSION, displayName: null })

    expect(usePortalSession.getState().displayName).toBeNull()
    expect(localStorage.getItem('cs_portal_name')).toBeNull()
  })

  it('clear removes the session from state and localStorage', () => {
    usePortalSession.getState().setSession(SESSION)
    usePortalSession.getState().clear()

    const state = usePortalSession.getState()
    expect(state.token).toBeNull()
    expect(state.tenantId).toBeNull()
    expect(state.studentId).toBeNull()
    expect(state.displayName).toBeNull()
    expect(localStorage.getItem('cs_portal_token')).toBeNull()
  })
})
