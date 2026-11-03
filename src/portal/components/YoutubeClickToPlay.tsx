import { useState } from 'react'
import { Play } from 'lucide-react'

// Click-to-play YouTube embed (privacy, З1). Until the student presses the
// button nothing is loaded from YouTube or Google: no iframe, no thumbnail,
// no preconnect — only an own button and a note on what the click does. The
// click mounts the iframe (youtube-nocookie.com, address built by youtube.ts)
// with autoplay, so one click is enough. The parent passes key={embedUrl}, so
// a different video starts unloaded again.

const FRAME = 'w-full h-full rounded-lg border border-canvas-dark/40'

function withAutoplay(embedUrl: string): string {
  const url = new URL(embedUrl)
  url.searchParams.set('autoplay', '1')
  return url.toString()
}

export function YoutubeClickToPlay({
  embedUrl,
  title,
}: {
  embedUrl: string
  title: string
}) {
  const [clicked, setClicked] = useState(false)

  return (
    <div className="aspect-video">
      {clicked ? (
        <iframe
          src={withAutoplay(embedUrl)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className={FRAME}
        />
      ) : (
        <div
          className={`${FRAME} flex flex-col items-center justify-center gap-3 p-4 text-center`}
        >
          <button
            type="button"
            className="btn-primary"
            aria-label={`Відтворити відео: ${title}`}
            onClick={() => setClicked(true)}
          >
            <Play size={16} />
            Відтворити відео
          </button>
          <p className="text-sm text-ink-muted max-w-md">
            Відео розміщено на YouTube. Після натискання ваш браузер звернеться до
            серверів YouTube (Google).
          </p>
        </div>
      )}
    </div>
  )
}
