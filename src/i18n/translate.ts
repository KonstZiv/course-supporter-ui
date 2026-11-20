// Messages by key, in a language. The catalogs are ICU MessageFormat: a
// number's plural form, a name put into a sentence, a part of a sentence
// wrapped in markup — all said in the message, not in code.
//
// The key type comes from the Ukrainian catalog, the default language: a key
// that is not there is a type error. A language without a catalog of its own,
// or a key its catalog lacks, falls back to the default language's message.

import { IntlMessageFormat, type FormatXMLElementFn, type PrimitiveType } from 'intl-messageformat'
import enPortal from './catalogs/en/portal.json'
import enShared from './catalogs/en/shared.json'
import ukPortal from './catalogs/uk/portal.json'
import ukShared from './catalogs/uk/shared.json'
import { DEFAULT_LANGUAGE, localeOf, type Language } from './languages'

const UK = { ...ukShared, ...ukPortal }

export type MessageKey = keyof typeof UK
export type Catalog = Readonly<Record<MessageKey, string>>

/** What a message puts into its placeholders: `{name}`, `{count, plural, …}`. */
export type MessageValues = Record<string, PrimitiveType>

/** A message with markup also takes a function per tag: `<b>…</b>`. */
export type RichValues<T> = Record<string, PrimitiveType | T | FormatXMLElementFn<T>>

const EN: Catalog = { ...enShared, ...enPortal }

const CATALOGS: Partial<Record<Language, Partial<Catalog>>> = { uk: UK, en: EN }

const compiledMessages = new Map<string, IntlMessageFormat>()

function compiled(language: Language, key: MessageKey): IntlMessageFormat {
  const own = CATALOGS[language]?.[key]
  const source = own === undefined ? DEFAULT_LANGUAGE : language
  const cacheKey = `${source}\u0000${key}`
  let message = compiledMessages.get(cacheKey)
  if (message === undefined) {
    message = new IntlMessageFormat(own ?? UK[key], localeOf(source))
    compiledMessages.set(cacheKey, message)
  }
  return message
}

/** The message of `key` in `language`, with `values` put in. */
export function translate(
  language: Language,
  key: MessageKey,
  values?: MessageValues,
): string {
  const out = compiled(language, key).format<string>(values)
  return Array.isArray(out) ? out.join('') : String(out)
}

/** The message of `key` as parts, where tags in it became what `values` made of them. */
export function translateRich<T>(
  language: Language,
  key: MessageKey,
  values: RichValues<T>,
): Array<string | T> {
  const out = compiled(language, key).format<T>(values)
  return Array.isArray(out) ? out : [out]
}
