import { contentSection, flowChildren, lineOf } from './section'
import { fillsPage, splitAfter, unitCount } from './split'
import type { Fits, RenderedSlide, RenderResult } from './types'

const HOST_CLASS = 'paginate-host'
const HOST_CSS = `.${HOST_CLASS}{position:fixed;top:0;left:-200vw;width:100vw;visibility:hidden;pointer-events:none}`

/** One page of a source slide. `line` is the source line, relative to the slide, where it starts. */
interface Page {
  html: string
  line: number
  clipped: boolean
}

interface Unit {
  el: Element
  line: number
}

const isHeading = (el: Element) => /^H[1-6]$/.test(el.tagName)

/**
 * Splits a slide's overflowing content over as many pages as it needs. The slide is rebuilt
 * inside its own section so header, footer, backgrounds and page numbers stay with every page.
 */
function splitSlide(svg: Element, section: HTMLElement, fits: Fits): Page[] {
  const footer = section.querySelector(':scope > footer')
  const mount = <T extends Element>(el: T): T => {
    section.insertBefore(el, footer)
    return el
  }

  const blocks = flowChildren(section)
  const heading = blocks[0] && isHeading(blocks[0]) ? blocks[0] : null
  const queue: Unit[] = blocks.map((el) => ({ el, line: lineOf(el) }))
  for (const el of blocks) el.remove()

  const pages: Page[] = []
  let placed: Unit[] = [] // units on the page being built, not counting the repeated heading
  let pageLine = 0
  let clipped = false

  const finishPage = () => {
    pages.push({ html: svg.outerHTML, line: pageLine, clipped })
    for (const el of flowChildren(section)) el.remove()
    placed = []
    clipped = false
  }

  // Ends the page before `unit`. Headings at the bottom move along, so none is left stranded.
  const breakBefore = (unit: Unit) => {
    const moved = [unit]
    while (placed.length > 1 && isHeading(placed[placed.length - 1]!.el))
      moved.unshift(placed.pop()!)
    for (const { el } of moved) el.remove()
    queue.unshift(...moved)
    finishPage()
  }

  // Largest number of units that still fit on the page, found by bisection.
  const largestFit = (el: Element) => {
    let low = 0
    let high = unitCount(el) - 1
    while (low < high) {
      const keep = Math.ceil((low + high) / 2)
      const { head } = splitAfter(el, keep)
      mount(head)
      const ok = fits(section)
      head.remove()
      if (ok) low = keep
      else high = keep - 1
    }
    return low
  }

  for (let unit = queue.shift(); unit; unit = queue.shift()) {
    if (placed.length === 0) {
      pageLine = unit.line
      if (heading && pages.length > 0) {
        const again = mount(heading.cloneNode(true) as Element)
        again.removeAttribute('id') // ids must stay unique in the document
      }
    }

    mount(unit.el)
    if (fits(section)) {
      placed.push(unit)
      continue
    }
    unit.el.remove()

    const hasBody = placed.some(({ el }) => !isHeading(el))
    if (hasBody && !fillsPage(unit.el)) {
      breakBefore(unit)
      continue
    }

    const keep = largestFit(unit.el)
    if (keep > 0) {
      const { head, tail, tailLine } = splitAfter(unit.el, keep)
      placed.push({ el: mount(head), line: unit.line })
      queue.unshift({ el: tail, line: tailLine })
      finishPage()
    } else if (hasBody) {
      breakBefore(unit)
    } else {
      // Atomic and taller than a slide, such as a big image: nothing left to cut.
      placed.push({ el: mount(unit.el), line: unit.line })
      clipped = true
    }
  }
  finishPage()
  return pages
}

function measurePages(html: string, host: Element, fits: Fits): Page[] {
  host.querySelector('svg')?.remove()
  host.insertAdjacentHTML('beforeend', html)
  const svg = host.lastElementChild
  const section = svg && contentSection(svg)
  if (!svg || !section || fits(section)) return [{ html, line: 0, clipped: false }]
  return splitSlide(svg, section, fits)
}

function shift(el: Element, attribute: string, by: number) {
  const value = el.getAttribute(attribute)
  if (value !== null && Number.isFinite(Number(value)))
    el.setAttribute(attribute, String(Number(value) + by))
}

/** Page numbers and ids count pages, so every page after a split moves along with them. */
function renumber(html: string, from: number, to: number, extraPages: number): string {
  const template = document.createElement('template')
  template.innerHTML = html
  const svg = template.content.firstElementChild
  if (!svg) return html
  for (const section of svg.querySelectorAll('section')) {
    shift(section, 'data-marpit-pagination', to - from)
    shift(section, 'data-marpit-pagination-total', extraPages)
  }
  const content = contentSection(svg)
  if (content?.id === String(from + 1)) content.id = String(to + 1)
  return svg.outerHTML
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

// Pages already worked out for a slide, so typing in one slide does not re-measure the others.
// Keyed by the slide's html and the theme css, per `fits`. ponytail: cleared whenever the theme
// changes; a web font that finishes loading later is not noticed until the slide's html changes.
const caches = new WeakMap<Fits, { css: string; pages: Map<string, Page[]> }>()
const MAX_CACHED = 500

function cacheFor(fits: Fits, css: string) {
  let cache = caches.get(fits)
  if (!cache || cache.css !== css || cache.pages.size > MAX_CACHED) {
    cache = { css, pages: new Map() }
    caches.set(fits, cache)
  }
  return cache.pages
}

/** Splits every slide that does not fit into pages that do. Slides that fit are returned untouched. */
export function paginate(result: RenderResult, fits: Fits): RenderResult {
  const cache = cacheFor(fits, result.css)
  let host: HTMLElement | null = null
  const measure = (html: string): Page[] => {
    if (!host) {
      host = document.createElement('div')
      host.className = `marpit ${HOST_CLASS}`
      host.appendChild(document.createElement('style')).textContent = `${result.css}\n${HOST_CSS}`
      document.body.append(host)
    }
    return measurePages(html, host, fits)
  }

  let pagesBySlide: Page[][]
  try {
    pagesBySlide = result.slides.map(({ html }) => {
      const cached = cache.get(html) ?? measure(html)
      cache.set(html, cached)
      return cached
    })
  } finally {
    ;(host as HTMLElement | null)?.remove()
  }

  const total = pagesBySlide.reduce((count, pages) => count + pages.length, 0)
  const extraPages = total - result.slides.length
  const warnings = [...result.warnings]
  const slides: RenderedSlide[] = []

  result.slides.forEach((slide, source) => {
    const pages = pagesBySlide[source] ?? []
    const { start, end } = slide.lineRange
    // Each page starts on its own source line, so the cursor and the thumbnails can find it.
    const starts: number[] = []
    for (const [index, page] of pages.entries()) {
      const previous = starts[index - 1]
      starts.push(previous === undefined ? start : clamp(start + page.line, previous + 1, end))
    }

    for (const [index, page] of pages.entries()) {
      const pageStart = starts[index] ?? start
      const nextStart = starts[index + 1]
      if (page.clipped && !warnings.some((warning) => warning.line === pageStart)) {
        warnings.push({
          line: pageStart,
          message:
            "This content is taller than the slide and can't be split, so it is clipped. Shrink it or move it to its own slide.",
        })
      }
      slides.push({
        html: extraPages > 0 ? renumber(page.html, source, slides.length, extraPages) : page.html,
        notes: slide.notes,
        lineRange: {
          start: pageStart,
          end: nextStart === undefined ? end : Math.max(pageStart, nextStart - 1),
        },
      })
    }
  })

  return { ...result, slides, warnings }
}