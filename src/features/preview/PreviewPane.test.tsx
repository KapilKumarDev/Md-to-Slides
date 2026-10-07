import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSession } from '@/core/deck'
import type { RenderResult, RenderedSlide } from '@/core/engine'
import { PreviewPane } from './PreviewPane'

const slide = (html: string, start: number, end: number): RenderedSlide => ({
  html,
  notes: [],
  lineRange: { start, end },
})

const rendered = (
  slides: RenderedSlide[],
  warnings: RenderResult['warnings'] = [],
): RenderResult => ({ css: '', slides, warnings })

const THREE = [
  slide('<p>First</p>', 0, 3),
  slide('<p>Second</p>', 4, 9),
  slide('<p>Third</p>', 10, 12),
]

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('PreviewPane', () => {
  it('shows the slide that contains the cursor, with its position', () => {
    useSession.getState().setRendered(rendered(THREE))
    render(<PreviewPane />)
    const main = screen.getByRole('group', { name: 'Slide 1 of 3' })
    expect(within(main).getByText('First')).toBeInTheDocument()

    act(() => useSession.getState().setCursorLine(5))
    expect(screen.getByRole('group', { name: 'Slide 2 of 3' })).toBeInTheDocument()
  })

  it('lists every slide in the rail and marks the active one', () => {
    useSession.getState().setRendered(rendered(THREE))
    useSession.getState().setCursorLine(5)
    render(<PreviewPane />)
    expect(screen.getAllByRole('button', { name: /Go to slide/ })).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('asks the editor to jump to the first line of a clicked slide', async () => {
    useSession.getState().setRendered(rendered(THREE))
    render(<PreviewPane />)
    await userEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }))
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 10 })
  })

  it('shows an alert but keeps the last good slide when rendering fails', () => {
    useSession.getState().setRendered(rendered(THREE))
    useSession.getState().setRenderError('bad directive')
    render(<PreviewPane />)
    expect(screen.getByRole('alert')).toHaveTextContent('bad directive')
    expect(screen.getByRole('group', { name: 'Slide 1 of 3' })).toBeInTheDocument()
  })

  it('lists directive warnings and jumps to the warned line', async () => {
    useSession
      .getState()
      .setRendered(rendered(THREE, [{ line: 6, message: '"TODOO" looks like a directive.' }]))
    render(<PreviewPane />)
    await userEvent.click(
      screen.getByRole('button', { name: /Line 7: "TODOO" looks like a directive/ }),
    )
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 6 })
  })

  it.each([
    ['nothing rendered yet', null],
    ['an empty deck with no slides', rendered([])],
  ])('shows an empty state for %s', (_name, value) => {
    if (value) useSession.getState().setRendered(value)
    render(<PreviewPane />)
    expect(screen.getByText(/Write Markdown on the left/)).toBeInTheDocument()
    expect(screen.queryByRole('group')).toBeNull()
  })
})
