import { flowChildren } from './section'
import type { Fits } from './types'

const TOLERANCE_PX = 1

/** Real-layout check: the slide's flow content must sit inside the section's padding. */
export const fitsInSlide: Fits = (section) => {
  const first = flowChildren(section)[0]
  const last = flowChildren(section).at(-1)
  if (!first || !last) return true

  // Without a layout engine (jsdom, or a detached node) there is nothing to measure.
  const box = section.getBoundingClientRect()
  if (box.width === 0) return true

  // Slides are SVG, so rects are scaled; `offsetWidth` is the unscaled layout width.
  const scale = box.width / section.offsetWidth
  const style = getComputedStyle(section)
  const top = box.top + (parseFloat(style.paddingTop) || 0) * scale
  const bottom = box.bottom - (parseFloat(style.paddingBottom) || 0) * scale
  const tolerance = TOLERANCE_PX * scale

  return (
    first.getBoundingClientRect().top >= top - tolerance &&
    last.getBoundingClientRect().bottom <= bottom + tolerance
  )
}