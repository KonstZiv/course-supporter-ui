import { ContactAdmin } from '../ui/ContactAdmin'

/**
 * The author's failure: the sentence, and — when it asks to write — the
 * letter to the administrator after a click.
 */
export function FailureWithLetter({ text }: { text: string }) {
  return (
    <>
      <p role="alert" className="text-ink">
        {text}
      </p>
      <ContactAdmin message={text} fallback="after-click" />
    </>
  )
}
