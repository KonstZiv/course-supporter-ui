import { SUPPORT_ADDRESS } from '../../utils/supportAddress'
import { SITE_TEXT_LINK_CLASS } from '../../components/site/siteLinks'

/**
 * A sentence of the portal with the support address in it: the address
 * becomes a mailto link, the rest stays as written. A sentence without the
 * address is shown as it is.
 */
export function SupportMailText({ text }: { text: string }) {
  const at = text.indexOf(SUPPORT_ADDRESS)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <a href={`mailto:${SUPPORT_ADDRESS}`} className={SITE_TEXT_LINK_CLASS}>
        {SUPPORT_ADDRESS}
      </a>
      {text.slice(at + SUPPORT_ADDRESS.length)}
    </>
  )
}

/** A failure's sentence in the portal, the support address as a mailto link. */
export function PortalFailure({ text }: { text: string }) {
  return (
    <p role="alert" className="text-ink">
      <SupportMailText text={text} />
    </p>
  )
}
