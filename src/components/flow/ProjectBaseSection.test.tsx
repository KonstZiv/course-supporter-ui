import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ApiError } from '../../api/client'
import type { ProjectBaseStateResponse } from '../../types/api'

const { getBaseState, attachBase } = vi.hoisted(() => ({
  getBaseState: vi.fn(),
  attachBase: vi.fn(),
}))
vi.mock('../../api/documents', () => ({
  documentsApi: { getBaseState, attachBase },
}))
// Isolate the render logic — the poller (usePolling) is the tested primitive
// plus a thin tick; the live-Playwright pass exercises it end to end.
vi.mock('../../hooks/usePolling', () => ({ usePolling: () => {} }))

import { ProjectBaseSection } from './ProjectBaseSection'

const state = (
  s: ProjectBaseStateResponse['state'],
  extra: Partial<ProjectBaseStateResponse> = {},
): ProjectBaseStateResponse => ({
  version: 1,
  state: s,
  failure_reason: null,
  snapshot_hash: null,
  ...extra,
})

const noBase = () =>
  new ApiError(404, 'API error 404', {
    detail: { code: 'NO_BASE_ATTACHED', details: 'no base' },
  })

describe('ProjectBaseSection', () => {
  beforeEach(() => {
    getBaseState.mockReset()
    attachBase.mockReset()
  })

  it('no base (404) → renders the attach affordance, not a state', async () => {
    getBaseState.mockRejectedValue(noBase())
    render(<ProjectBaseSection documentId="doc-1" />)
    expect(await screen.findByText('Прикріпити base')).toBeInTheDocument()
    expect(screen.getByText(/не прикріплено/)).toBeInTheDocument()
  })

  it('ready → version + Готово badge + re-upload + staleness warning', async () => {
    getBaseState.mockResolvedValue(state('ready', { version: 3, snapshot_hash: 'h' }))
    render(<ProjectBaseSection documentId="doc-1" />)
    expect(await screen.findByText('Base v3')).toBeInTheDocument()
    expect(screen.getByText('Готово')).toBeInTheDocument()
    expect(screen.getByText('Повторно')).toBeInTheDocument()
    expect(screen.getByText(/залишаються прив/)).toBeInTheDocument()
  })

  it('failed → Помилка badge + failure_reason + re-upload', async () => {
    getBaseState.mockResolvedValue(
      state('failed', { failure_reason: 'declared size exceeded' }),
    )
    render(<ProjectBaseSection documentId="doc-1" />)
    expect(await screen.findByText('Помилка')).toBeInTheDocument()
    expect(screen.getByText('declared size exceeded')).toBeInTheDocument()
    expect(screen.getByText('Повторно')).toBeInTheDocument()
  })

  it('pending → Нормалізація badge, NO re-upload button', async () => {
    getBaseState.mockResolvedValue(state('pending'))
    render(<ProjectBaseSection documentId="doc-1" />)
    expect(await screen.findByText('Нормалізація…')).toBeInTheDocument()
    expect(screen.queryByText('Повторно')).not.toBeInTheDocument()
  })

  it('attach → calls attachBase and transitions to pending', async () => {
    getBaseState.mockRejectedValue(noBase())
    attachBase.mockResolvedValue({
      base_version_id: 'b1',
      version: 1,
      state: 'pending',
    })
    const { container } = render(<ProjectBaseSection documentId="doc-9" />)
    await screen.findByText('Прикріпити base')

    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement
    const file = new File(['zip'], 'p.zip', { type: 'application/zip' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() =>
      expect(attachBase).toHaveBeenCalledWith('doc-9', file),
    )
    expect(await screen.findByText('Нормалізація…')).toBeInTheDocument()
  })

  it('attach error → renders the curated code phrase', async () => {
    getBaseState.mockRejectedValue(noBase())
    attachBase.mockRejectedValue(
      new ApiError(422, 'API error 422', {
        detail: { code: 'NOT_AN_ARCHIVE', details: 'x' },
      }),
    )
    const { container } = render(<ProjectBaseSection documentId="doc-9" />)
    await screen.findByText('Прикріпити base')
    const input = container.querySelector(
      'input[type=file]',
    ) as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'a.txt')] },
    })
    expect(await screen.findByText(/Потрібен архів/)).toBeInTheDocument()
  })
})
