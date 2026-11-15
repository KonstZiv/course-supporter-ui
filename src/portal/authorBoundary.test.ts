import { describe, expect, it } from 'vitest'

// The portal shares the billing components with the author app, but never the
// author's client: that client brings the author's key store, which reads the
// author's key from the browser the moment it loads. Nor the author's letter
// to the administrator (ContactAdmin), written on the author's behalf. This
// follows every import the portal's bundle starts from (portal/main.tsx) and
// holds it away from them. Type-only imports leave nothing in the bundle and
// are not followed.

const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const FORBIDDEN = [
  /^\/src\/api\//,
  /^\/src\/stores\//,
  /^\/src\/components\/ui\/ContactAdmin\.tsx$/,
  /^\/src\/components\/billing\/(CheckoutNotice|PackagesSection|StatementSection|FailureWithLetter)\.tsx$/,
]

// `import … from './x'`, `export … from './x'`, `import './x'` — not `import type`.
const IMPORT = /(?:^|\n)\s*(?:import|export)\s+(?!type\s)(?:[^'";]*?\sfrom\s+)?['"](\.{1,2}\/[^'"]+)['"]/g

function resolve(from: string, specifier: string): string | null {
  const parts = from.split('/').slice(0, -1)
  for (const piece of specifier.split('/')) {
    if (piece === '..') parts.pop()
    else if (piece !== '.') parts.push(piece)
  }
  const base = parts.join('/')
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (candidate in sources) return candidate
  }
  return null // a stylesheet, a font: no code of the app
}

function reachedFrom(entry: string): Map<string, string> {
  const via = new Map<string, string>([[entry, '(entry)']])
  const queue = [entry]
  while (queue.length > 0) {
    const file = queue.shift()!
    for (const match of (sources[file] ?? '').matchAll(IMPORT)) {
      const target = resolve(file, match[1]!)
      if (target && !via.has(target)) {
        via.set(target, file)
        queue.push(target)
      }
    }
  }
  return via
}

describe('the portal bundle and the author app', () => {
  const reached = reachedFrom('/src/portal/main.tsx')

  it('follows the imports (the walk reaches the shared billing components)', () => {
    expect(reached.has('/src/portal/pages/PortalBillingPage.tsx')).toBe(true)
    expect(reached.has('/src/components/billing/PackagesPurchase.tsx')).toBe(true)
    expect(reached.has('/src/hooks/useCheckoutWatch.ts')).toBe(true)
  })

  it("never reaches the author's client, stores or letter", () => {
    const found = [...reached]
      .filter(([file]) => FORBIDDEN.some((rule) => rule.test(file)))
      .map(([file, from]) => `${file} ← ${from}`)
    expect(found).toEqual([])
  })

  it('bites: the author app itself does reach them', () => {
    const author = reachedFrom('/src/main.tsx')
    expect([...author.keys()].some((file) => FORBIDDEN[0]!.test(file))).toBe(true)
  })
})
