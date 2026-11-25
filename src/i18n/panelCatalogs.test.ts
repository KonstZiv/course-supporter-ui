import { describe, expect, it, vi } from 'vitest'
import ts from 'typescript'
import enPanel from './catalogs/en/panel.json'
import { importGraph, SOURCES } from './sourceScan'
import { registerCatalog, translate, type Catalog } from './translate'

describe('registerCatalog', () => {
  it('registers English panel messages without altering previously compiled Ukrainian messages', async () => {
    vi.resetModules()
    const freshTranslate = await import('./translate')

    expect(freshTranslate.translate('uk', 'panel.header.nav.courses')).toBe('Курси')

    // Even if an English lookup fell back to Ukrainian before registration,
    // registering the English catalog switches subsequent English lookups and
    // leaves the compiled Ukrainian entry intact.
    expect(freshTranslate.translate('en', 'panel.header.nav.courses')).toBe('Курси')

    freshTranslate.registerCatalog('en', enPanel as Partial<Catalog>)

    expect(freshTranslate.translate('en', 'panel.header.nav.courses')).toBe('Courses')
    expect(freshTranslate.translate('uk', 'panel.header.nav.courses')).toBe('Курси')
  })

  it('drops previously compiled messages of the registered language so overrides take effect', () => {
    registerCatalog('en', { 'panel.header.nav.courses': 'Initial' })
    expect(translate('en', 'panel.header.nav.courses')).toBe('Initial')

    registerCatalog('en', enPanel as Partial<Catalog>)
    expect(translate('en', 'panel.header.nav.courses')).toBe('Courses')
  })
})

describe('loadPanelLanguage', () => {
  it('does not load English catalog for uk, and loads it on demand for en', async () => {
    vi.resetModules()
    const freshCatalogs = await import('./panelCatalogs')
    const freshTranslate = await import('./translate')

    expect(freshCatalogs.isPanelLanguageReady('uk')).toBe(true)
    expect(freshCatalogs.isPanelLanguageReady('en')).toBe(false)

    await freshCatalogs.loadPanelLanguage('uk')
    expect(freshCatalogs.isPanelLanguageReady('en')).toBe(false)

    await freshCatalogs.loadPanelLanguage('en')
    expect(freshCatalogs.isPanelLanguageReady('en')).toBe(true)
    expect(freshTranslate.translate('en', 'panel.header.nav.courses')).toBe('Courses')
  })
})

describe('portal bundle excludes the English panel catalog', () => {
  it('no module reachable from portal/main.tsx or translate.ts imports catalogs/en/panel.json', () => {
    const portalFiles = importGraph('/src/portal/main.tsx')
    expect(portalFiles.length).toBeGreaterThan(20)
    expect(portalFiles).not.toContain('/src/i18n/panelCatalogs.ts')
    expect(portalFiles).not.toContain('/src/stores/panelLanguage.ts')

    const filesToCheck = new Set([...portalFiles, '/src/i18n/translate.ts'])
    const offending: string[] = []
    for (const file of filesToCheck) {
      const { importedFiles } = ts.preProcessFile(SOURCES[file]!, true, true)
      for (const { fileName } of importedFiles) {
        if (fileName.includes('catalogs/en/panel.json')) {
          offending.push(`${file} -> ${fileName}`)
        }
      }
    }
    expect(offending).toEqual([])
  })
})
