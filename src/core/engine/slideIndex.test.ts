import { describe, expect, it } from 'vitest'
import { slideIndexForLine } from './slideIndex'
import type { RenderedSlide } from './types'

const slide = (start: number, end: number): RenderedSlide => ({
  html: '',
  notes: [],
  lineRange: { start, end },
})

describe('slideIndexForLine', () => {
  const slides = [slide(0, 3), slide(4, 9), slide(10, 12)]

  it.each([
    [0, 0],
    [3, 0],
    [4, 1],
    [9, 1],
    [12, 2],
    [99, 2],
  ])('maps line %i to slide %i', (line, expected) => {
    expect(slideIndexForLine(slides, line)).toBe(expected)
  })

  it('returns 0 when there are no slides', () => {
    expect(slideIndexForLine([], 5)).toBe(0)
  })
})
