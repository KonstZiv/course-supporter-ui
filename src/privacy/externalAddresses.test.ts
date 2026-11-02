import { describe, it, expect } from 'vitest'
import ts from 'typescript'

// Privacy check В.1: the apps contact no third-party servers. Every http(s)
// address in the source must be in the exceptions list with a reason; the
// built pages are checked by scripts/check-dist-external.mjs, whose scanning
// functions are tested here as well.

interface AllowlistEntry {
  address: string
  checks: string[]
  reason: string
  note: string
}
interface Allowlist {
  about: string
  entries: AllowlistEntry[]
}
interface DistReference {
  file: string
  address: string
}
interface DistCheck {
  externalReferences(file: string, text: string, allowedHosts: Set<string>): DistReference[]
  allowedDistHosts(allowlist: Allowlist): Set<string>
  formatFailure(violations: DistReference[]): string
}

// The exceptions list both checks read, and the dist check's own module.
const [allowlistText] = Object.values(
  import.meta.glob<string>('/src/privacy/external-allowlist.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)
const allowlist = JSON.parse(allowlistText ?? '{"entries": []}') as Allowlist
const [distCheck] = Object.values(
  import.meta.glob<DistCheck>('/scripts/check-dist-external.mjs', { eager: true }),
)

// Source as the bundler sees it — tests excluded — and the two HTML pages.
const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})
const pages = import.meta.glob<string>(['/index.html', '/portal.html'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

interface FoundAddress {
  where: string
  address: string
}

const ABSOLUTE = /https?:\/\/[^\s'"`<>\\]+/gi
const PROTOCOL_RELATIVE = /^\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s'"`<>\\]*/i

function addressesIn(text: string): { index: number; address: string }[] {
  const found = [...text.matchAll(ABSOLUTE)].map((m) => ({ index: m.index, address: m[0] }))
  const relative = PROTOCOL_RELATIVE.exec(text)
  if (relative) found.push({ index: 0, address: relative[0] })
  return found
}

/**
 * Addresses in code: string literals, template parts and JSX text. Comments
 * are trivia in the TypeScript syntax tree, so they are never visited.
 */
function codeAddresses(path: string, source: string): FoundAddress[] {
  const file = path.replace(/^\//, '')
  const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind)
  const found: FoundAddress[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      const startLine = tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1
      for (const { index, address } of addressesIn(node.text)) {
        const line = startLine + (node.text.slice(0, index).match(/\n/g)?.length ?? 0)
        found.push({ where: `${file}:${line}`, address })
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return found
}

/** Addresses in an HTML page, with <!-- comments --> blanked out. */
function pageAddresses(path: string, html: string): FoundAddress[] {
  const file = path.replace(/^\//, '')
  const text = html.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ' '))
  return text.split('\n').flatMap((lineText, i) =>
    addressesIn(lineText).map(({ address }) => ({ where: `${file}:${i + 1}`, address })),
  )
}

function newAddresses(
  files: Record<string, string>,
  entries: AllowlistEntry[],
): FoundAddress[] {
  const allowed = entries.filter((entry) => entry.checks.includes('source')).map((entry) => entry.address)
  return Object.entries(files)
    .flatMap(([path, text]) =>
      path.endsWith('.html') ? pageAddresses(path, text) : codeAddresses(path, text),
    )
    .filter(({ address }) => !allowed.some((prefix) => address.startsWith(prefix)))
}

function formatNewAddresses(found: FoundAddress[]): string {
  const list = found.map(({ where, address }) => `${where}, ${address}`).join('; ')
  return (
    `З'явилася нова зовнішня адреса: ${list}. Якщо застосунок звертається до стороннього ` +
    'сервера, оновіть політику конфіденційності й лише тоді додайте адресу до переліку виключень.'
  )
}

describe('external addresses in the source', () => {
  it('reads the source, both pages and the exceptions list', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(50)
    expect(Object.keys(sources)).toContain('/src/portal/components/youtube.ts')
    expect(Object.keys(pages).sort()).toEqual(['/index.html', '/portal.html'])
    expect(allowlist.entries.length).toBeGreaterThan(0)
  })

  it('every exception names an address, the check it applies to, a reason and a decision note', () => {
    for (const entry of allowlist.entries) {
      expect(entry.address, JSON.stringify(entry)).toMatch(/^(https?:)?\/\//)
      expect(entry.checks.length, entry.address).toBeGreaterThan(0)
      for (const check of entry.checks) expect(['source', 'dist'], entry.address).toContain(check)
      expect(entry.reason.trim(), entry.address).not.toBe('')
      expect(entry.note.trim(), entry.address).not.toBe('')
    }
  })

  it('every http(s) address in the source and the pages is a listed exception', () => {
    const found = newAddresses({ ...sources, ...pages }, allowlist.entries)
    expect(found, formatNewAddresses(found)).toEqual([])
  })

  describe('bites on a violation', () => {
    it('a new address in a string literal', () => {
      const found = newAddresses(
        { '/src/x.ts': "const a = 1\nconst u = 'https://example.org/x'\n" },
        allowlist.entries,
      )
      expect(found).toEqual([{ where: 'src/x.ts:2', address: 'https://example.org/x' }])
      expect(formatNewAddresses(found)).toBe(
        "З'явилася нова зовнішня адреса: src/x.ts:2, https://example.org/x. Якщо застосунок " +
          'звертається до стороннього сервера, оновіть політику конфіденційності й лише тоді ' +
          'додайте адресу до переліку виключень.',
      )
    })

    it('a new address in a template, in JSX text and as a protocol-relative literal', () => {
      const found = newAddresses(
        {
          '/src/y.tsx': [
            'const id = 1',
            'const a = `https://example.org/${id}/x`',
            'const b = <p>see https://example.net/docs.</p>',
            "const c = '//cdn.example.com/lib.js'",
          ].join('\n'),
        },
        allowlist.entries,
      )
      expect(found).toEqual([
        { where: 'src/y.tsx:2', address: 'https://example.org/' },
        { where: 'src/y.tsx:3', address: 'https://example.net/docs.' },
        { where: 'src/y.tsx:4', address: '//cdn.example.com/lib.js' },
      ])
    })

    it('a new address in a page', () => {
      const found = newAddresses(
        { '/index.html': '<head>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2" />\n</head>' },
        allowlist.entries,
      )
      expect(found).toEqual([{ where: 'index.html:2', address: 'https://fonts.googleapis.com/css2' }])
    })

    it('ignores comments and the listed exceptions', () => {
      const found = newAddresses(
        {
          '/src/z.ts': [
            '// https://example.org/in-a-line-comment',
            '/* https://example.org/in-a-block-comment */',
            'const embed = `https://www.youtube.com/embed/${"abc"}`',
          ].join('\n'),
          '/portal.html': '<!-- https://example.org/in-an-html-comment -->',
        },
        allowlist.entries,
      )
      expect(found).toEqual([])
    })
  })
})

describe('external addresses in the built pages (scripts/check-dist-external.mjs)', () => {
  const check = distCheck as DistCheck
  const none = new Set<string>()

  it('is loaded', () => {
    expect(distCheck).toBeDefined()
  })

  it('finds third-party loads in HTML: link, script, iframe, srcset, inline styles', () => {
    const html = [
      '<link rel="preconnect" href="https://fonts.googleapis.com" />',
      '<script type="module" src="//cdn.example.com/x.js"></script>',
      '<iframe src="https://www.youtube.com/embed/abc"></iframe>',
      '<img srcset="/a.png 1x, https://img.example.com/b.png 2x">',
      '<div style="background: url(\'https://img.example.com/bg.png\')"></div>',
      '<style>@import "https://example.org/x.css";</style>',
    ].join('\n')
    expect(check.externalReferences('dist/index.html', html, none).map((r) => r.address)).toEqual([
      'https://fonts.googleapis.com',
      '//cdn.example.com/x.js',
      'https://www.youtube.com/embed/abc',
      'https://img.example.com/b.png',
      'https://example.org/x.css',
      'https://img.example.com/bg.png',
    ])
  })

  it('finds third-party loads in CSS: @import and url()', () => {
    const css =
      '@import url("https://fonts.googleapis.com/css2?family=X");' +
      '@font-face{src:url(https://fonts.gstatic.com/x.woff2) format("woff2")}'
    expect(check.externalReferences('dist/assets/a.css', css, none)).toEqual([
      { file: 'dist/assets/a.css', address: 'https://fonts.googleapis.com/css2?family=X' },
      { file: 'dist/assets/a.css', address: 'https://fonts.gstatic.com/x.woff2' },
    ])
  })

  it('lets through own files, data: URIs, plain links and comments', () => {
    const html = [
      '<link rel="icon" href="/favicon.svg" />',
      '<script type="module" crossorigin src="/assets/main.js"></script>',
      '<a href="https://example.org/terms">terms</a>',
      '<!-- <script src="https://example.org/x.js"></script> -->',
      '<img data-src="https://example.org/lazy.png" src="/a.png">',
    ].join('\n')
    const css =
      '@font-face{src:url(/assets/x.woff2) format("woff2"),url(./files/x.woff) format("woff")}' +
      '.a{background:url(data:image/png;base64,AAAA)}/* url(https://example.org/c.png) */'
    expect(check.externalReferences('dist/index.html', html, none)).toEqual([])
    expect(check.externalReferences('dist/assets/a.css', css, none)).toEqual([])
  })

  it('allows only hosts listed for the dist check', () => {
    const allowed = check.allowedDistHosts({
      about: '',
      entries: [
        { address: 'https://media.example.org/', checks: ['dist'], reason: 'r', note: 'n' },
        { address: 'https://www.youtube.com/embed/', checks: ['source'], reason: 'r', note: 'n' },
      ],
    })
    expect([...allowed]).toEqual(['media.example.org'])
    const html = '<img src="https://media.example.org/a.png"><iframe src="https://www.youtube.com/embed/x">'
    expect(check.externalReferences('dist/portal.html', html, allowed).map((r) => r.address)).toEqual([
      'https://www.youtube.com/embed/x',
    ])
    // Today the built pages need no exception at all.
    expect([...check.allowedDistHosts(allowlist)]).toEqual([])
  })

  it('fails with the policy message', () => {
    const html = '<link href="https://fonts.googleapis.com/css2?family=X" rel="stylesheet" />'
    const violations = check.externalReferences('dist/index.html', html, none)
    expect(check.formatFailure(violations)).toBe(
      'У зібраних сторінках є звернення до стороннього сервера: dist/index.html → ' +
        'https://fonts.googleapis.com/css2?family=X. Політика конфіденційності обіцяє, що застосунки ' +
        'до таких серверів не звертаються. Приберіть звернення; якщо воно потрібне, додайте адресу до ' +
        'переліку виключень свідомо — разом з оновленням політики конфіденційності.',
    )
  })
})
