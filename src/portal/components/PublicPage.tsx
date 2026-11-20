import type { ReactNode } from 'react'
import { PublicLanguageBar } from './LanguageSwitcher'

/**
 * The frame of a page before sign-in (sign-in, password recovery, e-mail
 * confirmation): the language switcher on top, the page's card centred below.
 */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col">
      <PublicLanguageBar />
      <div className="flex-1 flex items-center justify-center px-6 py-10">{children}</div>
    </div>
  )
}
