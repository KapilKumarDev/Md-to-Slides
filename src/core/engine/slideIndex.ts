import type { RenderedSlide } from './types'

export function slideIndexForLine(slides: RenderedSlide[], line: number): number {
  return Math.max(
    0,
    slides.findLastIndex((slide) => slide.lineRange.start <= line),
  )
}
