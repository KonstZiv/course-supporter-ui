import { describe, it, expect } from 'vitest'

// Every source file's text, as the bundler sees it — tests excluded, this one too.
const sources = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
)

describe('author.css', () => {
  it("is loaded by the author program's entry alone: the portal keeps its look", () => {
    const portal = Object.keys(sources).filter((path) => path.startsWith('./portal/'))
    const loaders = Object.entries(sources)
      .filter(([, text]) => text.includes('author.css'))
      .map(([path]) => path)

    expect(portal.length, 'the portal is among the sources read').toBeGreaterThan(0)
    // The portal's entry imports index.css; a shared module that imported
    // author.css would carry it into the portal, so only the entry may.
    expect(loaders).toEqual(['./main.tsx'])
  })
})
