// A text area that grows with its text where the browser can size fields to
// their content; elsewhere it keeps its minimum height and can be resized.
export const TEXTAREA =
  'input resize-y break-words [field-sizing:content]'

/** The ids a field is described by: its error first, then its hint. */
export function describedBy(
  ...ids: (string | false | null | undefined)[]
): string | undefined {
  const named = ids.filter((id): id is string => typeof id === 'string')
  return named.length > 0 ? named.join(' ') : undefined
}

/** The ids of a card's controls, from the page's stem and the card's key. */
export function cardIds(stem: string, key: string) {
  const at = `${stem}-${key}`
  return {
    heading: `${at}-heading`,
    text: `${at}-text`,
    up: `${at}-up`,
    down: `${at}-down`,
    remove: `${at}-remove`,
    addOption: `${at}-add-option`,
    openOwn: `${at}-open-own`,
    own: `${at}-own`,
  }
}
