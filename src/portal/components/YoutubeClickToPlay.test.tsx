import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { YoutubeClickToPlay } from './YoutubeClickToPlay'

const EMBED = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
const NOTE =
  'Відео розміщено на YouTube. Після натискання ваш браузер звернеться до серверів YouTube (Google).'

const playButton = () =>
  screen.getByRole('button', { name: 'Відтворити відео: Лекція 1' })

function expectNothingLoads(container: HTMLElement) {
  expect(container.querySelector('iframe, img, video, link, source, [src]')).toBeNull()
  // No address of YouTube or Google anywhere in the markup (the SVG icon's
  // xmlns is a namespace, not a request, so a bare https? test would misfire).
  expect(container.innerHTML).not.toMatch(/url\(|youtube\.com|youtube-nocookie|ytimg|googlevideo/)
}

describe('YoutubeClickToPlay (privacy, З1)', () => {
  it('before the click: own button and note, nothing that loads', () => {
    const { container } = render(<YoutubeClickToPlay embedUrl={EMBED} title="Лекція 1" />)
    expectNothingLoads(container)
    expect(playButton()).toHaveAttribute('type', 'button')
    expect(playButton()).toHaveTextContent('Відтворити відео')
    expect(screen.getByText(NOTE)).toBeInTheDocument()
  })

  it('after the click: the nocookie iframe with autoplay', () => {
    const { container } = render(<YoutubeClickToPlay embedUrl={EMBED} title="Лекція 1" />)
    fireEvent.click(playButton())
    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    const src = iframe?.getAttribute('src') ?? ''
    expect(src.startsWith(EMBED)).toBe(true)
    expect(new URL(src).searchParams.get('autoplay')).toBe('1')
    expect(iframe).toHaveAttribute('title', 'Лекція 1')
    expect(iframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    expect(iframe).toHaveAttribute(
      'allow',
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
    )
    expect(iframe).toHaveAttribute('allowfullscreen')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps the start time alongside autoplay', () => {
    const { container } = render(
      <YoutubeClickToPlay embedUrl={`${EMBED}?start=90`} title="Лекція 1" />,
    )
    fireEvent.click(playButton())
    const src = new URL(container.querySelector('iframe')?.getAttribute('src') ?? '')
    expect(src.searchParams.get('start')).toBe('90')
    expect(src.searchParams.get('autoplay')).toBe('1')
  })

  it('a new embedUrl as key starts unloaded again', () => {
    const other = 'https://www.youtube-nocookie.com/embed/9bZkp7q19f0'
    const { container, rerender } = render(
      <YoutubeClickToPlay key={EMBED} embedUrl={EMBED} title="Лекція 1" />,
    )
    fireEvent.click(playButton())
    expect(container.querySelector('iframe')).not.toBeNull()

    rerender(<YoutubeClickToPlay key={other} embedUrl={other} title="Лекція 1" />)
    expectNothingLoads(container)
    expect(playButton()).toBeInTheDocument()
  })
})
