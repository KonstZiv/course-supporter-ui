import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Shared Markdown renderer for the student portal (student-path step Б).
// react-markdown + remark-gfm (GFM: tables, task lists, strikethrough,
// autolinks). NO rehype-raw / rehype-sanitize (ratify Р5 — safety by
// non-inclusion): the ONLY dangerouslySetInnerHTML is the mermaid strict-mode
// SVG in MermaidBlock. Fenced ```mermaid blocks render as diagrams via a lazy
// dynamic import (ratify Р4); every other block stays standard. Consumed by
// PortalReviewDetail (the review now gets GFM — ratified) and the material .md
// branch (PortalMaterialView).

// Module-level guard so mermaid.initialize runs once across every diagram.
let mermaidInitialised = false

function MermaidBlock({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default
        if (!mermaidInitialised) {
          mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
          mermaidInitialised = true
        }
        const id = `mermaid-${Math.random().toString(36).slice(2)}`
        const { svg: rendered } = await mermaid.render(id, chart)
        if (!cancelled) setSvg(rendered)
      } catch (err) {
        // Ratify Р4: any parse/render failure leaves the source <pre> visible;
        // the page never breaks.
        console.warn('mermaid render failed', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [chart])

  if (svg !== null) {
    // Ratify Р5 exception — the ONLY dangerouslySetInnerHTML in the portal: an
    // SVG produced by mermaid under securityLevel:'strict'.
    return <div dangerouslySetInnerHTML={{ __html: svg }} />
  }
  // Loading state and error fallback both show the raw source (ratify Р4).
  return (
    <pre>
      <code>{chart}</code>
    </pre>
  )
}

const components: Components = {
  a(props) {
    const { node: _node, ...rest } = props
    return <a {...rest} target="_blank" rel="noopener noreferrer" />
  },
  code(props) {
    const { node: _node, className, children, ...rest } = props
    if (typeof className === 'string' && /\blanguage-mermaid\b/.test(className)) {
      return <MermaidBlock chart={String(children).replace(/\n$/, '')} />
    }
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    )
  },
}

// Style wrapper moved verbatim from PortalReviewDetail (review look unchanged),
// extended minimally for GFM tables (canvas-dark borders + padding, mirroring
// adjacent borders) and images (never overflow the panel).
export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <div
      className="text-sm text-ink space-y-2 [&_h1]:font-display [&_h1]:text-lg
                 [&_h2]:font-display [&_h2]:text-base [&_ul]:list-disc [&_ul]:pl-5
                 [&_ol]:list-decimal [&_ol]:pl-5 [&_code]:bg-canvas-dark
                 [&_code]:px-1 [&_code]:rounded [&_a]:text-navy [&_a]:underline
                 [&_table]:border-collapse [&_th]:border [&_th]:border-canvas-dark
                 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-canvas-dark
                 [&_td]:px-2 [&_td]:py-1 [&_img]:max-w-full [&_img]:h-auto"
    >
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
    </div>
  )
}
