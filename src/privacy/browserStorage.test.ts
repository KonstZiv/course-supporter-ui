import { describe, it, expect } from 'vitest'
import ts from 'typescript'
import { STORAGE_KEYS, STORAGE_MODULES } from './surface'

// Privacy check В.2: everything the apps keep in the browser is listed in
// src/privacy/surface.ts. The privacy policy describes that list, so any
// change to it — or any storage use outside it — must reach the policy.

// What browsers hold today. Changing a value logs every user out; adding a
// key or a module changes what the policy must say.
const EXPECTED_KEYS = {
  authorApiKey: 'cs_api_key',
  portalToken: 'cs_portal_token',
  portalTenant: 'cs_portal_tenant',
  portalStudent: 'cs_portal_student',
  portalName: 'cs_portal_name',
  rolesIntroSeen: 'cs_roles_intro_seen',
}
const EXPECTED_MODULES = [
  'src/stores/auth.ts',
  'src/portal/stores/session.ts',
  'src/components/ui/rolesIntro.ts',
]

// Source as the bundler sees it — tests excluded — and surface.ts itself.
const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
})
const [surfaceText] = Object.values(
  import.meta.glob<string>('/src/privacy/surface.ts', { query: '?raw', import: 'default', eager: true }),
)

const SURFACE_FILE = 'src/privacy/surface.ts'
// localStorage is the one storage the listed modules use; every other browser
// store, and any cookie, is a change of the surface wherever it appears.
const STORAGE_GLOBAL = 'localStorage'
const OTHER_STORES = new Set(['sessionStorage', 'indexedDB', 'cookieStore', 'caches', 'serviceWorker'])
const STORAGE_CALLS = new Set(['getItem', 'setItem', 'removeItem'])

interface Violation {
  where: string
  what: string
}

function isDeclaredName(node: ts.Identifier): boolean {
  const parent = node.parent
  return (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isPropertyAssignment(parent) ||
      ts.isPropertySignature(parent) ||
      ts.isPropertyDeclaration(parent) ||
      ts.isMethodDeclaration(parent) ||
      ts.isFunctionDeclaration(parent)) &&
    parent.name === node
  )
}

/** A storage key argument that comes from the list: a listed literal, STORAGE_KEYS.x, or a const bound to one. */
function isListedKey(arg: ts.Expression, tree: ts.SourceFile, values: Set<string>): boolean {
  if (ts.isStringLiteralLike(arg)) return values.has(arg.text)
  if (ts.isPropertyAccessExpression(arg)) {
    return arg.expression.getText(tree) === 'STORAGE_KEYS' && arg.name.text in STORAGE_KEYS
  }
  if (ts.isIdentifier(arg)) {
    let listed = false
    const find = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === arg.text &&
        node.initializer !== undefined &&
        !ts.isIdentifier(node.initializer) &&
        isListedKey(node.initializer, tree, values)
      ) {
        listed = true
      }
      ts.forEachChild(node, find)
    }
    find(tree)
    return listed
  }
  return false
}

function storageViolations(files: Record<string, string>): Violation[] {
  const allowedModules = new Set<string>(STORAGE_MODULES)
  const values = new Set<string>(Object.values(STORAGE_KEYS))
  const violations: Violation[] = []

  for (const [path, source] of Object.entries(files)) {
    const file = path.replace(/^\//, '')
    const kind = path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind)
    const at = (node: ts.Node) =>
      `${file}:${tree.getLineAndCharacterOfPosition(node.getStart(tree)).line + 1}`

    const visit = (node: ts.Node) => {
      // (a) Browser stores and cookies, as identifiers or as window['…'] names.
      const name = ts.isIdentifier(node) && !isDeclaredName(node)
        ? node.text
        : ts.isStringLiteral(node) && ts.isElementAccessExpression(node.parent)
          ? node.text
          : null
      if (name === STORAGE_GLOBAL && !allowedModules.has(file)) {
        violations.push({ where: at(node), what: 'localStorage поза дозволеними модулями' })
      } else if (name !== null && OTHER_STORES.has(name)) {
        violations.push({ where: at(node), what: name })
      }
      if (
        (ts.isPropertyAccessExpression(node) && node.name.text === 'cookie') ||
        (ts.isElementAccessExpression(node) &&
          ts.isStringLiteral(node.argumentExpression) &&
          node.argumentExpression.text === 'cookie')
      ) {
        if (/\bdocument$/.test(node.expression.getText(tree))) {
          violations.push({ where: at(node), what: 'document.cookie' })
        }
      }
      // (b) Storage keys come only from the list.
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        STORAGE_CALLS.has(node.expression.name.text)
      ) {
        const [key] = node.arguments
        if (key === undefined || !isListedKey(key, tree, values)) {
          const shown = key === undefined ? '(немає)' : ts.isStringLiteralLike(key) ? key.text : key.getText(tree)
          violations.push({ where: at(node), what: `ключ '${shown}' не з переліку ${SURFACE_FILE}` })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return violations
}

/** (c) The list itself still holds exactly what browsers hold today. */
function surfaceViolations(): Violation[] {
  const text = surfaceText ?? ''
  const lineOf = (needle: string) => {
    const index = text.indexOf(needle)
    return index < 0 ? 1 : text.slice(0, index).split('\n').length
  }
  const violations: Violation[] = []
  const actual: Record<string, string> = STORAGE_KEYS
  for (const name of new Set([...Object.keys(EXPECTED_KEYS), ...Object.keys(actual)])) {
    const expected = (EXPECTED_KEYS as Record<string, string>)[name]
    if (actual[name] !== expected) {
      violations.push({
        where: `${SURFACE_FILE}:${lineOf(`${name}:`)}`,
        what: `ключ ${name}: '${actual[name] ?? '(немає)'}', очікувалось '${expected ?? '(немає)'}'`,
      })
    }
  }
  const modules: readonly string[] = STORAGE_MODULES
  if (modules.join('\n') !== EXPECTED_MODULES.join('\n')) {
    violations.push({
      where: `${SURFACE_FILE}:${lineOf('STORAGE_MODULES')}`,
      what: `дозволені модулі: ${modules.join(', ')}; очікувалось ${EXPECTED_MODULES.join(', ')}`,
    })
  }
  return violations
}

function formatStorageFailure(violations: Violation[]): string {
  const list = violations.map(({ where, what }) => `${where} — ${what}`).join('; ')
  return (
    `Конфіденційність: змінилось те, що зберігається у браузері, оновіть політику конфіденційності. ${list}. ` +
    `Якщо зміна свідома, внесіть її в ${SURFACE_FILE} і в очікуваний перелік src/privacy/browserStorage.test.ts.`
  )
}

describe('browser storage surface', () => {
  it('reads the source, the storage modules among it', () => {
    for (const module of STORAGE_MODULES) expect(Object.keys(sources)).toContain(`/${module}`)
    expect(surfaceText).toContain('STORAGE_KEYS')
  })

  it('only the listed modules touch browser storage, and only with listed keys', () => {
    const violations = storageViolations(sources)
    expect(violations, formatStorageFailure(violations)).toEqual([])
  })

  it('the listed keys and modules are the ones browsers hold today', () => {
    const violations = surfaceViolations()
    expect(violations, formatStorageFailure(violations)).toEqual([])
  })

  describe('bites on a violation', () => {
    it('a new key written outside the listed modules', () => {
      const violations = storageViolations({ '/src/x.ts': "const a = 1\nlocalStorage.setItem('x', '1')\n" })
      expect(violations).toEqual([
        { where: 'src/x.ts:2', what: `ключ 'x' не з переліку ${SURFACE_FILE}` },
        { where: 'src/x.ts:2', what: 'localStorage поза дозволеними модулями' },
      ])
      const message = formatStorageFailure(violations)
      expect(message).toContain(
        'змінилось те, що зберігається у браузері, оновіть політику конфіденційності',
      )
      expect(message).toContain("src/x.ts:2 — ключ 'x' не з переліку")
    })

    it('an unlisted key inside a listed module, literal or through a const', () => {
      const source = [
        "import { STORAGE_KEYS } from '../privacy/surface'",
        "const OTHER = 'cs_other'",
        'localStorage.setItem(STORAGE_KEYS.authorApiKey, k)',
        "localStorage.getItem('cs_new_flag')",
        'localStorage.removeItem(OTHER)',
      ].join('\n')
      expect(storageViolations({ '/src/stores/auth.ts': source })).toEqual([
        { where: 'src/stores/auth.ts:4', what: `ключ 'cs_new_flag' не з переліку ${SURFACE_FILE}` },
        { where: 'src/stores/auth.ts:5', what: `ключ 'OTHER' не з переліку ${SURFACE_FILE}` },
      ])
    })

    it('a cookie and other browser stores, even in a listed module', () => {
      const source = [
        "document.cookie = 'a=1'",
        "window.document['cookie']",
        "sessionStorage.setItem('s', '1')",
        "window['indexedDB'].open('db')",
        'navigator.serviceWorker.register("/sw.js")',
        "caches.open('c')",
        'cookieStore.get("a")',
      ].join('\n')
      expect(storageViolations({ '/src/portal/stores/session.ts': source }).map((v) => `${v.where} ${v.what}`)).toEqual([
        'src/portal/stores/session.ts:1 document.cookie',
        'src/portal/stores/session.ts:2 document.cookie',
        `src/portal/stores/session.ts:3 ключ 's' не з переліку ${SURFACE_FILE}`,
        'src/portal/stores/session.ts:3 sessionStorage',
        'src/portal/stores/session.ts:4 indexedDB',
        'src/portal/stores/session.ts:5 serviceWorker',
        'src/portal/stores/session.ts:6 caches',
        'src/portal/stores/session.ts:7 cookieStore',
      ])
    })

    it('ignores comments, plain words and the listed usage', () => {
      const source = [
        '// localStorage, document.cookie and caches in a comment',
        "const text = 'stored in localStorage'",
        'const caches = new Map()',
        'const KEY = STORAGE_KEYS.portalToken',
        'localStorage.getItem(KEY)',
        "localStorage.removeItem('cs_portal_name')",
      ].join('\n')
      expect(storageViolations({ '/src/portal/stores/session.ts': source })).toEqual([])
    })
  })
})
