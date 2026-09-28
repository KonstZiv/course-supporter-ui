import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { documentsApi } from '../../api/documents'
import { nodesApi } from '../../api/nodes'
import { testsApi } from '../../api/tests'
import { usePolling } from '../../hooks/usePolling'
import type { WrittenTestCheck, WrittenTestResponse } from '../../types/api'
import {
  draftAfterSave,
  draftBody,
  draftFromServer,
  emptyDraft,
  fieldProblems,
  hasUnsavedChanges,
  incompletePlaces,
  type TestDraft,
} from '../../utils/testDraft'
import {
  actionFailure,
  NO_NODE_FOR_NEW_TEST,
  NOT_SAVED_SEE_BELOW,
  openingFailure,
  placeInDraft,
  POLLING_FAILED,
  type TestAction,
} from '../../utils/testRefusals'
import { TEXTS } from './editorTexts'

/** An existing test by its document, or a new one for a node of a course. */
export type EditorAddress =
  | { documentId: string }
  | { documentId?: undefined; nodeId: string | null; courseId: string | null }

/** A refused save's words, at the card and option it names. */
export interface ServerMark {
  questionKey: string
  optionKey: string | null
  words: string
}

// The pace of the document state poll the course page already keeps.
const POLL_INTERVAL_MS = 4000

function hasDoubts(check: WrittenTestCheck): boolean {
  return Object.values(check.doubts).some(Boolean)
}

/**
 * The test editor's state (PRE-FLIGHT §15.3): ``saved``, the server's last
 * answer, and ``draft``, what the author has typed since. A save sends the
 * draft's body; a refusal leaves the draft alone; a check's state is polled
 * while it runs, and the poll touches ``saved`` only. Each action says what
 * it did in ``status`` or what went wrong in ``banner``.
 */
export function useTestEditor(address: EditorAddress) {
  const [saved, setSaved] = useState<WrittenTestResponse | null>(null)
  const [language, setLanguage] = useState<string | null>(null)
  const [draft, setDraft] = useState<TestDraft>(emptyDraft)
  const [loading, setLoading] = useState(true)
  const [openError, setOpenError] = useState<string | null>(null)
  const [busy, setBusy] = useState<TestAction | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [serverMark, setServerMark] = useState<ServerMark | null>(null)
  // A save was tried: an empty title is shown as an error from then on, not
  // before the author has had a chance to type one.
  const [attempted, setAttempted] = useState(false)
  // Bumped whenever errors are shown, so the page can move focus to the first.
  const [errorsShown, setErrorsShown] = useState(0)

  const draftRef = useRef(draft)
  draftRef.current = draft
  const savedIdRef = useRef<string | null>(null)
  savedIdRef.current = saved?.id ?? null
  const busyRef = useRef(busy)
  busyRef.current = busy
  // Bumped at the start of every action. A poll answer is kept only when no
  // action began while it was on its way: one that did answers with a newer
  // state, whether it is still under way or already done.
  const actionsRef = useRef(0)

  const { documentId } = address
  const nodeId = address.documentId === undefined ? address.nodeId : null
  const courseId = address.documentId === undefined ? address.courseId : null

  useEffect(() => {
    let cancelled = false
    if (documentId !== undefined) {
      // A new test's own address after its first save: it is here already.
      if (savedIdRef.current === documentId) return
      setLoading(true)
      testsApi.get(documentId).then(
        (test) => {
          if (cancelled) return
          setSaved(test)
          setDraft(draftFromServer(test))
          setLanguage(test.language)
          setLoading(false)
        },
        (error: unknown) => {
          if (cancelled) return
          setOpenError(openingFailure(error))
          setLoading(false)
        },
      )
    } else if (nodeId === null || courseId === null) {
      setOpenError(NO_NODE_FOR_NEW_TEST)
      setLoading(false)
    } else {
      // A new test's options are lettered in its course's language.
      nodesApi.getNode(courseId).then(
        (course) => {
          if (cancelled) return
          setLanguage(course.default_language)
          setLoading(false)
        },
        () => {
          if (cancelled) return
          setOpenError(NO_NODE_FOR_NEW_TEST)
          setLoading(false)
        },
      )
    }
    return () => {
      cancelled = true
    }
  }, [documentId, nodeId, courseId])

  const savedDraft = useMemo(
    () => (saved === null ? emptyDraft() : draftFromServer(saved)),
    [saved],
  )
  const unsaved = useMemo(
    () => hasUnsavedChanges(draft, savedDraft),
    [draft, savedDraft],
  )
  const incomplete = useMemo(() => incompletePlaces(draft), [draft])
  const problems = useMemo(() => fieldProblems(draft), [draft])

  const update = useCallback((change: (draft: TestDraft) => TestDraft) => {
    setDraft(change)
  }, [])

  const fail = useCallback((action: TestAction, error: unknown) => {
    const failure = actionFailure(action, error)
    setBanner(failure.banner)
    setStatus(null)
    setErrorsShown((n) => n + 1)
    return failure
  }, [])

  /** Save the draft; resolves to a new test's id once it is created. */
  const save = useCallback(async (): Promise<string | null> => {
    const sent = draftRef.current
    setAttempted(true)
    setServerMark(null)
    if (fieldProblems(sent).length > 0) {
      setBanner(NOT_SAVED_SEE_BELOW)
      setStatus(null)
      setErrorsShown((n) => n + 1)
      return null
    }
    actionsRef.current += 1
    setBusy('save')
    setBanner(null)
    try {
      const body = draftBody(sent)
      const creating = saved === null
      const answer = creating
        ? await testsApi.create(nodeId ?? '', body)
        : await testsApi.replace(saved.id, body)
      setSaved(answer)
      setLanguage(answer.language)
      setDraft((current) => draftAfterSave(current, sent, answer))
      setStatus(creating ? TEXTS.created : TEXTS.saved)
      return creating ? answer.id : null
    } catch (error) {
      const failure = fail('save', error)
      const place = failure.at && placeInDraft(sent, failure.at)
      if (failure.at && place) {
        setServerMark({ ...place, words: failure.at.words })
      }
      return null
    } finally {
      setBusy(null)
    }
  }, [saved, nodeId, fail])

  const check = useCallback(async () => {
    if (saved === null) return
    actionsRef.current += 1
    setBusy('check')
    setBanner(null)
    try {
      const answer = await testsApi.check(saved.id)
      setSaved((current) => current && { ...current, check: answer })
      setStatus(
        answer.state === 'ready' ? TEXTS.checkAlreadyReady : TEXTS.checkOrdered,
      )
    } catch (error) {
      fail('check', error)
    } finally {
      setBusy(null)
    }
  }, [saved, fail])

  const publish = useCallback(async () => {
    if (saved === null) return
    actionsRef.current += 1
    setBusy('publish')
    setBanner(null)
    try {
      const answer = await testsApi.publish(saved.id)
      let fresh = saved
      try {
        fresh = await testsApi.get(saved.id)
        setSaved(fresh)
      } catch {
        // The publication stands; the next poll or save reads the rest.
      }
      setStatus(
        !answer.created
          ? TEXTS.alreadyPublished
          : fresh.check.state === 'ready'
            ? TEXTS.publishedNow
            : `${TEXTS.publishedNow} ${TEXTS.explanationsComing}`,
      )
    } catch (error) {
      fail('publish', error)
    } finally {
      setBusy(null)
    }
  }, [saved, fail])

  /** The saved draft as a YAML file, named by the test. */
  const exportYaml = useCallback(async () => {
    if (saved === null) return
    actionsRef.current += 1
    setBusy('export')
    setBanner(null)
    try {
      const text = await testsApi.exportYaml(saved.id)
      const url = URL.createObjectURL(
        new Blob([text], { type: 'application/yaml' }),
      )
      const link = document.createElement('a')
      link.href = url
      link.download = `${saved.title?.trim() || 'test'}.yaml`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      fail('export', error)
    } finally {
      setBusy(null)
    }
  }, [saved, fail])

  const replaceWithYaml = useCallback(
    async (file: File) => {
      if (saved === null) return
      actionsRef.current += 1
      setBusy('replace')
      setBanner(null)
      setServerMark(null)
      try {
        const answer = await testsApi.replaceWithYaml(saved.id, file)
        setSaved(answer)
        setDraft(draftFromServer(answer))
        setStatus(TEXTS.replacedFromFile)
      } catch (error) {
        fail('replace', error)
      } finally {
        setBusy(null)
      }
    },
    [saved, fail],
  )

  /** Hide the test; resolves to true once it is hidden. */
  const hide = useCallback(async (): Promise<boolean> => {
    if (saved === null) return false
    actionsRef.current += 1
    setBusy('hide')
    setBanner(null)
    try {
      await documentsApi.delete(saved.id)
      return true
    } catch (error) {
      fail('hide', error)
      return false
    } finally {
      setBusy(null)
    }
  }, [saved, fail])

  const showBanner = useCallback((words: string) => {
    setBanner(words)
    setStatus(null)
  }, [])

  usePolling(
    async () => {
      const id = savedIdRef.current
      if (id === null) return true
      const actionsBefore = actionsRef.current
      try {
        const fresh = await testsApi.get(id)
        // A save, a replacement or a publication in flight answers with the
        // newer draft; a poll answer read before it must not undo it.
        if (busyRef.current !== null) return false
        // Nor once that action is done, if it began after this answer was asked.
        if (actionsRef.current !== actionsBefore) return false
        setSaved(fresh)
        setBanner((current) => (current === POLLING_FAILED ? null : current))
        if (fresh.check.state === 'ready') {
          setStatus(
            hasDoubts(fresh.check)
              ? `${TEXTS.checkReady} ${TEXTS.checkReadyDoubts}`
              : TEXTS.checkReady,
          )
          return true
        }
        if (fresh.check.state === 'failed') {
          setStatus(TEXTS.checkFailedTryAgain)
          return true
        }
        return fresh.check.state !== 'in_progress'
      } catch {
        setBanner(POLLING_FAILED)
        return false
      }
    },
    POLL_INTERVAL_MS,
    saved?.check.state === 'in_progress',
  )

  const backTo =
    saved !== null
      ? `/course/${saved.course_root_id}?selected=${saved.course_node_id}`
      : courseId !== null && nodeId !== null
        ? `/course/${courseId}?selected=${nodeId}`
        : '/'

  return {
    loading,
    openError,
    saved,
    savedDraft,
    language,
    draft,
    unsaved,
    incomplete,
    problems,
    attempted,
    busy,
    status,
    banner,
    serverMark,
    errorsShown,
    backTo,
    update,
    save,
    check,
    publish,
    exportYaml,
    replaceWithYaml,
    hide,
    showBanner,
  }
}

export type TestEditor = ReturnType<typeof useTestEditor>
