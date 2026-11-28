/**
 * Renders plain text while turning paired inline backtick spans (`code`) into
 * ``<code>`` elements styled like ``MarkdownContent``. Unpaired backticks stay
 * as literal text.
 */
export function InlineCodeText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g)
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('`') && part.endsWith('`') && part.length >= 3 ? (
          <code key={index} className="bg-canvas-dark px-1 rounded">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        ),
      )}
    </>
  )
}
