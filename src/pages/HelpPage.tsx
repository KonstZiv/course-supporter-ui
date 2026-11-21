import { ContactAdmin } from '../components/ui/ContactAdmin'
import { docsUrl } from '../components/site/siteLinks'
import { useLanguage, useT } from '../i18n/LanguageContext'
import type { Language } from '../i18n/languages'
import { translate, translateRich } from '../i18n/translate'

// Help page: brief author path with links to the documentation site,
// and direct contact affordance for the platform administrator.

interface StepPart {
  text: string
  href?: string
}

interface StepItem {
  parts: StepPart[]
}

function getAuthorSteps(language: Language): StepItem[] {
  return [
    {
      parts: [
        { text: translate(language, 'panel.help.steps.step1.part1') },
        {
          text: translate(language, 'panel.help.steps.step1.link'),
          href: docsUrl(language, 'authors/first-course/'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
    {
      parts: [
        { text: translate(language, 'panel.help.steps.step2.part1') },
        {
          text: translate(language, 'panel.help.steps.samePlace'),
          href: docsUrl(language, 'authors/first-course/'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
    {
      parts: [
        {
          text: translate(language, 'panel.help.steps.step3.part1'),
        },
        {
          text: translate(language, 'panel.help.steps.step3.link'),
          href: docsUrl(language, 'authors/structure/'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
    {
      parts: [
        {
          text: translate(language, 'panel.help.steps.step4.part1'),
        },
        {
          text: translate(language, 'panel.help.steps.step4.link'),
          href: docsUrl(language, 'authors/materials/'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
    {
      parts: [
        { text: translate(language, 'panel.help.steps.step5.part1') },
        {
          text: translate(language, 'panel.help.steps.step5.link1'),
          href: docsUrl(language, 'authors/tasks/'),
        },
        { text: translate(language, 'panel.help.steps.comma') },
        {
          text: translate(language, 'panel.help.steps.step5.link2'),
          href: docsUrl(language, 'authors/tests/'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
    {
      parts: [
        { text: translate(language, 'panel.help.steps.step6.part1') },
        {
          text: translate(language, 'panel.help.steps.step6.link'),
          href: docsUrl(language, 'authors/methodist/#when'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
    {
      parts: [
        {
          text: translate(language, 'panel.help.steps.step7.part1'),
        },
        {
          text: translate(language, 'panel.help.steps.samePlace'),
          href: docsUrl(language, 'authors/methodist/#edit'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
    {
      parts: [{ text: translate(language, 'panel.help.steps.step8') }],
    },
    {
      parts: [
        { text: translate(language, 'panel.help.steps.step9.part1') },
        {
          text: translate(language, 'panel.help.steps.step9.link'),
          href: docsUrl(language, 'authors/costs-history/'),
        },
        { text: translate(language, 'panel.help.steps.dot') },
      ],
    },
  ]
}

export function HelpPage() {
  const language = useLanguage()
  const t = useT()
  const authorSteps = getAuthorSteps(language)

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="page-title">{t('panel.help.title')}</h1>
          <p className="page-subtitle">{t('panel.help.subtitle')}</p>
        </div>

        {/* Розділ 1 — Шлях автора за кроками */}
        <section className="space-y-4">
          <h2 className="font-display text-xl text-ink">
            {t('panel.help.section1.title')}
          </h2>
          <p className="text-ink">
            {t('panel.help.section1.intro')}
          </p>

          <ol className="list-decimal list-inside space-y-2 text-ink">
            {authorSteps.map((step, idx) => (
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
            <p>{t('panel.help.stepsInProgressNote')}</p>
            <p>
              {t('panel.help.helpersNote.part1')}
              <a
                href={docsUrl(language, 'authors/how-it-works/')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline underline-offset-2 hover:text-navy-light"
              >
                {t('panel.help.helpersNote.link1')}
              </a>
              {t('panel.help.helpersNote.part2')}
              <a
                href={docsUrl(language, 'authors/')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-navy underline underline-offset-2 hover:text-navy-light"
              >
                {t('panel.help.helpersNote.link2')}
              </a>
              {t('panel.help.steps.dot')}
            </p>
          </div>
        </section>

        {/* Розділ 2 — Як написати адміністраторові платформи */}
        <section className="space-y-4">
          <h2 className="font-display text-xl text-ink">
            {t('panel.help.section2.title')}
          </h2>

          <p className="text-ink">
            {t('panel.help.section2.intro')}
          </p>

          <p className="text-ink">
            {t('panel.help.section2.instruction')}
          </p>

          <ContactAdmin fallback="always" />

          <p className="text-ink font-medium pt-2">{t('panel.help.section2.checklistTitle')}</p>
          <ul className="list-disc list-inside space-y-1 text-ink">
            <li>{t('panel.help.section2.item1')}</li>
            <li>{t('panel.help.section2.item2')}</li>
            <li>{t('panel.help.section2.item3')}</li>
            <li>{t('panel.help.section2.item4')}</li>
            <li>{t('panel.help.section2.item5')}</li>
          </ul>

          <p className="text-ink pt-1">
            {translateRich(language, 'panel.help.section2.importantNotice', {
              b: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </section>
      </div>
    </div>
  )
}
