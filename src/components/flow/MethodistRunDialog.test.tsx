import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AuthorEstimateResponse } from '../../types/api'

const api = vi.hoisted(() => ({ estimateNodeSummary: vi.fn() }))
vi.mock('../../api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/billing')>()),
  ...api,
}))

import { MethodistRunDialog } from './MethodistRunDialog'

const ENOUGH: AuthorEstimateResponse = {
  price_units: 15,
  available_units: 100,
  enough: true,
  missing_units: null,
  charging_enabled: true,
}

const SHORT: AuthorEstimateResponse = {
  price_units: 15,
  available_units: 5,
  enough: false,
  missing_units: 10,
  charging_enabled: true,
}

const NOTHING_TO_DO: AuthorEstimateResponse = {
  price_units: 0,
  available_units: 5,
  enough: true,
  missing_units: null,
  charging_enabled: true,
  unpriced_reason: 'nothing_to_do',
}

describe('MethodistRunDialog', () => {
  beforeEach(() => {
    api.estimateNodeSummary.mockReset()
  })

  it('показує ціну й дозволяє запуск, коли юнітів вистачає', async () => {
    api.estimateNodeSummary.mockResolvedValue(ENOUGH)
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <MethodistRunDialog
        open
        nodeId="node-1"
        nodeTitle="Розділ 1"
        force={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByText('Запустити Методиста?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Методист складе описи розділу «Розділ 1» і всіх його підрозділів, опис яких застарів або ще не складався.',
      ),
    ).toBeInTheDocument()

    const startBtn = screen.getByRole('button', { name: 'Запустити' })
    await waitFor(() => expect(startBtn).toBeEnabled())
    expect(screen.getByTestId('price-card')).toBeInTheDocument()
    expect(screen.getByText(/15 юнітів/)).toBeInTheDocument()

    fireEvent.click(startBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('вимикає кнопку «Запустити», коли юнітів не вистачає', async () => {
    api.estimateNodeSummary.mockResolvedValue(SHORT)
    render(
      <MethodistRunDialog
        open
        nodeId="node-1"
        nodeTitle="Розділ 1"
        force={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const startBtn = screen.getByRole('button', { name: 'Запустити' })
    await waitFor(() => {
      expect(screen.getByTestId('price-card')).toBeInTheDocument()
    })
    expect(startBtn).toBeDisabled()
    expect(screen.getByText(/Не вистачає 10 юнітів/)).toBeInTheDocument()
  })

  it('показує рядок nothingToDo і кнопка доступна, коли описи актуальні', async () => {
    api.estimateNodeSummary.mockResolvedValue(NOTHING_TO_DO)
    const onConfirm = vi.fn()

    render(
      <MethodistRunDialog
        open
        nodeId="node-1"
        nodeTitle="Розділ 1"
        force={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    const startBtn = screen.getByRole('button', { name: 'Запустити' })
    await waitFor(() => {
      expect(
        screen.getByText(
          'Описи всіх розділів тут актуальні: Методистові нічого складати, юніти не списуються.',
        ),
      ).toBeInTheDocument()
    })

    expect(screen.queryByTestId('price-card')).toBeNull()
    expect(startBtn).toBeEnabled()

    fireEvent.click(startBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('запуск доступний при невдалій оцінці вартості', async () => {
    api.estimateNodeSummary.mockRejectedValue(new Error('Network error'))
    const onConfirm = vi.fn()

    render(
      <MethodistRunDialog
        open
        nodeId="node-1"
        nodeTitle="Розділ 1"
        force={false}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    const startBtn = screen.getByRole('button', { name: 'Запустити' })
    await waitFor(() => {
      expect(
        screen.getByText('Орієнтовну вартість зараз порахувати не вдалося.'),
      ).toBeInTheDocument()
    })
    expect(startBtn).toBeEnabled()

    fireEvent.click(startBtn)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('«Скасувати» не викликає запуск', async () => {
    api.estimateNodeSummary.mockResolvedValue(ENOUGH)
    const onConfirm = vi.fn()
    const onCancel = vi.fn()

    render(
      <MethodistRunDialog
        open
        nodeId="node-1"
        nodeTitle="Розділ 1"
        force={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Запустити' })).toBeEnabled()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
