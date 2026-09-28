import { useId, useRef } from 'react'
import { clsx } from 'clsx'
import { Download, EyeOff, Loader2, Upload } from 'lucide-react'
import type { TestAction } from '../../utils/testRefusals'
import { TEXTS } from './editorTexts'
import { FieldError } from './fields'
import { describedBy } from './formParts'

/**
 * The test's name and pass mark, and what is done to the test as a whole:
 * its YAML out and in, and hiding it.
 */
export function SettingsCard({
  title,
  passThreshold,
  titleError,
  passThresholdError,
  autoFocusTitle,
  fileBlocked,
  exportBlocked,
  busy,
  onTitle,
  onPassThreshold,
  onExport,
  onChooseFile,
  onHide,
}: {
  title: string
  passThreshold: string
  titleError: string | null
  passThresholdError: string | null
  autoFocusTitle: boolean
  /** Why nothing can be done to the file yet — a test not saved — or null. */
  fileBlocked: string | null
  /** Why the YAML cannot be exported now, or null. */
  exportBlocked: string | null
  busy: TestAction | null
  onTitle: (title: string) => void
  onPassThreshold: (passThreshold: string) => void
  onExport: () => void
  onChooseFile: (file: File) => void
  onHide: () => void
}) {
  const id = useId()
  const file = useRef<HTMLInputElement>(null)
  const reason = fileBlocked ?? exportBlocked

  return (
    <div className="card p-6 space-y-5">
      <div>
        <label
          htmlFor={`${id}-title`}
          className="block text-sm font-medium text-ink mb-1.5"
        >
          {TEXTS.title}
        </label>
        <input
          id={`${id}-title`}
          className={clsx('input', titleError && 'border-coral')}
          value={title}
          onChange={(event) => onTitle(event.target.value)}
          aria-invalid={titleError ? true : undefined}
          aria-describedby={describedBy(
            titleError && `${id}-title-error`,
            `${id}-title-hint`,
          )}
          autoFocus={autoFocusTitle}
        />
        {titleError && <FieldError id={`${id}-title-error`} words={titleError} />}
        <p id={`${id}-title-hint`} className="text-xs text-ink-muted mt-1">
          {TEXTS.titleHint}
        </p>
      </div>

      <div>
        <label
          htmlFor={`${id}-pass`}
          className="block text-sm font-medium text-ink mb-1.5"
        >
          {TEXTS.passThreshold}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`${id}-pass`}
            type="number"
            min={1}
            max={100}
            step={1}
            inputMode="numeric"
            className={clsx('input w-28', passThresholdError && 'border-coral')}
            value={passThreshold}
            onChange={(event) => onPassThreshold(event.target.value)}
            aria-invalid={passThresholdError ? true : undefined}
            aria-describedby={describedBy(
              passThresholdError && `${id}-pass-error`,
              `${id}-pass-hint`,
            )}
          />
          <span className="text-ink-muted" aria-hidden>
            %
          </span>
        </div>
        {passThresholdError && (
          <FieldError id={`${id}-pass-error`} words={passThresholdError} />
        )}
        <p id={`${id}-pass-hint`} className="text-xs text-ink-muted mt-1">
          {TEXTS.passThresholdHint}
        </p>
      </div>

      <div className="pt-4 border-t border-canvas-dark/60">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onExport}
            disabled={busy !== null || reason !== null}
            aria-describedby={reason !== null ? `${id}-file-hint` : undefined}
          >
            {busy === 'export' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {TEXTS.exportYaml}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => file.current?.click()}
            disabled={busy !== null || fileBlocked !== null}
            aria-describedby={fileBlocked !== null ? `${id}-file-hint` : undefined}
          >
            {busy === 'replace' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {TEXTS.replaceYaml}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={onHide}
            disabled={busy !== null || fileBlocked !== null}
            aria-describedby={fileBlocked !== null ? `${id}-file-hint` : undefined}
          >
            <EyeOff size={14} />
            {TEXTS.hide}
          </button>
        </div>
        {reason !== null && (
          <p id={`${id}-file-hint`} className="text-xs text-ink-muted mt-1">
            {reason}
          </p>
        )}
        <input
          ref={file}
          type="file"
          accept=".yaml,.yml"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => {
            const chosen = event.target.files?.[0]
            // Emptied, so choosing the same file again still counts.
            event.target.value = ''
            if (chosen) onChooseFile(chosen)
          }}
          data-testid="yaml-file"
        />
      </div>
    </div>
  )
}
