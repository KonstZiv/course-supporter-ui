// Everything the apps keep in the user's browser, in one place. The privacy
// policy describes this surface: a new key, a changed key or a new module
// that touches browser storage is a change to what the policy must say.
// src/privacy/browserStorage.test.ts holds the code to this list.
//
// The values are what existing browsers already hold: changing one logs
// every user out.
export const STORAGE_KEYS = {
  /** Author app: the API key the author signed in with. */
  authorApiKey: 'cs_api_key',
  /** Portal: the student's session token. */
  portalToken: 'cs_portal_token',
  /** Portal: the author space (tenant) the student signed in to. */
  portalTenant: 'cs_portal_tenant',
  /** Portal: the student's identifier. */
  portalStudent: 'cs_portal_student',
  /** Portal: the student's display name. */
  portalName: 'cs_portal_name',
  /** Author app: the "already seen" flag of the roles intro dialog. */
  rolesIntroSeen: 'cs_roles_intro_seen',
} as const

/** The only modules that may touch browser storage (paths from the repo root). */
export const STORAGE_MODULES = [
  'src/stores/auth.ts',
  'src/portal/stores/session.ts',
  'src/components/ui/rolesIntro.ts',
] as const
