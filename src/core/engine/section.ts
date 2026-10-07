/** Attribute that carries each block's source line, relative to the start of its slide. */
export const LINE_ATTR = 'data-source-line'

// The theme positions these out of flow, so they never take up room on the slide.
const OUT_OF_FLOW = new Set(['HEADER', 'FOOTER'])

/** Marp draws backgrounds in sibling sections; the one with the slide's content is marked. */
export function contentSection(svg: Element): HTMLElement | null {
  return (
    svg.querySelector<HTMLElement>('section[data-marpit-advanced-background="content"]') ??
    svg.querySelector<HTMLElement>('section')
  )
}

export function flowChildren(section: Element): Element[] {
  return [...section.children].filter((el) => !OUT_OF_FLOW.has(el.tagName))
}

export function lineOf(el: Element): number {
  return Number(
    el.getAttribute(LINE_ATTR) ?? el.querySelector(`[${LINE_ATTR}]`)?.getAttribute(LINE_ATTR) ?? 0,
  )
}