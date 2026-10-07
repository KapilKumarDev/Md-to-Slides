import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/core/deck'
import type { RenderedSlide } from '@/core/engine'
import { PresentMode } from './PresentMode'

const slide = (html: string, start: number, end: number, notes: string[] = []): RenderedSlide => ({
  html,
  notes,
  lineRange: { start, end },
})

const THREE = [
  slide('<p>First</p>', 0, 3, ['Say hello']),
  slide('<p>Second</p>', 4, 9),
  slide('<p>Third</p>', 10, 12),
]

function start(cursorLine = 0, slides = THREE) {
  useSession.getState().setRendered({ css: '', warnings: [], slides })
  useSession.getState().setCursorLine(cursorLine)
  useSession.getState().setMode('present')
  return render(<PresentMode />)
}

const press = (key: string) => fireEvent.keyDown(window, { key })
const position = () => screen.getByText(/^\d+ \/ \d+$/)

beforeEach(() => useSession.setState(useSession.getInitialState(), true))
afterEach(() => vi.useRealTimers())

describe('PresentMode', () => {
  it('starts on the slide that contains the cursor', () => {
    start(5)
    press('p')
    expect(position()).toHaveTextContent('2 / 3')
  })

  it.each(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'])(
    '%j goes to the next slide',
    (key) => {
      start()
      press(key)
      press('p')
      expect(position()).toHaveTextContent('2 / 3')
    },
  )

  it.each(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'])(
    '%j goes to the previous slide',
    (key) => {
      start(5)
      press(key)
      press('p')
      expect(position()).toHaveTextContent('1 / 3')
    },
  )

  it('jumps with Home and End and never leaves the range', () => {
    start(5)
    press('End')
    press('ArrowRight')
    press('p')
    expect(position()).toHaveTextContent('3 / 3')
    press('Home')
    press('ArrowLeft')
    expect(position()).toHaveTextContent('1 / 3')
  })

  it('advances when the slide is clicked', () => {
    start()
    fireEvent.click(screen.getByText('First'))
    press('p')
    expect(position()).toHaveTextContent('2 / 3')
  })

  it('shows notes and the next slide in the presenter view, and toggles back', () => {
    start()
    expect(screen.queryByText('Say hello')).toBeNull()
    press('p')
    expect(screen.getByText('Say hello')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    press('P')
    expect(screen.queryByText('Say hello')).toBeNull()
  })

  it('says when a slide has no notes and when the deck ends', () => {
    start(5)
    press('p')
    expect(screen.getByText('No notes for this slide.')).toBeInTheDocument()
    press('End')
    expect(screen.getByText('End of deck')).toBeInTheDocument()
  })

  it('shows an elapsed timer in the presenter view', () => {
    vi.useFakeTimers()
    start()
    press('p')
    expect(screen.getByText('00:00')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(65_000)
    })
    expect(screen.getByText('01:05')).toBeInTheDocument()
  })

  it('exits on Escape, returning the editor to the current slide', () => {
    start()
    press('ArrowRight')
    fireEvent(
      screen.getByRole('dialog', { name: 'Presentation' }),
      new Event('cancel', { cancelable: true }),
    )
    expect(useSession.getState().mode).toBe('edit')
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 4 })
  })

  it('exits when the browser leaves fullscreen', () => {
    start()
    fireEvent(document, new Event('fullscreenchange'))
    expect(useSession.getState().mode).toBe('edit')
  })

  it('stays on the only slide of a one-slide deck', () => {
    start(0, [slide('<p>Only</p>', 0, 2)])
    press('ArrowRight')
    press('End')
    press('p')
    expect(position()).toHaveTextContent('1 / 1')
    expect(screen.getByText('End of deck')).toBeInTheDocument()
  })

  it('explains there is nothing to present when the deck has no slides', () => {
    start(0, [])
    expect(screen.getByText('There are no slides to present.')).toBeInTheDocument()
  })
})
