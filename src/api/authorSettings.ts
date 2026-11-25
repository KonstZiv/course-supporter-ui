import { api } from './client'
import type {
  AuthorInterfaceLanguageRequest,
  AuthorInterfaceLanguageResponse,
} from '../types/api'

/**
 * Author-level interface settings persisted on the tenant (№724).
 */
export const authorSettingsApi = {
  getInterfaceLanguage: () =>
    api.get<AuthorInterfaceLanguageResponse>('/api/v1/author/interface-language'),
  setInterfaceLanguage: (language: string) =>
    api.put<AuthorInterfaceLanguageResponse>('/api/v1/author/interface-language', {
      language,
    } satisfies AuthorInterfaceLanguageRequest),
}
