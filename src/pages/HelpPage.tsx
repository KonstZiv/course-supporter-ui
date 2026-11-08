import { ContactAdmin } from '../components/ui/ContactAdmin'

// Help page: brief author path with links to the documentation site,
// and direct contact affordance for the platform administrator.

interface StepPart {
  text: string
  href?: string
}

interface StepItem {
  parts: StepPart[]
}

const AUTHOR_STEPS: StepItem[] = [
  {
    parts: [
      { text: 'Увійдіть у програму автора ключем доступу — ' },
      {
        text: 'Вхід і перший курс',
        href: 'https://about.pythoncourse.me/uk/authors/first-course/',
      },
      { text: '.' },
    ],
  },
  {
    parts: [
      { text: 'Створіть курс і вкажіть його мову — ' },
      {
        text: 'там само',
        href: 'https://about.pythoncourse.me/uk/authors/first-course/',
      },
      { text: '.' },
    ],
  },
  {
    parts: [
      {
        text: 'Створіть розділи курсу — одразу в тому порядку, у якому їх має бачити студент: ',
      },
      {
        text: 'Структура курсу',
        href: 'https://about.pythoncourse.me/uk/authors/structure/',
      },
      { text: '.' },
    ],
  },
  {
    parts: [
      {
        text: 'Завантажте в кожен розділ матеріали: навчальні — для студентів, методичні — для помічників платформи: ',
      },
      {
        text: 'Матеріали',
        href: 'https://about.pythoncourse.me/uk/authors/materials/',
      },
      { text: '.' },
    ],
  },
  {
    parts: [
      { text: 'Додайте завдання й тести: ' },
      {
        text: 'Завдання',
        href: 'https://about.pythoncourse.me/uk/authors/tasks/',
      },
      { text: ', ' },
      {
        text: 'Тести',
        href: 'https://about.pythoncourse.me/uk/authors/tests/',
      },
      { text: '.' },
    ],
  },
  {
    parts: [
      { text: 'Коли залито все, запустіть Методиста для всього курсу — ' },
      {
        text: 'Описи розділів: Методист',
        href: 'https://about.pythoncourse.me/uk/authors/methodist/#when',
      },
      { text: '.' },
    ],
  },
  {
    parts: [
      {
        text: 'Перегляньте описи розділів, виправте, що треба, і затвердьте — ',
      },
      {
        text: 'там само',
        href: 'https://about.pythoncourse.me/uk/authors/methodist/#edit',
      },
      { text: '.' },
    ],
  },
  {
    parts: [{ text: 'Додайте студентів і зарахуйте їх на курс.' }],
  },
  {
    parts: [{ text: 'Стежте за витратами.' }],
  },
]

// прибрати, коли на сайті з'являться сторінки про студентів і витрати
export const STEPS_IN_PROGRESS_NOTE = 'Сторінки про кроки 8–9 ще готуються.'

export function HelpPage() {
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="page-title">Довідка</h1>
          <p className="page-subtitle">Шлях автора за кроками й допомога</p>
        </div>

        {/* Розділ 1 — Шлях автора за кроками */}
        <section className="space-y-4">
          <h2 className="font-display text-xl text-ink">
            Шлях автора за кроками
          </h2>
          <p className="text-ink">
            Це короткий шлях автора курсу. Докладні пояснення — на сайті
            документації; сторінки відкриваються в новій вкладці.
          </p>

          <ol className="list-decimal list-inside space-y-2 text-ink">
            {AUTHOR_STEPS.map((step, idx) => (
              <li key={idx} className="text-ink">
                {step.parts.map((part, pIdx) =>
                  part.href ? (
                    <a
                      key={pIdx}
                      href={part.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-navy underline underline-offset-2 hover:text-navy-light"
                    >
                      {part.text}
                    </a>
                  ) : (
                    <span key={pIdx}>{part.text}</span>
                  ),
                )}
              </li>
            ))}
          </ol>

          <div className="pt-2 space-y-2 text-ink">
            <p>{STEPS_IN_PROGRESS_NOTE}</p>
            <p>
              Хто з помічників що читає —{' '}
              <a
                href="https://about.pythoncourse.me/uk/authors/how-it-works/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline underline-offset-2 hover:text-navy-light"
              >
                Як платформа розуміє ваш курс
              </a>
              . Усі сторінки для авторів —{' '}
              <a
                href="https://about.pythoncourse.me/uk/authors/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline underline-offset-2 hover:text-navy-light"
              >
                на сайті документації
              </a>
              .
            </p>
          </div>
        </section>

        {/* Розділ 2 — Як написати адміністраторові платформи */}
        <section className="space-y-4">
          <h2 className="font-display text-xl text-ink">
            Як написати адміністраторові платформи
          </h2>

          <p className="text-ink">
            Якщо щось не виходить або потрібна допомога — наприклад, новий ключ
            доступу, — пишіть адміністраторові платформи.
          </p>

          <p className="text-ink">
            Натисніть кнопку — відкриється готовий лист: адреса й тема вже є.
            Допишіть, що ви робили перед цим, і додайте кадр екрана, якщо він
            допоможе.
          </p>

          <ContactAdmin fallback="always" />

          <p className="text-ink font-medium pt-2">Що добре мати в листі:</p>
          <ul className="list-disc list-inside space-y-1 text-ink">
            <li>назва курсу й розділу;</li>
            <li>назва матеріалу чи тесту, якщо йдеться про нього;</li>
            <li>коли це сталося — дата й приблизний час;</li>
            <li>дослівний текст повідомлення, яке ви побачили;</li>
            <li>кадр екрана.</li>
          </ul>

          <p className="text-ink pt-1">
            <strong>Важливо.</strong> Ключа доступу не надсилайте ніколи — ні в
            листі, ні на кадрі екрана.
          </p>
        </section>
      </div>
    </div>
  )
}
