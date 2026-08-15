import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UploadProgressView } from './UploadProgressView'
import type { UploadBatchState } from '../../hooks/useUploadBatch'

const MB = 1024 * 1024

function state(over: Partial<UploadBatchState>): UploadBatchState {
  return {
    active: true,
    index: 1,
    count: 1,
    bytes: null,
    awaitingServer: false,
    ...over,
  }
}

describe('UploadProgressView (Е4/Е5/Е7 two-floor display)', () => {
  it('renders nothing when idle', () => {
    const { container } = render(
      <UploadProgressView state={state({ active: false })} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('single file: byte bar with MB caption, no file counter', () => {
    render(
      <UploadProgressView
        state={state({ count: 1, bytes: { loaded: 45 * MB, total: 320 * MB } })}
      />,
    )
    expect(screen.getByText('45 МБ з 320 МБ')).toBeInTheDocument()
    expect(screen.queryByText(/Надсилаємо файл/)).not.toBeInTheDocument()
  })

  it('batch: file counter above the current byte bar', () => {
    render(
      <UploadProgressView
        state={state({
          index: 2,
          count: 5,
          bytes: { loaded: 10 * MB, total: 100 * MB },
        })}
      />,
    )
    expect(screen.getByText('Надсилаємо файл 2 з 5')).toBeInTheDocument()
    expect(screen.getByText('10 МБ з 100 МБ')).toBeInTheDocument()
  })

  it('bytes in motion → bar; at 100% before response → words, no bar (Е5)', () => {
    // Both assertions side by side — the крок-Д lesson about time windows: the
    // 100 % moment is too short to catch live, so it is locked here.
    const moving = render(
      <UploadProgressView
        state={state({ bytes: { loaded: 50 * MB, total: 100 * MB } })}
      />,
    )
    expect(moving.getByText('50 МБ з 100 МБ')).toBeInTheDocument()
    moving.unmount()

    render(
      <UploadProgressView
        state={state({
          bytes: { loaded: 100 * MB, total: 100 * MB },
          awaitingServer: true,
        })}
      />,
    )
    expect(screen.getByText('Сервер приймає файл…')).toBeInTheDocument()
    expect(screen.queryByText(/МБ з/)).not.toBeInTheDocument()
  })
})
