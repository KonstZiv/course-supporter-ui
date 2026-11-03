import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { PortalMaterialView, extOf } from './PortalMaterialView'
import type {
  PortalMaterialItem,
  PortalMediaResponse,
  PortalSourceType,
} from '../types'

function item(source_type: PortalSourceType): PortalMaterialItem {
  return {
    id: 'd1',
    kind: 'material',
    label: 'Матеріал',
    source_type,
    order: 0,
    task_type: null,
    base: null,
    overlay: null,
  }
}

function view(media: PortalMediaResponse, source_type: PortalSourceType) {
  return render(<PortalMaterialView media={media} item={item(source_type)} />)
}

const affordance = () => screen.getByText('Відкрити / Завантажити')

describe('PortalMaterialView render matrix', () => {
  it('slides (filled) → carousel image + nav', () => {
    const { container } = view(
      { kind: 'slides', url: null, slide_urls: ['a.webp', 'b.webp'] },
      'presentation',
    )
    expect(container.querySelector('img')).toHaveAttribute('src', 'a.webp')
    expect(screen.getByText('Далі')).toBeInTheDocument()
  })

  it('slides (empty, pre-T3) → placeholder, not an error', () => {
    view({ kind: 'slides', url: null, slide_urls: [] }, 'presentation')
    expect(screen.getByText('Слайди ще готуються.')).toBeInTheDocument()
  })

  it('external + youtube video → click-to-play, iframe only after the click + affordance', () => {
    const { container } = view(
      {
        kind: 'external',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        slide_urls: null,
      },
      'video',
    )
    // Before the click: no request to YouTube — only the own button and the link.
    expect(container.querySelector('iframe')).toBeNull()
    const play = screen.getByRole('button', { name: 'Відтворити відео: Матеріал' })
    expect(play).toHaveTextContent('Відтворити відео')
    expect(affordance()).toBeInTheDocument()

    fireEvent.click(play)
    const iframe = container.querySelector('iframe')
    expect(iframe?.getAttribute('src')).toMatch(
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?autoplay=1$/,
    )
    expect(affordance()).toBeInTheDocument()
  })

  it('external + youtube: switching to another video needs a new click (key reset)', () => {
    const youtube = (url: string): PortalMediaResponse => ({
      kind: 'external',
      url,
      slide_urls: null,
    })
    const { container, rerender } = view(
      youtube('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      'video',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Відтворити відео: Матеріал' }))
    expect(container.querySelector('iframe')).not.toBeNull()

    rerender(
      <PortalMaterialView
        media={youtube('https://youtu.be/9bZkp7q19f0')}
        item={item('video')}
      />,
    )
    expect(container.querySelector('iframe')).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Відтворити відео: Матеріал' }),
    ).toBeInTheDocument()
  })

  it('external + non-youtube → link-out, no iframe', () => {
    const { container } = view(
      { kind: 'external', url: 'https://example.com/page', slide_urls: null },
      'web',
    )
    expect(container.querySelector('iframe')).toBeNull()
    expect(affordance()).toBeInTheDocument()
  })

  it('file + video → <video> + affordance', () => {
    const { container } = view(
      { kind: 'file', url: 'https://s3/v.mp4', slide_urls: null },
      'video',
    )
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://s3/v.mp4')
    expect(affordance()).toBeInTheDocument()
  })

  it('file + audio → <audio> + affordance', () => {
    const { container } = view(
      { kind: 'file', url: 'https://s3/a.mp3', slide_urls: null },
      'audio',
    )
    expect(container.querySelector('audio')).toHaveAttribute('src', 'https://s3/a.mp3')
    expect(affordance()).toBeInTheDocument()
  })

  it('file + text → best-effort iframe + affordance', () => {
    const { container } = view(
      { kind: 'file', url: 'https://s3/doc.pdf', slide_urls: null },
      'text',
    )
    expect(container.querySelector('iframe')).toHaveAttribute('src', 'https://s3/doc.pdf')
    expect(affordance()).toBeInTheDocument()
  })

  it('file with a null url → unrenderable, never empty', () => {
    view({ kind: 'file', url: null, slide_urls: null }, 'text')
    expect(
      screen.getByText('Неможливо відобразити цей матеріал.'),
    ).toBeInTheDocument()
  })
})

describe('extOf — format signal from the signed key path', () => {
  it('reads the extension, lower-cased', () => {
    expect(extOf('https://cdn/x/lecture.md')).toBe('md')
    expect(extOf('https://cdn/x/DECK.MARKDOWN')).toBe('markdown')
    expect(extOf('https://cdn/x/notes.PDF')).toBe('pdf')
    expect(extOf('https://cdn/x/report.docx')).toBe('docx')
  })

  it('ignores the query string (signature rides after ?)', () => {
    expect(extOf('https://cdn/x/lecture.md?X-Amz-Expires=18000&sig=abc')).toBe(
      'md',
    )
  })

  it('a path without a dot returns the full name (no allowlist match)', () => {
    const result = extOf('https://cdn/x/lecture')
    expect(result).toBe('lecture')
    // Behavioral contract (ratify Р2): an unknown result matches no renderable
    // extension, so it routes to the no-preview branch.
    expect(['pdf', 'md', 'markdown', 'txt', 'html', 'htm']).not.toContain(result)
  })
})
