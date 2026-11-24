import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// Enrollment by a course link (O-1): the course card, the signup with its two
// marks, the answers of the server, and the one-press join of a student who
// already has a session of this author's portal. The revision of the terms a
// join consents to is the card's; terms changed while the page was open — the
// card is read again. The real router; the requests mocked.

const api = vi.hoisted(() => ({
  joinCard: vi.fn(),
  joinSignup: vi.fn(),
  joinCourse: vi.fn(),
  billingTerms: vi.fn(),
}))
vi.mock('../api/portalClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/portalClient')>()
  return { ...actual, portalApi: { ...actual.portalApi, ...api } }
})

import { PortalApp } from '../App'
import { PortalApiError } from '../api/portalClient'
import { PortalLanguageProvider } from '../components/PortalLanguageProvider'
import { usePortalLanguage } from '../stores/language'
import { usePortalSession } from '../stores/session'
import { consentSha256, joinConsentLines } from '../../utils/billingConsent'
import { importGraph, literalsOf } from '../../i18n/sourceScan'

const T = '019eda80-67ea-7060-b4c4-9dc85761690e'
const OTHER = '019edb00-0000-7000-8000-000000000002'
const KEY = 'k3y-AbC'
const COURSE = '019edc00-0000-7000-8000-00000000c0de'
const SIGNUP = '019edc00-0000-7000-8000-0000000000aa'
const CARD = {
  course_id: COURSE,
  course_title: 'Python із нуля',
  author_name: 'Школа Олени',
  languages: ['ukr', 'eng'],
  // Not the revision of any other fixture: what is sent comes from here.
  terms_version: '2027-01-15',
}

function refusal(status: number, code: string, details = 'x', retryAfter: number | null = null) {
  return new PortalApiError(status, 'x', { detail: { code, details } }, retryAfter)
}

function renderAt(path: string) {
  const router = createMemoryRouter([{ path: '*', element: <PortalApp /> }], {
    initialEntries: [path],
  })
  render(
    <PortalLanguageProvider>
      <RouterProvider router={router} />
    </PortalLanguageProvider>,
  )
  return router
}

function signIn(tenantId = T) {
  usePortalSession.getState().setSession({
    token: 'jwt',
    tenantId,
    studentId: '019edaa5-1111-7000-8000-000000000001',
    displayName: 'Олена',
  })
}

function fillSignup({ password = 'long-enough-1', email = 'olena@example.com' } = {}) {
  fireEvent.change(screen.getByLabelText('Логін'), { target: { value: ' olena ' } })
  fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Пошта'), { target: { value: email } })
}

function checkMarks() {
  fireEvent.click(screen.getByLabelText('Мені виповнилося 18 років.'))
  fireEvent.click(screen.getByRole('checkbox', { name: /Я прочитав\(-ла\) і приймаю/ }))
}

const joinButton = () => screen.getByRole('button', { name: /^Записатися$/ })

beforeEach(() => {
  localStorage.clear()
  usePortalSession.getState().clear()
  usePortalLanguage.setState({ language: 'uk', picked: false, syncedToken: null })
  for (const mock of Object.values(api)) mock.mockReset()
  api.joinCard.mockResolvedValue(CARD)
})

describe('the course card', () => {
  it('shows the course, its author and languages, and that the course is free', async () => {
    renderAt(`/${T}/join/${KEY}`)
    expect(await screen.findByRole('heading', { name: 'Python із нуля' })).toBeInTheDocument()
    expect(api.joinCard).toHaveBeenCalledWith(T, KEY)
    expect(screen.getByText('Автор: Школа Олени')).toBeInTheDocument()
    expect(screen.getByText('Мови курсу: українська, англійська')).toBeInTheDocument()
    expect(
      screen.getByText(/Курс безкоштовний; перевірки робіт оплачуються юнітами\./),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ціни' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/uk/pricing/',
    )
  })

  it('an unknown or closed link says so, and asks for a new one', async () => {
    api.joinCard.mockRejectedValue(refusal(404, 'course_not_found'))
    renderAt(`/${T}/join/${KEY}`)
    expect(
      await screen.findByText(
        'Посилання на запис недійсне або запис закрито. Попросіть в автора нове посилання.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Логін')).not.toBeInTheDocument()
  })

  it('a tenant segment that is not a UUID is the neutral page, asked nothing', () => {
    renderAt(`/not-a-uuid/join/${KEY}`)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Навчальний портал Course Supporter' }),
    ).toBeInTheDocument()
    expect(api.joinCard).not.toHaveBeenCalled()
  })
})

describe('the signup', () => {
  it('has both marks, the consent lines and links; the button waits for both marks', async () => {
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    const marks = screen.getByRole('group', { name: 'Перед записом на курс підтвердьте:' })
    // What is shown is what is fingerprinted: the four lines, word for word.
    const [, checkboxLine, ...rest] = joinConsentLines('uk')
    expect(within(marks).getByRole('checkbox', { name: checkboxLine })).toBeInTheDocument()
    for (const line of rest) {
      expect(within(marks).getByText(line)).toBeInTheDocument()
    }
    expect(within(marks).getByRole('link', { name: 'Умови користування' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/uk/terms/',
    )
    expect(within(marks).getByRole('link', { name: 'Правила повернення' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/uk/refunds/',
    )
    expect(within(marks).getByRole('link', { name: 'Політику конфіденційності' })).toHaveAttribute(
      'href',
      'https://pythoncourse.me/uk/privacy/',
    )

    fillSignup()
    expect(joinButton()).toBeDisabled()
    fireEvent.click(screen.getByLabelText('Мені виповнилося 18 років.'))
    expect(joinButton()).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Я прочитав\(-ла\) і приймаю/ }))
    expect(joinButton()).toBeEnabled()
    fireEvent.click(screen.getByLabelText('Мені виповнилося 18 років.'))
    expect(joinButton()).toBeDisabled()
  })

  it('202: sends the form with both marks and the fingerprint, then asks to confirm the email', async () => {
    api.joinSignup.mockResolvedValue({
      signup_id: SIGNUP,
      email_masked: 'o***@e***.com',
      expires_at: '2026-11-30T10:00:00Z',
    })
    const router = renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup()
    fireEvent.change(screen.getByLabelText('Імʼя (необовʼязково)'), { target: { value: 'Олена' } })
    checkMarks()
    fireEvent.click(joinButton())

    expect(await screen.findByRole('heading', { name: 'Підтвердіть пошту' })).toBeInTheDocument()
    expect(api.joinSignup).toHaveBeenCalledWith(T, KEY, {
      login: 'olena',
      password: 'long-enough-1',
      email: 'olena@example.com',
      display_name: 'Олена',
      interface_language: 'ukr',
      adult: true,
      terms_version: CARD.terms_version,
      text_sha256: await consentSha256(joinConsentLines('uk')),
    })
    expect(router.state.location.pathname).toBe(`/${T}/join/${KEY}/sent`)
    expect(router.state.location.search).toBe(`?signup=${SIGNUP}`)
    expect(screen.getByText('Лист надіслано на o***@e***.com.')).toBeInTheDocument()
    // Nothing of the course until the email is confirmed.
    expect(screen.queryByText('Python із нуля')).not.toBeInTheDocument()
  })

  it('the interface language is the portal\'s: choosing it switches the pages and is sent', async () => {
    api.joinSignup.mockResolvedValue({ signup_id: SIGNUP, email_masked: 'o***@e***.com', expires_at: 'x' })
    renderAt(`/${T}/join/${KEY}`)
    fireEvent.change(await screen.findByLabelText('Мова інтерфейсу'), { target: { value: 'en' } })
    expect(await screen.findByLabelText('Interface language')).toHaveValue('en')
    fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'olena' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'long-enough-1' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'olena@example.com' } })
    fireEvent.click(screen.getByLabelText('I am 18 or older.'))
    fireEvent.click(screen.getByRole('checkbox', { name: /I have read and accept/ }))
    fireEvent.click(screen.getByRole('button', { name: /^Join$/ }))
    await waitFor(() => expect(api.joinSignup).toHaveBeenCalled())
    const [, , req] = api.joinSignup.mock.calls[0]!
    expect(req.interface_language).toBe('eng')
    expect(req.display_name).toBeNull()
    expect(req.text_sha256).toBe(await consentSha256(joinConsentLines('en')))
  })

  it('409 login_taken: says so at the login', async () => {
    api.joinSignup.mockRejectedValue(refusal(409, 'login_taken'))
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup()
    checkMarks()
    fireEvent.click(joinButton())
    expect(await screen.findByText('Цей логін уже зайнятий. Оберіть інший.')).toBeInTheDocument()
    expect(screen.getByLabelText('Логін')).toHaveAttribute('aria-invalid', 'true')
  })

  it('409 terms_changed: reads the card again, asks to confirm again, sends its revision', async () => {
    api.joinCard
      .mockResolvedValueOnce(CARD)
      .mockResolvedValueOnce({ ...CARD, terms_version: '2027-02-01' })
    api.joinSignup
      // No revision in the refusal: nothing is read from its text.
      .mockRejectedValueOnce(refusal(409, 'terms_changed', 'The billing terms changed.'))
      .mockResolvedValueOnce({ signup_id: SIGNUP, email_masked: 'o***@e***.com', expires_at: 'x' })
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup()
    checkMarks()
    fireEvent.click(joinButton())
    expect(
      await screen.findByText('Умови оновилися. Перегляньте чинну редакцію й підтвердьте її, щоб продовжити.'),
    ).toBeInTheDocument()
    expect(api.joinCard).toHaveBeenCalledTimes(2)
    expect(api.joinSignup.mock.calls[0]![2].terms_version).toBe(CARD.terms_version)
    const consent = screen.getByRole('checkbox', { name: /Я прочитав\(-ла\) і приймаю/ })
    expect(consent).not.toBeChecked()
    expect(joinButton()).toBeDisabled()
    // What was typed stays.
    expect(screen.getByLabelText('Логін')).toHaveValue(' olena ')
    fireEvent.click(consent)
    fireEvent.click(joinButton())
    await screen.findByRole('heading', { name: 'Підтвердіть пошту' })
    expect(api.joinSignup.mock.calls[1]![2].terms_version).toBe('2027-02-01')
  })

  it('409 terms_changed, and the link closed meanwhile: the invalid-link page', async () => {
    api.joinCard
      .mockResolvedValueOnce(CARD)
      .mockRejectedValueOnce(refusal(404, 'course_not_found'))
    api.joinSignup.mockRejectedValue(refusal(409, 'terms_changed'))
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup()
    checkMarks()
    fireEvent.click(joinButton())
    expect(
      await screen.findByText(
        'Посилання на запис недійсне або запис закрито. Попросіть в автора нове посилання.',
      ),
    ).toBeInTheDocument()
  })

  it('422: a weak password and an unaccepted email, each in its words', async () => {
    api.joinSignup
      .mockRejectedValueOnce(new PortalApiError(422, 'x', { detail: 'Password too short.' }))
      .mockRejectedValueOnce(
        new PortalApiError(422, 'x', { detail: [{ type: 'x', loc: ['body', 'email'], msg: 'x' }] }),
      )
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup()
    checkMarks()
    fireEvent.click(joinButton())
    expect(await screen.findByText('Пароль має містити щонайменше 10 символів.')).toBeInTheDocument()
    fireEvent.click(joinButton())
    expect(await screen.findByText('Вкажіть коректну адресу пошти.')).toBeInTheDocument()
  })

  it('a short password or a broken email is said before anything is sent', async () => {
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup({ password: 'short' })
    checkMarks()
    fireEvent.click(joinButton())
    expect(await screen.findByText('Пароль має містити щонайменше 10 символів.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'long-enough-1' } })
    fireEvent.change(screen.getByLabelText('Пошта'), { target: { value: 'no-at-sign' } })
    fireEvent.click(joinButton())
    expect(await screen.findByText('Вкажіть коректну адресу пошти.')).toBeInTheDocument()
    expect(api.joinSignup).not.toHaveBeenCalled()
  })

  it('429: the minutes to wait, rounded up, from Retry-After', async () => {
    api.joinSignup.mockRejectedValue(refusal(429, 'rate_limited', 'x', 1500))
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup()
    checkMarks()
    fireEvent.click(joinButton())
    expect(await screen.findByText('Забагато спроб. Спробуйте через 25 хв.')).toBeInTheDocument()
  })

  it('a link closed since the page opened turns into the invalid-link page', async () => {
    api.joinSignup.mockRejectedValue(refusal(404, 'course_not_found'))
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    fillSignup()
    checkMarks()
    fireEvent.click(joinButton())
    expect(
      await screen.findByText(
        'Посилання на запис недійсне або запис закрито. Попросіть в автора нове посилання.',
      ),
    ).toBeInTheDocument()
  })

  it('"already have a sign-in" leads to this author\'s sign-in and back here', async () => {
    const router = renderAt(`/${T}/join/${KEY}`)
    await screen.findByLabelText('Логін')
    expect(screen.getByText(/Вже маєте вхід у цього автора\?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: 'Увійти' }))
    await screen.findByRole('heading', { name: 'Вхід' })
    expect(router.state.location.pathname).toBe(`/${T}/login`)
    expect(router.state.location.search).toBe(`?next=${encodeURIComponent(`/${T}/join/${KEY}`)}`)
    // …and from there, sign-in by email keeps the way back.
    expect(screen.getByRole('link', { name: 'Увійти за поштою' })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent(`/${T}/join/${KEY}`)}`,
    )
  })

  it('a session of another author is no session here: the signup is shown', async () => {
    signIn(OTHER)
    renderAt(`/${T}/join/${KEY}`)
    expect(await screen.findByLabelText('Логін')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Записатися на курс' })).not.toBeInTheDocument()
  })
})

describe('joining with a session of this author', () => {
  const joinWithLogin = () => screen.getByRole('button', { name: 'Записатися на курс' })

  it('shows the one-press join at once, with both marks; 201 opens the course', async () => {
    signIn()
    api.joinCourse.mockResolvedValue({ status: 'enrolled', course_id: COURSE })
    const router = renderAt(`/${T}/join/${KEY}`)
    await screen.findByRole('heading', { name: 'Python із нуля' })
    expect(screen.queryByLabelText('Логін')).not.toBeInTheDocument()
    expect(joinWithLogin()).toBeDisabled()
    checkMarks()
    fireEvent.click(joinWithLogin())
    await waitFor(() => expect(router.state.location.pathname).toBe(`/${T}/courses/${COURSE}`))
    expect(api.joinCourse).toHaveBeenCalledWith({
      tenant_id: T,
      key: KEY,
      adult: true,
      terms_version: CARD.terms_version,
      text_sha256: await consentSha256(joinConsentLines('uk')),
    })
    // The revision is the card's: the terms of the account are not asked.
    expect(api.billingTerms).not.toHaveBeenCalled()
  })

  it('409 terms_changed: reads the card again, asks to confirm again, sends its revision', async () => {
    signIn()
    api.joinCard
      .mockResolvedValueOnce(CARD)
      .mockResolvedValueOnce({ ...CARD, terms_version: '2027-02-01' })
    api.joinCourse
      .mockRejectedValueOnce(refusal(409, 'terms_changed'))
      .mockResolvedValueOnce({ status: 'enrolled', course_id: COURSE })
    const router = renderAt(`/${T}/join/${KEY}`)
    await screen.findByRole('heading', { name: 'Python із нуля' })
    checkMarks()
    fireEvent.click(joinWithLogin())
    expect(
      await screen.findByText('Умови оновилися. Перегляньте чинну редакцію й підтвердьте її, щоб продовжити.'),
    ).toBeInTheDocument()
    expect(api.joinCard).toHaveBeenCalledTimes(2)
    expect(joinWithLogin()).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { name: /Я прочитав\(-ла\) і приймаю/ }))
    fireEvent.click(joinWithLogin())
    await waitFor(() => expect(router.state.location.pathname).toBe(`/${T}/courses/${COURSE}`))
    expect(api.joinCourse.mock.calls.map(([req]) => req.terms_version)).toEqual([
      CARD.terms_version,
      '2027-02-01',
    ])
  })

  it('already_enrolled: says so and leads to the course', async () => {
    signIn()
    api.joinCourse.mockResolvedValue({ status: 'already_enrolled', course_id: COURSE })
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByRole('heading', { name: 'Python із нуля' })
    checkMarks()
    fireEvent.click(joinWithLogin())
    expect(await screen.findByText('Ви вже на цьому курсі.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Перейти до курсу/ })).toHaveAttribute(
      'href',
      `/${T}/courses/${COURSE}`,
    )
  })

  it('email_confirmation_required: explains and leads to the portal home, where the email is added', async () => {
    signIn()
    api.joinCourse.mockRejectedValue(refusal(409, 'email_confirmation_required'))
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByRole('heading', { name: 'Python із нуля' })
    checkMarks()
    fireEvent.click(joinWithLogin())
    expect(await screen.findByText(/потрібна підтверджена пошта/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /На головну порталу/ })).toHaveAttribute(
      'href',
      `/${T}/home`,
    )
  })

  it('429: the minutes to wait', async () => {
    signIn()
    api.joinCourse.mockRejectedValue(refusal(429, 'rate_limited', 'x', 59))
    renderAt(`/${T}/join/${KEY}`)
    await screen.findByRole('heading', { name: 'Python із нуля' })
    checkMarks()
    fireEvent.click(joinWithLogin())
    expect(await screen.findByText('Забагато спроб. Спробуйте через 1 хв.')).toBeInTheDocument()
  })
})

describe('the revision of the terms', () => {
  it('no date is written in the portal code: the revision always comes from the server', () => {
    const DATE = /\d{4}-\d{2}-\d{2}/
    const files = importGraph('/src/portal/main.tsx')
    expect(files).toContain('/src/portal/pages/PortalJoinPage.tsx')
    expect(files).toContain('/src/portal/openCourses.ts')
    const found = files.flatMap((file) =>
      literalsOf(file)
        .filter((text) => DATE.test(text))
        .map((text) => `${file}: ${text}`),
    )
    expect(found).toEqual([])
  })
})
