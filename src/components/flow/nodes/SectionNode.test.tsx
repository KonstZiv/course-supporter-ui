import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { NodeProps } from '@xyflow/react'
import { SectionNode } from './SectionNode'
import type { FlowNodeData } from '../../../utils/treeToFlow'
import type { AuthoredDocumentSummary, TestState } from '../../../types/api'

// The connection points need a flow around them; the material pills do not.
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  Handle: () => null,
}))

function card(data: Partial<FlowNodeData>) {
  const props = {
    id: 'n1',
    selected: false,
    data: {
      nodeId: 'n1',
      title: 'Розділ',
      description: null,
      authored_documents: [],
      childrenCount: 0,
      fingerprint: null,
      summary_status: 'none',
      materials_changed: false,
      isRoot: false,
      depth: 1,
      ...data,
    },
  } as unknown as NodeProps & { data: FlowNodeData }
  return render(<SectionNode {...props} />)
}

describe('SectionNode', () => {
  it('names a test on the section card by its title', () => {
    card({
      authored_documents: [
        {
          id: 'test-1',
          course_node_id: 'n1',
          source_type: 'test_object',
          material_role: 'educational',
          task_type: 'test',
          order: 0,
          filename: null,
          title: 'Змінні',
          source_url: 'test-object:',
          language: 'ukr',
          state: 'ready',
          processing_phase: 'ready',
          content_fingerprint: null,
          error_message: null,
          error_category: null,
          created_at: '',
        },
      ],
    })
    expect(screen.getByText('Змінні')).toBeInTheDocument()
    expect(screen.queryByText(/test-object/)).toBeNull()
    // Never processed: no «Готово»; a tree without test_state keeps it neutral.
    expect(screen.getByText('Змінні')).toHaveAttribute('title', 'Змінні — тест')
  })
})

// Task Б2: the tree says whether a test is published — the pill takes the test
// editor's word and tone for it; a tree that does not say keeps it neutral.
describe('SectionNode — a test\'s publication state', () => {
  function test(state?: TestState | null): AuthoredDocumentSummary {
    const doc: AuthoredDocumentSummary = {
      id: 'test-1',
      course_node_id: 'n1',
      source_type: 'test_object',
      material_role: 'educational',
      task_type: 'test',
      order: 0,
      filename: null,
      title: 'Змінні',
      source_url: 'test-object:',
      language: 'ukr',
      state: 'ready',
      processing_phase: 'ready',
      content_fingerprint: null,
      error_message: null,
      error_category: null,
      created_at: '',
    }
    // ``undefined`` stands for an older backend: the field is not there at all.
    return state === undefined ? doc : { ...doc, test_state: state }
  }

  it.each([
    ['draft', 'Змінні — не опубліковано', ['bg-canvas-dark', 'text-ink-muted']],
    ['published', 'Змінні — опубліковано', ['text-forest']],
    ['changed', 'Змінні — є неопубліковані зміни', ['text-navy']],
    [null, 'Змінні — тест', ['bg-canvas-dark', 'text-ink-muted']],
  ] as const)('marks a %s test: %s', (state, hint, classes) => {
    card({ authored_documents: [test(state)] })
    const pill = screen.getByText('Змінні')
    expect(pill).toHaveAttribute('title', hint)
    expect(pill).toHaveClass(...classes)
  })

  it('lower-cases the state word after the dash, a test\'s and a material\'s', () => {
    const lecture: AuthoredDocumentSummary = {
      ...test(),
      id: 'doc-1',
      source_type: 'text',
      task_type: null,
      title: null,
      filename: 'lecture.md',
      source_url: 's3://bucket/lecture.md',
    }
    card({ authored_documents: [test('changed'), lecture] })
    expect(screen.getByText('Змінні')).toHaveAttribute(
      'title',
      'Змінні — є неопубліковані зміни',
    )
    // A material's phase word is lower-cased after the dash too.
    expect(screen.getByText('lecture.md')).toHaveAttribute('title', 'lecture.md — готово')
  })

  it('keeps the neutral pill when an older backend sends no test_state', () => {
    const doc = test()
    expect('test_state' in doc).toBe(false)
    card({ authored_documents: [doc] })
    const pill = screen.getByText('Змінні')
    expect(pill).toHaveAttribute('title', 'Змінні — тест')
    expect(pill).toHaveClass('bg-canvas-dark', 'text-ink-muted')
  })
})
