// Loaded by vitest (see vitest.config.ts setupFiles). The
// `/vitest` subpath is the vitest-aware entry point — it imports
// `expect` from vitest directly rather than relying on a Jest global,
// so it works with the default vitest 4 config (globals=false).
import '@testing-library/jest-dom/vitest'

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Global RTL DOM cleanup after every test. With vitest globals=false, RTL
// does not auto-cleanup, so each mounted tree would otherwise leak across
// tests ("found multiple elements"). Registering it here (DD-2.4-M, Task
// 3.2.5a) removes the per-file ``afterEach(cleanup)`` boilerplate. Future
// global hooks (e.g. MSW server lifecycle) belong here too.
afterEach(() => {
  cleanup()
})
