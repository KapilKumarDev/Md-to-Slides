import { render } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { useSession } from '@/core/deck'
import { PrintRoot } from './PrintRoot'

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

it('renders nothing before the first render finishes', () => {
  const { container } = render(<PrintRoot />)
  expect(container).toBeEmptyDOMElement()
})

it('renders one print page per slide', () => {
  useSession.getState().setRendered({
    css: '',
    warnings: [],
    slides: ['<p>A</p>', '<p>B</p>', '<p>C</p>'].map((html, i) => ({
      html,
      notes: [],
      lineRange: { start: i, end: i },
    })),
  })
  const { container } = render(<PrintRoot />)
  expect(container.querySelector('#print-root')).not.toBeNull()
  expect(container.querySelectorAll('#print-root .marpit.print-page')).toHaveLength(3)
})
