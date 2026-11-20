// Which language the portal speaks, from what each source says. The first
// source that names an enabled language wins:
//
//   1. the choice just made with the switcher;
//   2. the choice stored on the server (`interface_language`, ISO 639-3);
//   3. `?lang=<code>` in the address — the site leads into the portal with it;
//   4. the choice stored in this browser;
//   5. the browser's own languages (`navigator.languages`), in their order;
//   6. the default language.
//
// Before sign-in there is no server choice, and a server choice the portal
// does not speak counts as none. Pure: the sources are read by the caller.

import {
  DEFAULT_LANGUAGE,
  languageFromCode,
  languageFromIso3,
  type Language,
} from '../i18n/languages'

export interface LanguageSources {
  picked?: Language | null
  server?: string | null
  query?: string | null
  stored?: string | null
  browser?: readonly string[]
}

export function resolveLanguage({
  picked = null,
  server = null,
  query = null,
  stored = null,
  browser = [],
}: LanguageSources): Language {
  return (
    picked ??
    languageFromIso3(server) ??
    languageFromCode(query) ??
    languageFromCode(stored) ??
    browser.map(languageFromCode).find((l) => l !== null) ??
    DEFAULT_LANGUAGE
  )
}
