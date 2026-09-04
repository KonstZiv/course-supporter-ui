import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import type { DocumentStructureEntry, DocumentStructureResponse } from '../../types/api'
import {
  STRUCTURE_BLOCK_ACTION,
  detailIsShowable,
  notReadCountLabel,
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
// Fetched on MOUNT, not on expand. The heading carries a count now, and a count
// cannot be shown by a request that has not been made — an author who never
// opens the block still has to learn there is something in it. The cost is
// bounded: a node holds units of code materials, not the whole tree, and only
// a ready one is asked at all.
//
// Nothing renders until there is something to say. A 404 (no such surface — a
// non-code material, or code still being processed) and two empty lists (read
// in full) are DIFFERENT answers on the wire, and the server keeps them apart
// on purpose; here they collapse to the same silence, deliberately. A heading
// reading "0 файлів не прочитано" on every clean upload would be noise, and
// "everything was read" is not news the author needs told. A failed fetch is
// silent for the same reason — a block nobody promised is better absent than
// announced as broken.

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

  useEffect(() => {
    let active = true
    documentsApi
      .getStructure(documentId)
      .then((d) => {
        if (active) setData(d)
      })
      // Every failure is the same silence, 404 included — see the note above.
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [documentId])

  const toggle = useCallback(() => setOpen((o) => !o), [])

  const count =
    data === null ? 0 : data.excluded.length + data.description_only.length
  if (count === 0) return null

  return (
    <div className="mt-1">
      <button
        onClick={toggle}
        aria-expanded={open}
        // The warning tone of the portal's own "not read" badge, and for the
        // same reason: collapsed, this line is the ONLY notice the author gets
        // that part of their material never reached the model. It read as
        // muted chrome before, next to controls that are genuinely optional.
        className="inline-flex items-center gap-1 text-[11px] font-medium
                   px-1.5 py-0.5 rounded bg-amber-pale text-amber-dark
                   hover:bg-amber-pale/70 transition-colors cursor-pointer"
      >
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {notReadCountLabel(count)}
      </button>

      {open && (
        <div className="mt-1 pl-4 space-y-1.5">
          <StructureGroup
            title="Не увійшли до матеріалу"
            entries={data!.excluded}
          />
          <StructureGroup
            title="Увійшли лише назвою"
            entries={data!.description_only}
          />
          {/* One action for the block, never per row: a per-line instruction
              under a `.DS_Store` would be invented noise. */}
          <p className="text-xs text-ink-muted">{STRUCTURE_BLOCK_ACTION}</p>
        </div>
      )}
    </div>
  )
}
