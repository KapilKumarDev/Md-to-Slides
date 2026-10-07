import { beforeEach, describe, expect, it } from 'vitest'
import type { RenderResult } from '@/core/engine'
import { selectActiveSlide, selectHasSlides, useSession } from './session'

const slides = (...starts: number[]): RenderResult => ({
  css: '',
  warnings: [],
  slides: starts.map((start, i) => ({
    html: '',
    notes: [],
    lineRange: { start, end: (starts[i + 1] ?? 100) - 1 },
  })),
})

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('session store', () => {
  it('loads a deck and resets editor state', () => {
    useSession.getState().setCursorLine(9)
    useSession.getState().setMode('present')
    useSession.getState().loadDeck({ id: 'a', title: 'A', text: '# A', updatedAt: 1 })
    const state = useSession.getState()
    expect([state.deckId, state.text, state.cursorLine, state.mode]).toEqual([
      'a',
      '# A',
      0,
      'edit',
    ])
  })

  it('clears a render error when a render succeeds', () => {
    useSession.getState().setRenderError('boom')
    useSession.getState().setRendered(slides(0))
    expect(useSession.getState().renderError).toBeNull()
  })

  it('selects the slide that contains the cursor line', () => {
    useSession.getState().setRendered(slides(0, 4, 10))
    useSession.getState().setCursorLine(5)
    expect(selectActiveSlide(useSession.getState())).toBe(1)
  })

  it('selects slide 0 before anything is rendered', () => {
    expect(selectActiveSlide(useSession.getState())).toBe(0)
  })

  it('reports whether there is anything to show', () => {
    expect(selectHasSlides(useSession.getState())).toBe(false)
    useSession.getState().setRendered(slides())
    expect(selectHasSlides(useSession.getState())).toBe(false)
    useSession.getState().setRendered(slides(0))
    expect(selectHasSlides(useSession.getState())).toBe(true)
  })

  it('stores and clears editor requests', () => {
    useSession.getState().requestJump(3)
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 3 })
    useSession.getState().requestReplace('# New')
    expect(useSession.getState().editorRequest).toEqual({ type: 'replace', text: '# New' })
    useSession.getState().clearEditorRequest()
    expect(useSession.getState().editorRequest).toBeNull()
  })
})
