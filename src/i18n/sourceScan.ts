// Test support: the product sources as text, the portal's import graph and
// the literals of a file. Read by the i18n tests only; nothing in the apps
// imports it.

import ts from 'typescript'

/** Every product source (no tests), by its path from the root: "/src/…". */
export const SOURCES = import.meta.glob<string>(
  ['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'],
  { query: '?raw', import: 'default', eager: true },
)

function normalize(path: string): string {
  const out: string[] = []
  for (const part of path.split('/')) {
    if (part === '..') out.pop()
    else if (part !== '.' && part !== '') out.push(part)
  }
  return '/' + out.join('/')
}

function resolve(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = '/src/' + spec.slice(2)
  else if (spec.startsWith('.')) base = normalize(from.slice(0, from.lastIndexOf('/')) + '/' + spec)
  else return null // a package
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (candidate in SOURCES) return candidate
  }
  return null // a stylesheet, a JSON catalog, an asset
}

/** The product files `entry` imports, itself included, transitively. */
export function importGraph(entry: string): string[] {
  const seen = new Set<string>()
  const stack = [entry]
  while (stack.length > 0) {
    const file = stack.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    const { importedFiles } = ts.preProcessFile(SOURCES[file]!, true, true)
    for (const { fileName } of importedFiles) {
      const found = resolve(file, fileName)
      if (found !== null) stack.push(found)
    }
  }
  return [...seen].sort()
}

/**
 * The literals of a file — strings, template parts, JSX text, regular
 * expressions — without its comments.
 */
export function literalsOf(file: string): string[] {
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const source = ts.createSourceFile(file, SOURCES[file]!, ts.ScriptTarget.Latest, true, kind)
  const found: string[] = []
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isRegularExpressionLiteral(node)
    ) {
      found.push(node.text)
    } else if (ts.isJsxText(node)) {
      const text = node.text.replace(/\s+/g, ' ').trim()
      if (text !== '') found.push(text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}
