import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/core/deck'
import { exportPdf } from './exportPdf'

const withSlides = (text: string) => {
  useSession.getState().loadDeck({ id: 'a', title: 'a', text, updatedAt: 1 })
  useSession.getState().setRendered({
    css: '',
    warnings: [],
    slides: [{ html: '<p>A</p>', notes: [], lineRange: { start: 0, end: 0 } }],
  })
}

beforeEach(() => useSession.setState(useSession.getInitialState(), true))
afterEach(() => vi.restoreAllMocks())

describe('exportPdf', () => {
  it('prints with the deck title as the document title, then restores it', () => {
    withSlides('# My talk\n')
    let titleWhilePrinting = ''
    vi.spyOn(window, 'print').mockImplementation(() => {
      titleWhilePrinting = document.title
    })
    const original = document.title
    exportPdf()
    expect(titleWhilePrinting).toBe('My talk')
    expect(document.title).toBe(original)
  })

  it('tells the user to choose Save as PDF', () => {
    withSlides('# My talk\n')
    vi.spyOn(window, 'print').mockImplementation(() => undefined)
    exportPdf()
    expect(useSession.getState().notice).toEqual({
      kind: 'info',
      message: 'In the print dialog, choose Save as PDF as the destination.',
    })
  })

  it('does not print an empty deck', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    exportPdf()
    useSession.getState().setRendered({ css: '', warnings: [], slides: [] })
    exportPdf()
    expect(print).not.toHaveBeenCalled()
    expect(useSession.getState().notice).toEqual({
      kind: 'info',
      message: 'There are no slides to export yet.',
    })
  })

  it('shows an error when the browser cannot print', () => {
    withSlides('# My talk\n')
    const original = window.print
    window.print = undefined as unknown as typeof window.print
    try {
      exportPdf()
    } finally {
      window.print = original
    }
    expect(useSession.getState().notice?.kind).toBe('error')
    expect(useSession.getState().notice?.message).toMatch(/can't open the print dialog/)
  })
})
