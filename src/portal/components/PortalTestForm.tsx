import { useEffect, useState } from 'react'
import { Loader2, Send, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react'
import { doorRefusal, portalApi, PortalApiError } from '../api/portalClient'
import type { PortalLanguageEntry, TestStructureResponse } from '../types'
import { getPortalLanguages } from '../languages'
import { submitErrorMessage } from '../submissionCodes'

type TestFormState = 'idle' | 'confirming' | 'submitting' | 'success' | 'error'

// The sentence that stands before sending when some questions have no tick
// (mentor-rebuild task 07, decision 23): the server takes such answers and
// counts those questions wrong, so the student is told which ones — before,
// not after.
function unansweredWarning(numbers: string[]): string {
  const list = numbers.join(', ')
  return numbers.length === 1
    ? `Без відповіді лишилось питання ${list} — воно зарахується як неправильне.`
    : `Без відповіді лишились питання ${list} — вони зарахуються як неправильні.`
}

// A test answered with its answers (mentor-rebuild task 07). Stands in the
// panel instead of the file form, and only when the tree says so
// (``test_form === true``, DD-SP-BD).
//
// The questions and options are the server's own, as the test prints them —
// nothing of the key reaches this side, not even how many options are right,
// so every option carries a checkbox (decision 22). All the answers go in one
// submission with the version of the test they were given to. A question left
// without a tick is not refused — it is counted wrong — so the form asks first
// (decision 23). A refusal names its reason; the words are this side's
// (``submissionCodes.ts``), never the server's ``details``. When the test
// changed while the student answered, the form reads it again.
//
// After a submission the attempts list below takes over, exactly as for a
// file: ``onSubmitted`` reloads it and the tree, and the notice here retires
// once the list shows the attempt.
export function PortalTestForm({
  taskId,
  courseLanguage = null,
  listedIds = [],
  onSubmitted,
}: {
  taskId: string
  // The course's own language (ISO 639-3) off the tree root: the "course
  // language" option sends the code it names, as the file form does.
  courseLanguage?: string | null
  // Ids the attempts list below has loaded; the "sent" notice lives until the
  // attempt it announces is there.
  listedIds?: string[]
  onSubmitted: (submissionId: string) => void
}) {
  const [structure, setStructure] = useState<TestStructureResponse | null>(null)
  const [loadError, setLoadError] = useState('')
  // Bumped to read the test again — after the server said it changed.
  const [reloadKey, setReloadKey] = useState(0)
  // Question number → the labels ticked, in the order they were ticked.
  const [ticked, setTicked] = useState<Record<string, string[]>>({})
  const [state, setState] = useState<TestFormState>('idle')
  const [message, setMessage] = useState('')
  const [sentId, setSentId] = useState<string | null>(null)
  const [language, setLanguage] = useState('')
  const [languages, setLanguages] = useState<PortalLanguageEntry[]>([])

  useEffect(() => {
    let active = true
    setLoadError('')
    portalApi
      .testStructure(taskId)
      .then((s) => {
        if (!active) return
        setStructure(s)
        // A new version may ask other questions: nothing ticked carries over.
        setTicked({})
      })
      .catch((err) => {
        if (!active) return
        if (err instanceof PortalApiError && err.status === 401) return // centralised
        setLoadError('Не вдалося завантажити тест. Оновіть сторінку.')
      })
    return () => {
      active = false
    }
  }, [taskId, reloadKey])

  // The language list and the student's standing choice — the same two reads,
  // failing soft the same way, as the file form's review-language field.
  useEffect(() => {
    let active = true
    getPortalLanguages()
      .then((items) => {
        if (active) setLanguages(items)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    portalApi
      .me()
      .then((me) => {
        if (active && me.preferred_language) setLanguage(me.preferred_language)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (sentId !== null && listedIds.includes(sentId)) {
      setSentId(null)
      setState('idle')
      setMessage('')
    }
  }, [sentId, listedIds])

  const toggle = (number: string, label: string) => {
    setTicked((prev) => {
      const current = prev[number] ?? []
      return {
        ...prev,
        [number]: current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label],
      }
    })
    // A new tick is a new attempt in the making: the last outcome has had its say.
    if (state !== 'idle' && state !== 'submitting') {
      setState('idle')
      setMessage('')
      setSentId(null)
    }
  }

  const unanswered =
    structure === null
      ? []
      : structure.questions
          .filter((q) => (ticked[q.number] ?? []).length === 0)
          .map((q) => q.number)

  const send = async () => {
    if (structure === null) return
    setState('submitting')
    setMessage('')
    // Every question goes, a blank one as an empty list: "answered nothing" is
    // what the student confirmed, and the server counts it wrong.
    const answers = Object.fromEntries(
      structure.questions.map((q) => [q.number, ticked[q.number] ?? []]),
    )
    const chosen = language || courseLanguage
    try {
      const res = await portalApi.submitTest(taskId, {
        answers,
        test_version: structure.version,
        ...(chosen ? { response_language: chosen } : {}),
      })
      setState('success')
      setMessage('Відповіді надіслано — очікують перевірки.')
      setTicked({})
      setSentId(res.submission_id)
      onSubmitted(res.submission_id)
    } catch (err) {
      if (err instanceof PortalApiError && err.status === 401) return // centralised
      setState('error')
      setMessage(submitErrorMessage(err))
      if (doorRefusal(err)?.code === 'TEST_VERSION_CHANGED') {
        setReloadKey((k) => k + 1)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (structure === null || state === 'submitting') return // no double POST
    if (unanswered.length > 0 && state !== 'confirming') {
      setState('confirming')
      return
    }
    void send()
  }

  const courseLanguageName = languages.find((l) => l.code === courseLanguage)
  const courseLanguageLabel =
    courseLanguageName === undefined
      ? 'Мовою курсу'
      : `Мовою курсу (${courseLanguageName.name_native || courseLanguageName.name_en})`

  const accepting = structure?.accepting_answers === true
  const tone = state === 'success' ? 'bg-forest-pale text-forest' : 'bg-coral-pale text-coral'
  const Icon = state === 'success' ? CheckCircle2 : AlertCircle

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-display text-lg text-ink">Відповіді на тест</h3>

      {structure === null && !loadError && (
        <div className="flex items-center gap-2 text-ink-muted text-sm">
          <Loader2 size={16} className="animate-spin" />
          Завантаження тесту…
        </div>
      )}
      {loadError && (
        <div className="p-3 rounded-xl bg-coral-pale text-coral text-sm">{loadError}</div>
      )}

      {structure !== null && (
        <>
          <ol className="space-y-4 list-none p-0">
            {structure.questions.map((q) => (
              <li key={q.number}>
                <fieldset>
                  <legend className="text-sm font-medium text-ink">
                    {q.number}. {q.text}
                  </legend>
                  <div className="mt-2 space-y-1.5">
                    {q.options.map((o) => (
                      <label
                        key={o.label}
                        className="flex items-start gap-2 text-sm text-ink-light"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={(ticked[q.number] ?? []).includes(o.label)}
                          onChange={() => toggle(q.number, o.label)}
                          disabled={!accepting || state === 'submitting'}
                        />
                        <span>
                          {o.label}) {o.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ol>

          {!accepting ? (
            <p className="p-3 rounded-xl bg-canvas-dark text-ink-muted text-sm">
              Тест ще не готовий приймати відповіді.
            </p>
          ) : (
            <>
              <label className="block">
                <span className="block text-sm font-medium text-ink mb-1.5">
                  Мова рецензії
                </span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="input"
                >
                  {courseLanguage !== null && (
                    <option value="">{courseLanguageLabel}</option>
                  )}
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name_native || l.name_en}
                    </option>
                  ))}
                </select>
              </label>

              {state === 'confirming' ? (
                <div
                  role="alertdialog"
                  aria-label="Підтвердження подачі"
                  className="p-3 rounded-xl bg-navy/10 text-navy text-sm space-y-3"
                >
                  <p className="flex items-start gap-2">
                    <HelpCircle size={16} className="shrink-0 mt-0.5" />
                    {unansweredWarning(unanswered)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary btn-sm">
                      Надіслати все одно
                    </button>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setState('idle')}
                    >
                      Повернутися до тесту
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {message && (
                    <div
                      className={`flex items-start gap-2 p-3 rounded-xl text-sm ${tone}`}
                    >
                      <Icon size={16} className="shrink-0 mt-0.5" />
                      {message}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={state === 'submitting'}
                    className="btn-primary"
                  >
                    {state === 'submitting' ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={16} />
                        Надіслати відповіді
                      </>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}
    </form>
  )
}
