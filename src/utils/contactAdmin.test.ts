import { describe, expect, it } from 'vitest'
import { useAuthStore } from '../stores/auth'
import {
  asksToWriteToAdmin,
  formatWhen,
  LETTER_SUBJECT,
  SUPPORT_ADDRESS,
  supportLetter,
  WRITE_TO_US_PHRASE,
} from './contactAdmin'

describe('contactAdmin', () => {
  it('exports constant phrase and support address', () => {
    expect(WRITE_TO_US_PHRASE).toBe('напишіть нам')
    expect(SUPPORT_ADDRESS).toBe('support@pythoncourse.me')
  })

  it('subject is literally "Course Supporter: звернення з програми автора"', () => {
    expect(LETTER_SUBJECT).toBe('Course Supporter: звернення з програми автора')
    const letter = supportLetter({})
    expect(letter.subject).toBe('Course Supporter: звернення з програми автора')
  })

  it('generates expected body without message (help page query)', () => {
    const letter = supportLetter({})
    const expected = [
      'Добрий день!',
      '',
      'Звертаюся з програми автора Course Supporter.',
      '',
      'Моє питання:',
      '',
      '',
    ].join('\r\n')

    expect(letter.body).toBe(expected)
    expect(letter.address).toBe(SUPPORT_ADDRESS)
    expect(letter.href.startsWith(`mailto:${SUPPORT_ADDRESS}?subject=`)).toBe(
      true,
    )
    expect(letter.href).toContain('%0D%0A')
    expect(letter.href).not.toContain('+')
  })

  it('generates expected body with message and all context fields', () => {
    const fixedNow = new Date('2026-11-03T14:32:00+01:00')
    const letter = supportLetter({
      message: 'Сторінку не вдалося показати. Оновіть її; якщо повториться, напишіть нам.',
      context: {
        course: 'Python',
        section: 'Вступ',
        material: 'intro.pdf',
        test: 'Тест 1',
      },
      page: 'https://author.pythoncourse.me/course/123',
      now: fixedNow,
    })

    const expected = [
      'Добрий день!',
      '',
      'Звертаюся з програми автора Course Supporter. Програма показала повідомлення:',
      '«Сторінку не вдалося показати. Оновіть її; якщо повториться, напишіть нам.»',
      '',
      'Курс: Python',
      'Розділ: Вступ',
      'Матеріал: intro.pdf',
      'Тест: Тест 1',
      'Сторінка: https://author.pythoncourse.me/course/123',
      `Коли: ${formatWhen(fixedNow)}`,
      '',
      'Що відбувалося перед цим — кілька слів:',
      '',
      '',
    ].join('\r\n')

    expect(letter.body).toBe(expected)

    // Decoded body from href equals expected literally
    const bodyParam = letter.href.slice(letter.href.indexOf('&body=') + 6)
    expect(decodeURIComponent(bodyParam)).toBe(expected)
    expect(letter.href.length).toBeLessThanOrEqual(1900)
  })

  it('omits empty, null, or missing context lines entirely', () => {
    const letter = supportLetter({
      message: 'Помилка мережі. Якщо повториться, напишіть нам.',
      context: {
        course: '',
        section: null,
        material: undefined,
        test: '   ',
      },
    })

    expect(letter.body).not.toContain('Курс:')
    expect(letter.body).not.toContain('Розділ:')
    expect(letter.body).not.toContain('Матеріал:')
    expect(letter.body).not.toContain('Тест:')
    expect(letter.body).not.toContain('Сторінка:')
    expect(letter.body).not.toContain('Коли:')

    const expected = [
      'Добрий день!',
      '',
      'Звертаюся з програми автора Course Supporter. Програма показала повідомлення:',
      '«Помилка мережі. Якщо повториться, напишіть нам.»',
      '',
      'Що відбувалося перед цим — кілька слів:',
      '',
      '',
    ].join('\r\n')

    expect(letter.body).toBe(expected)
  })

  it('truncates long values (120 for context, 600 for message) with unicode ellipsis', () => {
    const longMsg = 'm'.repeat(700)
    const longCourse = 'c'.repeat(150)
    const longSection = 's'.repeat(130)

    const letter = supportLetter({
      message: longMsg,
      context: {
        course: longCourse,
        section: longSection,
      },
    })

    const expectedMsg = 'm'.repeat(599) + '…'
    const expectedCourse = 'c'.repeat(119) + '…'
    const expectedSection = 's'.repeat(119) + '…'

    expect(letter.body).toContain(`«${expectedMsg}»`)
    expect(letter.body).toContain(`Курс: ${expectedCourse}`)
    expect(letter.body).toContain(`Розділ: ${expectedSection}`)
  })

  it('replaces linebreaks in values with a space', () => {
    const letter = supportLetter({
      message: 'Рядок 1\r\nРядок 2\nРядок 3',
      context: {
        course: 'Курс\nЧастина 1',
      },
    })

    expect(letter.body).toContain('«Рядок 1 Рядок 2 Рядок 3»')
    expect(letter.body).toContain('Курс: Курс Частина 1')
  })

  it('keeps href length <= 1900 even with a 5000-char message and four 500-char context values', () => {
    const letter = supportLetter({
      message: 'П'.repeat(5000),
      context: {
        course: 'К'.repeat(500),
        section: 'Р'.repeat(500),
        material: 'М'.repeat(500),
        test: 'Т'.repeat(500),
      },
      page: 'https://author.pythoncourse.me/' + 'x'.repeat(500),
      now: new Date('2026-11-03T14:32:00Z'),
    })

    expect(letter.href.length).toBeLessThanOrEqual(1900)
    expect(letter.href.startsWith(`mailto:${SUPPORT_ADDRESS}?subject=`)).toBe(
      true,
    )
  })

  it('never leaks access key into the letter', () => {
    const secretKey = 'cs_live_key_secret_never_leak_this_token'
    useAuthStore.setState({ apiKey: secretKey, connected: true })
    localStorage.setItem('cs_api_key', secretKey)

    const letter = supportLetter({
      message: 'Сталася помилка, напишіть нам.',
      context: {
        course: 'Python 101',
      },
      page: 'https://author.pythoncourse.me/course/1',
      now: new Date(),
    })

    expect(letter.body).not.toContain(secretKey)
    expect(letter.href).not.toContain(secretKey)
    expect(letter.body).not.toContain('cs_live')
    expect(letter.href).not.toContain('cs_live')
  })

  describe('asksToWriteToAdmin', () => {
    const SEVEN_TEXTS = [
      'Сторінку не вдалося показати. Оновіть її; якщо повториться, напишіть нам.',
      'Не вдалося запустити обробку «lesson.pdf». Спробуйте ще раз; якщо повториться, напишіть нам.',
      'Не вдалося зберегти назву — спробуйте ще раз. Якщо повториться, напишіть нам.',
      'Текст тесту не пройшов перевірку безпеки. Якщо ви впевнені, що з ним усе гаразд, напишіть нам — ми перевіримо.',
      'Текст тесту не пройшов перевірку безпеки. Перевірте тексти й спробуйте ще раз; якщо повториться, напишіть нам.',
      'Не вдалося обробити цей матеріал — спробуйте ще раз. Якщо повториться, напишіть нам, ми розберемося.',
      'Матеріал не пройшов перевірку безпеки вмісту. Якщо ви впевнені, що з матеріалом усе гаразд, напишіть нам — ми перевіримо.',
    ]

    for (const [index, text] of SEVEN_TEXTS.entries()) {
      it(`returns true for section 2 message #${index + 1}`, () => {
        expect(asksToWriteToAdmin(text)).toBe(true)
      })
    }

    it('returns false for message without the phrase', () => {
      expect(
        asksToWriteToAdmin(
          'Файл завеликий. Зменште його або розділіть на частини.',
        ),
      ).toBe(false)
    })

    it('returns false for null, undefined, and empty string', () => {
      expect(asksToWriteToAdmin(null)).toBe(false)
      expect(asksToWriteToAdmin(undefined)).toBe(false)
      expect(asksToWriteToAdmin('')).toBe(false)
    })

    it('checks case-insensitively', () => {
      expect(asksToWriteToAdmin('НАПИШІТЬ НАМ')).toBe(true)
      expect(asksToWriteToAdmin('Напишіть нам')).toBe(true)
    })
  })
})
