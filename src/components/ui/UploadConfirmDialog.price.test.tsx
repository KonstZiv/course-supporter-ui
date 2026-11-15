import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AuthorEstimateResponse } from '../../types/api'
import type { UploadConfirmFile } from './UploadConfirmDialog'

// Places 1–3 of BIL-E (the upload dialog of the panel and of the canvas menu,
// and the link): the price of the processing before the send.
const api = vi.hoisted(() => ({ estimateProcessing: vi.fn() }))
vi.mock('../../api/billing', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/billing')>()),
  ...api,
}))

import { UploadConfirmDialog } from './UploadConfirmDialog'
import { RECHECK_MS } from '../../hooks/useActionPrice'

const OFF: AuthorEstimateResponse = {
  price_units: 0,
  available_units: null,
  enough: true,
  missing_units: null,
  charging_enabled: false,
}
const ENOUGH: AuthorEstimateResponse = {
  price_units: 120,
  available_units: 1500,
  enough: true,
  missing_units: null,
  charging_enabled: true,
}
const SHORT: AuthorEstimateResponse = {
  price_units: 120,
  available_units: 40,
  enough: false,
  missing_units: 80,
  charging_enabled: true,
}
const UNPRICED: AuthorEstimateResponse = { ...ENOUGH, price_units: 0 }

const PENDING = 'Рахуємо орієнтовну вартість…'
const FAILED = 'Орієнтовну вартість зараз порахувати не вдалося.'
const UNPRICED_LINE =
  'Орієнтовну вартість цього матеріалу до обробки порахувати не вдалося.'
const ROW_4 = 'Орієнтовна вартість: приблизно 120 юнітів. У вас доступно 1 500 юнітів.'
const ROW_5 = 'Ця дія коштує приблизно 120 юнітів, у вас 40 юнітів. Не вистачає 80 юнітів.'
const AFTER_PURCHASE = 'Після купівлі поверніться на цю вкладку й запустіть дію ще раз.'

function textFile(name = 'notes.md', text = 'Цикли for'): UploadConfirmFile {
  return { name, sourceType: 'text', file: new File([text], name) }
}

function renderDialog(
  files: UploadConfirmFile[],
  { linkUrl }: { linkUrl?: string } = {},
) {
  const onConfirm = vi.fn()
  render(
    <UploadConfirmDialog
      open
      files={files}
      linkUrl={linkUrl}
      nodeId="node-1"
      onConfirm={onConfirm}
      onCancel={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByText('Навчальний'))
  return { onConfirm, upload: screen.getByRole('button', { name: 'Завантажити' }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('upload dialog — the five rows for one file', () => {
  it('while the price is asked: "Рахуємо…" and the upload waits', async () => {
    api.estimateProcessing.mockReturnValue(new Promise(() => {}))
    const { upload } = renderDialog([textFile()])
    expect(await screen.findByText(PENDING)).toBeInTheDocument()
    expect(upload).toBeDisabled()
  })

  it('1: charging off → nothing, the upload runs as before', async () => {
    api.estimateProcessing.mockResolvedValue(OFF)
    const { onConfirm, upload } = renderDialog([textFile()])
    await waitFor(() => expect(upload).toBeEnabled())
    expect(screen.queryByText(/Орієнтовн/)).toBeNull()
    expect(screen.queryByTestId('price-card')).toBeNull()
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledWith('educational', null, false)
  })

  it('2: the request failed → the line, and the upload runs', async () => {
    api.estimateProcessing.mockRejectedValue(new TypeError('Failed to fetch'))
    const { onConfirm, upload } = renderDialog([textFile()])
    expect(await screen.findByText(FAILED)).toBeInTheDocument()
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('3: features unread (pdf) → asked with the kind alone; the line, no price', async () => {
    api.estimateProcessing.mockResolvedValue(UNPRICED)
    const pdf = { name: 'deck.pdf', sourceType: 'presentation', file: new File(['%PDF'], 'deck.pdf') }
    const { onConfirm, upload } = renderDialog([pdf])
    expect(await screen.findByText(UNPRICED_LINE)).toBeInTheDocument()
    expect(api.estimateProcessing).toHaveBeenCalledWith('node-1', { kind: 'presentation' })
    expect(screen.queryByText(/приблизно/)).toBeNull()
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('3: charging off without the features → still nothing', async () => {
    api.estimateProcessing.mockResolvedValue({ ...OFF })
    const pdf = { name: 'deck.pdf', sourceType: 'presentation', file: new File(['%PDF'], 'deck.pdf') }
    const { upload } = renderDialog([pdf])
    await waitFor(() => expect(upload).toBeEnabled())
    expect(screen.queryByText(UNPRICED_LINE)).toBeNull()
  })

  it('4: enough → the price card with the price and what is available', async () => {
    api.estimateProcessing.mockResolvedValue(ENOUGH)
    const { onConfirm, upload } = renderDialog([textFile('notes.md', 'Цикли for')])
    const card = await screen.findByTestId('price-card')
    expect(card).toHaveTextContent(ROW_4)
    expect(card).toHaveClass('rounded-2xl', 'bg-sun-pale', 'border-sun', 'p-6', 'text-ink')
    expect(api.estimateProcessing).toHaveBeenCalledWith('node-1', {
      kind: 'text',
      text_chars: 9,
    })
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('5: not enough → the panel, the purchase in a new tab, and nothing is sent', async () => {
    api.estimateProcessing.mockResolvedValue(SHORT)
    const { onConfirm, upload } = renderDialog([textFile()])
    const card = await screen.findByTestId('price-card')
    expect(card).toHaveTextContent(ROW_5)
    expect(card).toHaveTextContent(AFTER_PURCHASE)
    const buy = screen.getByRole('link', { name: 'Купити юніти' })
    expect(buy).toHaveAttribute('href', '/billing')
    expect(buy).toHaveAttribute('target', '_blank')
    expect(upload).toBeDisabled()
    fireEvent.click(upload)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('after the purchase: asked again with the same features, then the upload opens', async () => {
    vi.useFakeTimers()
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    api.estimateProcessing.mockResolvedValue(SHORT)
    const { onConfirm, upload } = renderDialog([textFile()])
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(screen.getByTestId('price-card')).toHaveTextContent(ROW_5)

    api.estimateProcessing.mockResolvedValue(ENOUGH)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECHECK_MS)
    })
    expect(screen.getByText('Юнітів тепер вистачає.')).toBeInTheDocument()
    expect(api.estimateProcessing).toHaveBeenLastCalledWith('node-1', {
      kind: 'text',
      text_chars: 9,
    })
    expect(upload).toBeEnabled()
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('a video: its duration goes with the request', async () => {
    api.estimateProcessing.mockResolvedValue(ENOUGH)
    renderDialog([
      { name: 'lecture.mp4', sourceType: 'video', durationSec: 1800, file: new File([''], 'lecture.mp4') },
    ])
    await screen.findByTestId('price-card')
    expect(api.estimateProcessing).toHaveBeenCalledWith('node-1', {
      kind: 'video',
      duration_sec: 1800,
    })
  })
})

describe('upload dialog — a batch', () => {
  it('code and archives are prepared for free first: no request, no line', async () => {
    api.estimateProcessing.mockResolvedValue(ENOUGH)
    const { upload } = renderDialog([
      { name: 'project.zip', sourceType: 'code', file: new File(['x'], 'project.zip') },
      { name: 'main.py', sourceType: 'code', file: new File(['print()'], 'main.py') },
    ])
    await waitFor(() => expect(upload).toBeEnabled())
    expect(api.estimateProcessing).not.toHaveBeenCalled()
    expect(screen.queryByText(/Орієнтовн/)).toBeNull()
  })

  it('an html file sent as code drops out of the price', async () => {
    api.estimateProcessing.mockResolvedValue(ENOUGH)
    renderDialog([textFile('page.html', '<p>Текст</p>')])
    await screen.findByTestId('price-card')
    fireEvent.click(screen.getByRole('checkbox'))
    await waitFor(() => expect(screen.queryByTestId('price-card')).toBeNull())
  })

  it('one request per paid file; the sum, and the files it leaves out', async () => {
    api.estimateProcessing.mockImplementation((_node, body: { kind: string }) =>
      Promise.resolve(body.kind === 'text' ? ENOUGH : UNPRICED),
    )
    renderDialog([
      textFile('a.md', 'один'),
      textFile('b.md', 'два'),
      { name: 'deck.pdf', sourceType: 'presentation', file: new File(['%PDF'], 'deck.pdf') },
      { name: 'main.py', sourceType: 'code', file: new File(['x'], 'main.py') },
    ])
    const card = await screen.findByTestId('price-card')
    expect(api.estimateProcessing).toHaveBeenCalledTimes(3)
    expect(card).toHaveTextContent(
      'Орієнтовна вартість: приблизно 240 юнітів. У вас доступно 1 500 юнітів.',
    )
    expect(card).toHaveTextContent('Для 1 з 3 файлів порахувати до обробки не вдалося.')
  })

  it('each file fits, together they may not: the warning, and the upload runs', async () => {
    api.estimateProcessing.mockResolvedValue({ ...ENOUGH, price_units: 100, available_units: 150 })
    const { onConfirm, upload } = renderDialog([textFile('a.md'), textFile('b.md')])
    const card = await screen.findByTestId('price-card')
    expect(card).toHaveTextContent(
      'На всі файли разом юнітів може не вистачити: обробка тих, на які не вистачить, зупиниться, і її можна буде запустити ще раз після купівлі.',
    )
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('one file short: the whole batch waits', async () => {
    api.estimateProcessing
      .mockResolvedValueOnce(ENOUGH)
      .mockResolvedValueOnce(SHORT)
    const { onConfirm, upload } = renderDialog([textFile('a.md'), textFile('b.md')])
    const card = await screen.findByTestId('price-card')
    expect(card).toHaveTextContent('Ця дія коштує приблизно 240 юнітів')
    expect(upload).toBeDisabled()
    fireEvent.click(upload)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('upload dialog — a link (place 3)', () => {
  it('asked with the kind alone: charging on → the unpriced line, and it runs', async () => {
    api.estimateProcessing.mockResolvedValue(UNPRICED)
    const { onConfirm, upload } = renderDialog([], { linkUrl: 'https://youtu.be/abc' })
    expect(await screen.findByText(UNPRICED_LINE)).toBeInTheDocument()
    expect(api.estimateProcessing).toHaveBeenCalledWith('node-1', { kind: 'video' })
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('a web page: kind web; charging off → nothing', async () => {
    api.estimateProcessing.mockResolvedValue(OFF)
    const { upload } = renderDialog([], { linkUrl: 'https://example.org/article' })
    await waitFor(() => expect(upload).toBeEnabled())
    expect(api.estimateProcessing).toHaveBeenCalledWith('node-1', { kind: 'web' })
    expect(screen.queryByText(/Орієнтовн/)).toBeNull()
  })

  it('the request failed → the line, and it runs', async () => {
    api.estimateProcessing.mockRejectedValue(new Error('503'))
    const { onConfirm, upload } = renderDialog([], { linkUrl: 'https://example.org/a' })
    expect(await screen.findByText(FAILED)).toBeInTheDocument()
    fireEvent.click(upload)
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('upload dialog — without a node', () => {
  it('asks no price (the dialog alone, as before)', () => {
    const onConfirm = vi.fn()
    render(
      <UploadConfirmDialog open files={[textFile()]} onConfirm={onConfirm} onCancel={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('Навчальний'))
    fireEvent.click(screen.getByRole('button', { name: 'Завантажити' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(api.estimateProcessing).not.toHaveBeenCalled()
  })
})
