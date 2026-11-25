import { describe, expect, it } from 'vitest'
import type { Language } from '../../i18n/languages'
import {
  DOCS_LANGUAGES,
  docsUrl,
  SITE_LANGUAGES,
  siteUrl,
  type SitePage,
} from './siteLinks'

describe('siteLinks', () => {
  describe('constants', () => {
    it('declares the supported site languages', () => {
      expect(SITE_LANGUAGES).toEqual(['uk', 'en'])
    })

    it('declares the supported documentation languages', () => {
      expect(DOCS_LANGUAGES).toEqual(['uk', 'en'])
    })
  })

  describe('siteUrl', () => {
    const UK_PAGES: Record<SitePage, string> = {
      home: 'https://pythoncourse.me/uk/',
      'become-author': 'https://pythoncourse.me/uk/become-author/',
      'become-student': 'https://pythoncourse.me/uk/become-student/',
      pricing: 'https://pythoncourse.me/uk/pricing/',
      terms: 'https://pythoncourse.me/uk/terms/',
      refunds: 'https://pythoncourse.me/uk/refunds/',
      privacy: 'https://pythoncourse.me/uk/privacy/',
      contact: 'https://pythoncourse.me/uk/contact/',
    }

    it.each(Object.entries(UK_PAGES) as [SitePage, string][])(
      'builds byte-for-byte identical Ukrainian address for %s',
      (page, expectedUrl) => {
        expect(siteUrl('uk', page)).toBe(expectedUrl)
      },
    )

    const EN_PAGES: Record<SitePage, string> = {
      home: 'https://pythoncourse.me/en/',
      'become-author': 'https://pythoncourse.me/en/become-author/',
      'become-student': 'https://pythoncourse.me/en/become-student/',
      pricing: 'https://pythoncourse.me/en/pricing/',
      terms: 'https://pythoncourse.me/en/terms/',
      refunds: 'https://pythoncourse.me/en/refunds/',
      privacy: 'https://pythoncourse.me/en/privacy/',
      contact: 'https://pythoncourse.me/en/contact/',
    }

    it.each(Object.entries(EN_PAGES) as [SitePage, string][])(
      'builds English address for %s',
      (page, expectedUrl) => {
        expect(siteUrl('en', page)).toBe(expectedUrl)
      },
    )

    it('falls back to "en" when language is not in SITE_LANGUAGES', () => {
      expect(siteUrl('es' as Language, 'pricing')).toBe('https://pythoncourse.me/en/pricing/')
      expect(siteUrl('es' as Language, 'home')).toBe('https://pythoncourse.me/en/')
    })
  })

  describe('docsUrl', () => {
    it('builds Ukrainian documentation URL with and without subpaths', () => {
      expect(docsUrl('uk')).toBe('https://about.pythoncourse.me/uk/')
      expect(docsUrl('uk', 'authors/')).toBe('https://about.pythoncourse.me/uk/authors/')
      expect(docsUrl('uk', 'authors/first-course/')).toBe(
        'https://about.pythoncourse.me/uk/authors/first-course/',
      )
    })

    it('builds English documentation URL with and without subpaths', () => {
      expect(docsUrl('en')).toBe('https://about.pythoncourse.me/en/')
      expect(docsUrl('en', 'authors/')).toBe('https://about.pythoncourse.me/en/authors/')
      expect(docsUrl('en', 'authors/first-course/')).toBe(
        'https://about.pythoncourse.me/en/authors/first-course/',
      )
    })

    it('falls back to "uk" for documentation when language is unsupported', () => {
      expect(docsUrl('fr' as Language)).toBe('https://about.pythoncourse.me/uk/')
      expect(docsUrl('fr' as Language, 'authors/')).toBe('https://about.pythoncourse.me/uk/authors/')
    })

    it('strips leading slashes from subpath', () => {
      expect(docsUrl('uk', '/authors/')).toBe('https://about.pythoncourse.me/uk/authors/')
    })
  })
})
