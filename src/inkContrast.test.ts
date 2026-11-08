import { describe, it, expect } from 'vitest'

const tailwindConfigModules = import.meta.glob<string>(['/tailwind.config.js'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const sources = import.meta.glob<string>(
  ['./**/*.{ts,tsx}', '!./**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
)

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ]
}

function channelLuminance(val: number): number {
  const s = val / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  )
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(parseHex(hex1))
  const l2 = relativeLuminance(parseHex(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

describe('ink-muted contrast (DD-AP-I)', () => {
  it('meets WCAG AA contrast ratio of at least 4.5:1 on key backgrounds', () => {
    const tailwindRaw = tailwindConfigModules['/tailwind.config.js']
    expect(tailwindRaw, 'tailwind.config.js was loaded').toBeDefined()
    if (!tailwindRaw) return

    const mutedMatch = tailwindRaw.match(/muted:\s*'(#[0-9a-fA-F]{6})'/)
    const canvasDefaultMatch = tailwindRaw.match(
      /canvas:\s*\{[^}]*DEFAULT:\s*'(#[0-9a-fA-F]{6})'/,
    )
    const canvasDarkMatch = tailwindRaw.match(
      /canvas:\s*\{[^}]*dark:\s*'(#[0-9a-fA-F]{6})'/,
    )

    expect(mutedMatch, 'ink.muted found in tailwind.config.js').not.toBeNull()
    expect(canvasDefaultMatch, 'canvas.DEFAULT found in tailwind.config.js').not.toBeNull()
    expect(canvasDarkMatch, 'canvas.dark found in tailwind.config.js').not.toBeNull()

    const muted = mutedMatch?.[1] ?? ''
    const canvasDefault = canvasDefaultMatch?.[1] ?? ''
    const canvasDark = canvasDarkMatch?.[1] ?? ''

    const backgrounds = [
      { name: '#FFFFFF', hex: '#FFFFFF' },
      { name: `canvas.DEFAULT (${canvasDefault})`, hex: canvasDefault },
      { name: `canvas.dark (${canvasDark})`, hex: canvasDark },
    ]

    for (const bg of backgrounds) {
      const ratio = contrastRatio(muted, bg.hex)
      expect(
        ratio,
        `Contrast between ink.muted (${muted}) and ${bg.name} is ${ratio.toFixed(2)}:1, expected at least 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('has no opacity modifiers on text-ink-muted in source files', () => {
    const offenders: string[] = []
    for (const [path, content] of Object.entries(sources)) {
      if (/text-ink-muted\/\d/.test(content)) {
        offenders.push(path)
      }
    }
    expect(
      offenders,
      `Source files with diluted text-ink-muted (opacity modifier reduces contrast): ${offenders.join(', ')}`,
    ).toEqual([])
  })
})
