import { describe, it, expect } from 'vitest'

// The two entries and the two HTML pages, as the bundler sees them.
const entries = import.meta.glob<string>(['/src/main.tsx', '/src/portal/main.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
})
const pages = import.meta.glob<string>(['/index.html', '/portal.html'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

describe('self-hosted fonts', () => {
  it('both entries import the fonts module', () => {
    expect(Object.keys(entries).sort()).toEqual(['/src/main.tsx', '/src/portal/main.tsx'])
    expect(entries['/src/main.tsx']).toMatch(/^import '\.\/fonts'$/m)
    expect(entries['/src/portal/main.tsx']).toMatch(/^import '\.\.\/fonts'$/m)
  })

  it('no page loads fonts from Google', () => {
    expect(Object.keys(pages).sort()).toEqual(['/index.html', '/portal.html'])
    for (const [path, html] of Object.entries(pages)) {
      expect(html, path).not.toContain('fonts.googleapis.com')
      expect(html, path).not.toContain('fonts.gstatic.com')
    }
  })
})
