import { api } from './client'
import type { AllowedLanguagesResponse } from '../types/api'

// Course-config lookup endpoint (Task 2.4.13).
//
// Single read-only call; backend serves the same 57-language whitelist
// that gates POST /api/v1/nodes default_language. UI consumes this as
// its sole source of truth — no hardcoded language list on the client.
// Pattern mirrors api/cost.ts (thin api.get wrapper + typed response).
//
// A future companion call ``getAllowedExtensions()`` will live here
// when DD-2.4-I (allowed_extensions serialization) lands.

export const configApi = {
  getLanguages: () =>
    api.get<AllowedLanguagesResponse>('/api/v1/config/languages'),
}
