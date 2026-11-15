import { describe, it, expect } from 'vitest'

// The palette in tailwind.config.js follows the public site
// (course-supporter-site, src/styles/global.css, @theme).
interface TailwindConfig {
  theme: { extend: { colors: Record<string, Record<string, string>> } }
}
const [config] = Object.values(
  import.meta.glob<TailwindConfig>('/tailwind.config.js', { import: 'default', eager: true }),
)
const colors = config?.theme.extend.colors ?? {}

describe('palette', () => {
  it("has the site's accents sun, apricot and sky", () => {
    expect(config, 'tailwind.config.js was loaded').toBeDefined()
    expect(colors.sun).toEqual({ DEFAULT: '#F5C542', pale: '#FFF4CC' })
    expect(colors.apricot).toEqual({ DEFAULT: '#F4A261', pale: '#FDEBDD' })
    expect(colors.sky).toEqual({ DEFAULT: '#8CCBE0', pale: '#E3F3F9' })
  })

  it('keeps its own ink.muted: here it carries text', () => {
    expect(colors.ink?.muted).toBe('#62627A')
  })
})
