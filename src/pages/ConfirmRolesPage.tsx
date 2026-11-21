import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, HelpCircle, Loader2 } from 'lucide-react'
import { documentsApi } from '../api/documents'
import { estimateProcessing } from '../api/billing'
import { useActionPrice, type PriceRequest } from '../hooks/useActionPrice'
import { PriceCard } from '../components/billing/PriceCard'
import { ApiError } from '../api/client'
import type {
  AuthoredDocumentResponse,
  FileRoleToken,
} from '../types/api'
import {
  ROLE_TOKENS,
  basename,
  groupByFolder,
  initialRoles,
  reasonLabel,
  roleLabels,
} from '../utils/fileRoles'
import { RolesIntroModal } from '../components/ui/RolesIntroModal'
import {
  hasSeenRolesIntro,
  markRolesIntroSeen,
  rolesIntro,
} from '../components/ui/rolesIntro'
import { useLanguage, useT } from '../i18n/LanguageContext'

// The educational block has three states: hidden, the acknowledge-gated first
// visit, and the voluntary reopen via «Навіщо це?» (freely dismissable).
type IntroMode = 'hidden' | 'first' | 'reference'

// №21 UI1 (confirm-screen): the author confirms the file-role proposal a
// document produced (phase ``awaiting_author``). Direct route; the entry from
// lists is UI2. Tree from ``proposal.files`` grouped by folder (a display
// gesture, decision 3); per file an editable role + its reason (Р15). Save
// sends the FULL per-file coverage + ``proposal.tree_digest``.
export function ConfirmRolesPage() {
  const language = useLanguage()
  const t = useT()
  const labels = roleLabels(language)
  const intro = rolesIntro(language)
  const { documentId } = useParams<{ documentId: string }>()
  const navigate = useNavigate()

  const [doc, setDoc] = useState<AuthoredDocumentResponse | null>(null)
  const [roles, setRoles] = useState<Record<string, FileRoleToken>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  // Show the educational block on the first visit (until acknowledged); the
  // «Навіщо це?» link reopens it on demand without re-requiring acknowledgement.
  const [introMode, setIntroMode] = useState<IntroMode>(() =>
    hasSeenRolesIntro() ? 'hidden' : 'first',
  )

  // The processing the confirmation starts is paid. The browser knows only the
  // files' paths here, not their text: the price is asked with the kind
  // alone — the server answers it has no price, and whether charging is on
  // (BIL-E, place 5).
  const nodeId = doc?.course_node_id ?? null
  const priceRequests = useMemo(
    (): PriceRequest[] | null =>
      nodeId === null
        ? null
        : [{ estimate: () => estimateProcessing(nodeId, { kind: 'code' }) }],
    [nodeId],
  )
  const price = useActionPrice(priceRequests)

  const acknowledgeIntro = () => {
    markRolesIntroSeen()
    setIntroMode('hidden')
  }

  const load = useCallback(async () => {
    if (!documentId) return
    setLoading(true)
    setError(null)
    setSaveError(null)
    try {
      const d = await documentsApi.get(documentId)
      const proposal = d.file_roles?.proposal
      if (!proposal) {
        setDoc(null)
        setError(t('panel.confirmRoles.noProposal'))
        return
      }
      setDoc(d)
      // decision 19 (three cases): prefill from a stale decision, else the
      // proposal defaults — always keyed on the current proposal.files.
      setRoles(initialRoles(proposal, d.file_roles?.decision))
    } catch (e) {
      setDoc(null)
      setError(e instanceof Error ? e.message : t('panel.confirmRoles.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [documentId, t])

  useEffect(() => {
    void load()
  }, [load])

  const proposal = doc?.file_roles?.proposal

  const setRole = (path: string, role: FileRoleToken) =>
    setRoles((prev) => ({ ...prev, [path]: role }))

  const setFolderRole = (files: string[], role: FileRoleToken) =>
    setRoles((prev) => {
      const next = { ...prev }
      for (const f of files) next[f] = role
      return next
    })

  const handleSave = async () => {
    if (!documentId || !proposal) return
    setSaving(true)
    setSaveError(null)
    setNotice(null)
    try {
      await documentsApi.confirmFileRoles(documentId, {
        files: roles,
        tree_digest: proposal.tree_digest,
      })
      // Processing is enqueued; return to the course ROOT (full tree) with the
      // worked-on node preselected (A-UI-2) so its detail panel opens on arrival.
      if (doc)
        navigate(`/course/${doc.course_root_id}?selected=${doc.course_node_id}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // file_roles_stale: the file tree changed — re-read and rebuild.
        await load()
        setNotice(t('panel.confirmRoles.staleNotice'))
      } else if (e instanceof ApiError && e.status === 422) {
        setSaveError(t('panel.confirmRoles.saveIncomplete'))
      } else {
        setSaveError(e instanceof Error ? e.message : t('panel.confirmRoles.saveFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 size={32} className="animate-spin text-navy" />
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-2 text-coral">
          <AlertCircle size={18} />
          <span>{error ?? t('panel.confirmRoles.proposalMissing')}</span>
        </div>
      </div>
    )
  }

  const groups = groupByFolder(Object.keys(proposal.files))
  const removedCount = proposal.removed?.count ?? 0

  return (
    <div className="max-w-3xl mx-auto p-6">
      <RolesIntroModal
        open={introMode !== 'hidden'}
        requireAck={introMode === 'first'}
        onAcknowledge={acknowledgeIntro}
        onClose={() => setIntroMode('hidden')}
      />

      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-xl font-semibold text-ink">{t('panel.confirmRoles.title')}</h1>
        <button
          type="button"
          onClick={() => setIntroMode('reference')}
          className="inline-flex items-center gap-1 text-sm text-navy hover:underline shrink-0"
        >
          <HelpCircle size={15} />
          {t('panel.confirmRoles.whyThis')}
        </button>
      </div>
      <p className="text-sm text-ink-muted mb-4">
        {doc?.filename ?? doc?.source_url}
      </p>

      <div className="mb-4 space-y-2 text-sm text-ink-light" data-testid="roles-lead">
        {intro.screenLead.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {removedCount > 0 && (
        <p
          className="text-sm text-ink-muted bg-canvas-dark rounded-md px-3 py-2 mb-4"
          data-testid="removed-line"
        >
          {t('panel.confirmRoles.removedLine', { count: removedCount })}
        </p>
      )}

      {notice && (
        <p className="text-sm text-amber-dark bg-amber-pale rounded-md px-3 py-2 mb-4">
          {notice}
        </p>
      )}

      <div className="space-y-4">
        {groups.map(({ folder, files }) => (
          <section key={folder || '.'} className="border border-canvas-dark rounded-md">
            <header className="flex items-center justify-between px-3 py-2 bg-canvas-dark">
              <span className="text-sm font-medium text-ink">{folder || '/'}</span>
              <label className="text-xs text-ink-muted flex items-center gap-1">
                {t('panel.confirmRoles.setFolderRoleLabel')}
                <select
                  aria-label={t('panel.confirmRoles.folderAriaLabel', { folder: folder || '/' })}
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setFolderRole(files, e.target.value as FileRoleToken)
                      e.target.value = ''
                    }
                  }}
                  className="border border-canvas-dark rounded px-1 py-0.5 bg-white"
                >
                  <option value="">—</option>
                  {ROLE_TOKENS.map((t) => (
                    <option key={t} value={t}>
                      {labels[t]}
                    </option>
                  ))}
                </select>
              </label>
            </header>
            <ul className="divide-y divide-canvas-dark">
              {files.map((path) => {
                const reason = proposal.files[path]?.reason ?? ''
                const role = roles[path] ?? 'full'
                return (
                  <li
                    key={path}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm text-ink break-words">
                        {basename(path)}
                      </div>
                      <div className="text-xs text-ink-muted break-words">
                        {reasonLabel(language, reason)}
                      </div>
                    </div>
                    <select
                      aria-label={t('panel.confirmRoles.fileAriaLabel', { path })}
                      value={role}
                      onChange={(e) =>
                        setRole(path, e.target.value as FileRoleToken)
                      }
                      className="border border-canvas-dark rounded px-2 py-1 bg-white text-sm shrink-0"
                    >
                      {ROLE_TOKENS.map((t) => (
                        <option key={t} value={t}>
                          {labels[t]}
                        </option>
                      ))}
                    </select>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {saveError && (
        <p className="text-sm text-coral mt-4 flex items-center gap-2">
          <AlertCircle size={16} />
          {saveError}
        </p>
      )}

      <div className="mt-6 flex flex-col items-end gap-3">
        <PriceCard price={price} />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !price.ready}
          className="inline-flex items-center gap-2 rounded-md bg-navy text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {t('panel.confirmRoles.submit')}
        </button>
      </div>
    </div>
  )
}
