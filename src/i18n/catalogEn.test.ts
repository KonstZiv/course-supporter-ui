import { describe, expect, it } from 'vitest'
import { IntlMessageFormat } from 'intl-messageformat'
import enPortal from './catalogs/en/portal.json'
import enShared from './catalogs/en/shared.json'
import ukPortal from './catalogs/uk/portal.json'
import ukShared from './catalogs/uk/shared.json'
import { localeOf } from './languages'

// The English catalog against the Ukrainian one, the language every key is
// first written in: the same keys in each file, every message ICU the
// formatter reads, the same placeholders and tags in each message — and
// nothing of the Ukrainian alphabet left in it.

type Element = ReturnType<IntlMessageFormat['getAst']>[number]

/** The placeholders ("{name}") and tags ("<mail>") of a message, sorted. */
function shapeOf(message: string, locale: string): string[] {
  const found = new Set<string>()
  const walk = (elements: Element[]) => {
    for (const element of elements) {
      if ('options' in element) {
        // A plural or a select: its argument, and what each branch holds.
        found.add(`{${element.value}}`)
        for (const option of Object.values(element.options)) walk(option.value)
      } else if ('children' in element) {
        found.add(`<${element.value}>`)
        walk(element.children)
      } else if ('value' in element && !isLiteral(element)) {
        found.add(`{${element.value}}`)
      }
    }
  }
  walk(new IntlMessageFormat(message, locale).getAst())
  return [...found].sort()
}

// Literal text is the one element whose `value` is not a name; "#" has none.
const LITERAL = new IntlMessageFormat('x', 'en').getAst()[0]!.type
const isLiteral = (element: Element) => element.type === LITERAL

const CYRILLIC = /[Ѐ-ӿ]/

const pairs = [
  { file: 'shared.json', uk: ukShared as Record<string, string>, en: enShared as Record<string, string> },
  { file: 'portal.json', uk: ukPortal as Record<string, string>, en: enPortal as Record<string, string> },
]

describe.each(pairs)('the en catalog, $file', ({ uk, en }) => {
  it('has exactly the keys of uk', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(uk).sort())
  })

  it('every message is ICU MessageFormat', () => {
    const broken = Object.entries(en).filter(([, message]) => {
      try {
        new IntlMessageFormat(message, localeOf('en'))
        return false
      } catch {
        return true
      }
    })
    expect(broken).toEqual([])
  })

  it('every message has the placeholders and tags of its uk message', () => {
    const differ = Object.keys(uk)
      .filter((key) => key in en)
      .map((key) => ({
        key,
        uk: shapeOf(uk[key]!, localeOf('uk')),
        en: shapeOf(en[key]!, localeOf('en')),
      }))
      .filter(({ uk: a, en: b }) => a.join(' ') !== b.join(' '))
    expect(differ).toEqual([])
  })

  it('has no Cyrillic', () => {
    expect(Object.entries(en).filter(([, message]) => CYRILLIC.test(message))).toEqual([])
  })
})

describe('the shape reading', () => {
  it('finds placeholders inside plurals, and tags', () => {
    expect(shapeOf('{count, plural, one {{n} unit} other {{n} units}}', 'en')).toEqual([
      '{count}',
      '{n}',
    ])
    expect(shapeOf('Support: <mail>{address}</mail>', 'en')).toEqual(['<mail>', '{address}'])
    expect(shapeOf('{count, plural, one {# file} other {# files}}', 'en')).toEqual(['{count}'])
  })
})
