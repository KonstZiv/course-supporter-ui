import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { NodeProps } from '@xyflow/react'
import { CourseRootNode } from './CourseRootNode'
import type { FlowNodeData } from '../../../utils/treeToFlow'

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
      isRoot: true,
      depth: 0,
      ...data,
    },
  } as unknown as NodeProps & { data: FlowNodeData }
  return render(<CourseRootNode {...props} />)
}

describe('CourseRootNode', () => {
  it('names a test on the course card by its title', () => {
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
  })
})
