import { useCallback, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { ApiError } from '../../api/client'
import { documentsApi } from '../../api/documents'
import type { DocumentStructureEntry, DocumentStructureResponse } from '../../types/api'
import {
  STRUCTURE_BLOCK_ACTION,
  detailIsShowable,
  structureReasonPhrase,
} from '../../utils/codeStructureReasons'
import { formatBytes } from '../../utils/formatBytes'

// What a code material's processing left out, on the author's own card
// (step Г2 §2.6, the post-hoc half of R5 visibility).
//
// The upload dialog warns BEFORE processing and processing finishes hours
// later, so until now the author had a warning and no answer. This is the
// answer, and it lives on the card because that is where they come back to.
//
// Fetched on EXPAND, not on card open: the panel lists every document of a
// node, and fetching per code material would fire N requests for a block most
// of them will never be opened. One request per document, kept for the life of
// the row.
//
// A 404 means the document has no such surface at all — a non-code material,
// or code still being processed — which is not the same as "nothing was left
// out". The block simply disappears; two empty lists, by contrast, are a real
// answer and say the project was read whole.

function StructureGroup({
  title,
  entries,
}: {
  title: string
  entries: DocumentStructureEntry[]
}) {
  if (entries.length === 0) return null
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{title}</p>
      <ul className="space-y-0.5">
        {entries.map((e) => (
          <li key={e.path} className="text-xs text-ink-light">
            <span className="font-medium text-ink break-all">{e.path}</span>
            {/* A collapsed directory stands for many files; without the count
                it reads as one, which is the difference between "a stray
                folder" and "a third of my project". */}
            {e.entries !== null && e.entries > 1 && (
              <span className="text-ink-muted"> · {e.entries} файлів</span>
            )}
            {' — '}
            {structureReasonPhrase(e.reason)}
            {e.detail && detailIsShowable(e.reason) && (
              <span className="text-ink-muted"> ({e.detail})</span>
            )}
            <span className="text-ink-muted whitespace-nowrap">
              {' '}
              ({formatBytes(e.size)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DocumentStructureBlock({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<DocumentStructureResponse | null>(null)
  const [loading, setLoading] = useState(false)
  // Distinct from "loaded and empty": a document with no structure surface has
  // no block at all, and the toggle that opened it goes away with it.
  const [absent, setAbsent] = useState(false)
  const [error, setError] = useState(false)

  const toggle = useCallback(async () => {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (data !== null || loading) return
    setLoading(true)
    setError(false)
    try {
      setData(await documentsApi.getStructure(documentId))
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setAbsent(true)
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }, [open, data, loading, documentId])

  if (absent) return null

  const nothingLeftOut =
    data !== null &&
    data.excluded.length === 0 &&
    data.description_only.length === 0

  return (
    <div className="mt-1">
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex items-center gap-1 text-[11px] text-ink-muted
                   hover:text-ink transition-colors cursor-pointer"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Не прочитано під час обробки
      </button>

      {open && (
        <div className="mt-1 pl-4 space-y-1.5">
          {loading && (
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <Loader2 size={12} className="animate-spin" />
              Завантаження…
            </p>
          )}
          {error && (
            <p className="text-xs text-coral">
              Не вдалося завантажити перелік. Спробуйте ще раз.
            </p>
          )}
          {nothingLeftOut && (
            <p className="text-xs text-ink-muted">
              Усі файли матеріалу прочитано.
            </p>
          )}
          {data !== null && !nothingLeftOut && (
            <>
              <StructureGroup
                title="Не увійшли до матеріалу"
                entries={data.excluded}
              />
              <StructureGroup
                title="Увійшли лише назвою"
                entries={data.description_only}
              />
              {/* One action for the block, never per row: a per-line
                  instruction under a `.DS_Store` would be invented noise. */}
              <p className="text-xs text-ink-muted">{STRUCTURE_BLOCK_ACTION}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
