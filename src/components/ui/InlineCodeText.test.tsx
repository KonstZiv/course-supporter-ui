import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { InlineCodeText } from './InlineCodeText'

describe('InlineCodeText', () => {
  it('renders paired backtick spans as <code> with MarkdownContent styling', () => {
    const { container } = render(
      <p>
        <InlineCodeText text="a `b` c" />
      </p>,
    )
    const p = container.querySelector('p')!
    const code = p.querySelector('code')
    expect(code).not.toBeNull()
    expect(code).toHaveTextContent('b')
    expect(code).toHaveClass('bg-canvas-dark', 'px-1', 'rounded')
    expect(Array.from(p.childNodes).map((n) => n.textContent)).toEqual([
      'a ',
      'b',
      ' c',
    ])
  })

  it('leaves an unpaired backtick as literal text', () => {
    const { container } = render(
      <p>
        <InlineCodeText text="a `b c" />
      </p>,
    )
    expect(container.querySelector('code')).toBeNull()
    expect(container).toHaveTextContent('a `b c')
  })

  it('renders paired spans and leaves a trailing unpaired backtick as literal text', () => {
    const { container } = render(
      <p>
        <InlineCodeText text="Use `foo()` and `bar" />
      </p>,
    )
    const codes = container.querySelectorAll('code')
    expect(codes).toHaveLength(1)
    expect(codes[0]).toHaveTextContent('foo()')
    expect(container).toHaveTextContent('Use foo() and `bar')
  })
})
