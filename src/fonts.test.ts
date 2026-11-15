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
const [fontsModule] = Object.values(
  import.meta.glob<string>('/src/fonts.ts', { query: '?raw', import: 'default', eager: true }),
)

interface TailwindConfig {
  theme: { extend: { fontFamily: Record<string, string[]> } }
}
const [tailwindConfig] = Object.values(
  import.meta.glob<TailwindConfig>('/tailwind.config.js', { import: 'default', eager: true }),
)

/** The packages src/fonts.ts imports, in order. */
function importedPackages(source: string): string[] {
  return [...source.matchAll(/^import '([^']+)'$/gm)].map((m) => m[1] ?? '')
}

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

  it("loads the site's fonts: Source Serif 4 at 600 and Manrope as a variable font", () => {
    expect(fontsModule, 'src/fonts.ts was loaded').toBeDefined()
    expect(importedPackages(fontsModule ?? '')).toEqual([
      '@fontsource/source-serif-4/600.css',
      '@fontsource-variable/manrope',
      '@fontsource/jetbrains-mono/400.css',
      '@fontsource/jetbrains-mono/500.css',
    ])
  })

  it('no longer loads DM Serif Display or Plus Jakarta Sans', () => {
    expect(fontsModule).not.toMatch(/dm-serif-display/i)
    expect(fontsModule).not.toMatch(/plus-jakarta-sans/i)
  })

  it('names the same families in tailwind.config.js', () => {
    expect(tailwindConfig, 'tailwind.config.js was loaded').toBeDefined()
    const fontFamily = tailwindConfig?.theme.extend.fontFamily ?? {}
    expect(fontFamily.display).toEqual(['"Source Serif 4"', 'Georgia', '"Times New Roman"', 'serif'])
    expect(fontFamily.body).toEqual([
      '"Manrope Variable"',
      'system-ui',
      '-apple-system',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ])
    expect(fontFamily.mono).toEqual(['"JetBrains Mono"', 'monospace'])
  })
})
