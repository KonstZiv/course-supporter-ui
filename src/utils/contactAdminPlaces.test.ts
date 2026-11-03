import { describe, expect, it } from 'vitest'

const sources = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
)

describe('contactAdminPlaces', () => {
  it('counts occurrences of "напишіть нам" across non-test source files', () => {
    const EXPECTED_COUNTS: Record<string, number> = {
      'RouteErrorPage.tsx': 1,
      'NodeDetailPanel.tsx': 1,
      'FlowContextMenu.tsx': 1,
      'ingestErrors.ts': 2,
      'testRefusals.ts': 2,
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

    expect(
      actualCounts,
      'Нове повідомлення «напишіть нам»: покажіть біля нього ContactAdmin і додайте файл у перелік цього тесту.',
    ).toEqual(EXPECTED_COUNTS)
  })
})
