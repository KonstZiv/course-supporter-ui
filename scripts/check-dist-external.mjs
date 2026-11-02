// Privacy check for the built pages (npm run check:privacy, after the build).
// The privacy policy promises that the apps load nothing from third-party
// servers. This fails when dist/index.html, dist/portal.html or any
// dist/**/*.css loads a resource from a host that is not in the exceptions
// list (src/privacy/external-allowlist.json, entries with "dist" in checks).
//
// Plain Node, no dependencies. The scanning functions are exported and
// covered by src/privacy/externalAddresses.test.ts.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

// Elements whose address attributes make the browser fetch something. A plain
// <a href> only leads somewhere, so it is not checked.
const LOADING_ELEMENTS = ['link', 'script', 'img', 'iframe', 'source', 'video', 'audio', 'embed', 'object', 'form']
const ADDRESS_ATTRIBUTES = ['src', 'href', 'srcset', 'poster', 'data', 'action']

const TAG_RE = new RegExp(`<(${LOADING_ELEMENTS.join('|')})\\b([^>]*)>`, 'gi')
const ATTRIBUTE_RE = new RegExp(
  `\\s(${ADDRESS_ATTRIBUTES.join('|')})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
  'gi',
)

/** An absolute (http:, https:) or protocol-relative (//host) address. */
export function isExternal(address) {
  return /^(https?:)?\/\//i.test(address.trim())
}

/** Host of an external address, or '' when it cannot be parsed. */
export function hostOf(address) {
  const value = address.trim()
  try {
    return new URL(value.startsWith('//') ? `https:${value}` : value).host.toLowerCase()
  } catch {
    return ''
  }
}

/** Addresses a stylesheet loads: @import targets and url(...) values. */
export function cssAddresses(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const found = []
  for (const m of text.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1/gi)) found.push(m[2])
  for (const m of text.matchAll(/url\(\s*(["']?)([^"')]+?)\1\s*\)/gi)) found.push(m[2])
  return found
}

/** Addresses an HTML page loads: element attributes, <style> blocks, style="". */
export function htmlAddresses(html) {
  const text = html.replace(/<!--[\s\S]*?-->/g, '')
  const found = []
  for (const tag of text.matchAll(TAG_RE)) {
    for (const attribute of tag[2].matchAll(ATTRIBUTE_RE)) {
      const value = attribute[2] ?? attribute[3] ?? attribute[4] ?? ''
      if (attribute[1].toLowerCase() === 'srcset') {
        found.push(...value.split(',').map((candidate) => candidate.trim().split(/\s+/)[0]).filter(Boolean))
      } else {
        found.push(value)
      }
    }
  }
  for (const block of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) found.push(...cssAddresses(block[1]))
  for (const inline of text.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    found.push(...cssAddresses(inline[1] ?? inline[2] ?? ''))
  }
  return found
}

/** Third-party addresses a built file loads, as { file, address }. */
export function externalReferences(file, text, allowedHosts) {
  const addresses = file.endsWith('.css') ? cssAddresses(text) : htmlAddresses(text)
  const external = addresses.filter((address) => isExternal(address) && !allowedHosts.has(hostOf(address)))
  return [...new Set(external)].map((address) => ({ file, address }))
}

/** Hosts the exceptions list allows in the built pages. */
export function allowedDistHosts(allowlist) {
  return new Set(
    allowlist.entries.filter((entry) => entry.checks.includes('dist')).map((entry) => hostOf(entry.address)),
  )
}

export function formatFailure(violations) {
  const list = violations.map(({ file, address }) => `${file} → ${address}`).join('; ')
  return (
    `У зібраних сторінках є звернення до стороннього сервера: ${list}. ` +
    'Політика конфіденційності обіцяє, що застосунки до таких серверів не звертаються. ' +
    'Приберіть звернення; якщо воно потрібне, додайте адресу до переліку виключень свідомо — ' +
    'разом з оновленням політики конфіденційності.'
  )
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url))
  const dist = join(root, 'dist')
  const pages = ['index.html', 'portal.html'].map((name) => join(dist, name))
  const missing = pages.filter((page) => !existsSync(page))
  if (missing.length > 0) {
    console.error(`Немає зібраних сторінок (${missing.map((p) => relative(root, p)).join(', ')}): спершу npm run build.`)
    process.exitCode = 1
    return
  }

  const allowlist = JSON.parse(readFileSync(join(root, 'src/privacy/external-allowlist.json'), 'utf8'))
  const allowedHosts = allowedDistHosts(allowlist)
  const stylesheets = readdirSync(dist, { recursive: true })
    .filter((name) => name.endsWith('.css'))
    .map((name) => join(dist, name))
  const files = [...pages, ...stylesheets]

  const violations = files.flatMap((path) =>
    externalReferences(relative(root, path), readFileSync(path, 'utf8'), allowedHosts),
  )
  if (violations.length > 0) {
    console.error(formatFailure(violations))
    process.exitCode = 1
    return
  }
  console.log(`Конфіденційність: у ${files.length} файлах зібраних сторінок немає звернень до сторонніх серверів.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
