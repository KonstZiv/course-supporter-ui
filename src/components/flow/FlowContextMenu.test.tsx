import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FlowContextMenu } from './FlowContextMenu'

describe('FlowContextMenu — generate trigger', () => {
  it('lifts onGenerate with node id + title and closes the menu', () => {
    const onGenerate = vi.fn()
    const onClose = vi.fn()
    render(
      <MemoryRouter>
        <FlowContextMenu
          position={{
            x: 10,
            y: 10,
            nodeId: 'node-7',
            nodeTitle: 'Розділ 3',
            isRoot: false,
          }}
          onClose={onClose}
          onGenerate={onGenerate}
        />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Згенерувати опис'))

    expect(onGenerate).toHaveBeenCalledWith('node-7', 'Розділ 3')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
