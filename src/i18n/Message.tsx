import { Fragment, type ReactNode } from 'react'
import { useLanguage } from './LanguageContext'
import { translateRich, type MessageKey, type RichValues } from './translate'

/**
 * A message with markup in it: each tag of the message (`<b>…</b>`) becomes
 * what its function in `values` makes of the words inside, so a link or an
 * emphasis stays where the language puts it.
 */
export function Message({
  id,
  values,
}: {
  id: MessageKey
  values: RichValues<ReactNode>
}) {
  const language = useLanguage()
  const parts = translateRich<ReactNode>(language, id, values)
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  )
}
