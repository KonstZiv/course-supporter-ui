import { describe, expect, it } from 'vitest'

const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
)

const ukCatalogs = import.meta.glob<Record<string, string>>(
  '/src/i18n/catalogs/uk/*.json',
  {
    import: 'default',
    eager: true,
  },
)

describe('contactAdminPlaces', () => {
  it('counts occurrences of "напишіть нам" across non-test source files and uk catalogs', () => {
    const EXPECTED_COUNTS: Record<string, number> = {
      'panel.flow.detail.startProcessingFailed': 1,
      'panel.flow.contextMenu.renameFailed': 1,
      'ingestErrors.ts': 2,
      'testRefusals.ts': 2,
      'panel.routeError.description': 1,
      'panel.billing.loadFailed': 1,
      'panel.billing.providerUnavailable': 1,
      'panel.billing.actionFailed': 1,
    }

    const actualCounts: Record<string, number> = {}

    for (const [path, content] of Object.entries(sources)) {
      if (path.endsWith('/contactAdmin.ts')) {
        continue
      }
      const matches = content.match(/напишіть нам/gi)
      if (matches && matches.length > 0) {
        const basename = path.split('/').pop() ?? path
        actualCounts[basename] = (actualCounts[basename] ?? 0) + matches.length
      }
    }

    for (const catalog of Object.values(ukCatalogs)) {
      for (const [key, message] of Object.entries(catalog)) {
        if (key === 'panel.contactAdmin.writeToUsPhrase') {
          continue
        }
        const matches = message.match(/напишіть нам/gi)
        if (matches && matches.length > 0) {
          actualCounts[key] = (actualCounts[key] ?? 0) + matches.length
        }
      }
    }

    expect(
      actualCounts,
      'Нове повідомлення «напишіть нам»: покажіть біля нього ContactAdmin і додайте файл або ключ у перелік цього тесту.',
    ).toEqual(EXPECTED_COUNTS)
  })
})
