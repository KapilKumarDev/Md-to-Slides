import { describe, expect, it } from 'vitest'
import { render } from './render'
import { slideIndexForLine } from './slideIndex'
import type { Fits, RenderedSlide } from './types'

// jsdom has no layout, so a page "fits" when its flow text is short enough (whitespace between
// blocks excluded). Header and footer are positioned out of flow by the theme and never count.
const flow = (section: Element) =>
  [...section.children].filter((el) => !['HEADER', 'FOOTER'].includes(el.tagName))
const fitsChars =
  (limit: number): Fits =>
  (section) =>
    flow(section)
      .map((el) => el.textContent)
      .join('')
      .replace(/\s/g, '').length <= limit

const parse = (slide: RenderedSlide) => new DOMParser().parseFromString(slide.html, 'text/html')
const contentOf = (slide: RenderedSlide) => {
  const doc = parse(slide)
  return (doc.querySelector<HTMLElement>('section[data-marpit-advanced-background="content"]') ??
    doc.querySelector<HTMLElement>('section'))!
}
const textOf = (slide: RenderedSlide) =>
  flow(contentOf(slide))
    .map((el) => el.textContent)
    .join('')
const texts = (slides: RenderedSlide[], selector: string) =>
  slides.flatMap((slide) =>
    [...contentOf(slide).querySelectorAll(selector)].map((el) => el.textContent),
  )

const items = (count: number) =>
  Array.from({ length: count }, (_, i) => `- item ${String(i + 1).padStart(2, '0')}`).join('\n')
const itemNames = (count: number) =>
  Array.from({ length: count }, (_, i) => `item ${String(i + 1).padStart(2, '0')}`)

describe('pagination', () => {
  it('leaves slides that fit exactly as Marp rendered them', () => {
    const markdown = '# One\n\n- a\n\n---\n\n# Two\n\n- b'
    const plain = render(markdown)
    const paged = render(markdown, fitsChars(1000))
    expect(paged.slides).toEqual(plain.slides)
  })

  it('splits a long list across pages and keeps every item once, in order', () => {
    const fits = fitsChars(30)
    const { slides } = render(`# T\n\n${items(10)}`, fits)
    expect(slides.length).toBeGreaterThan(1)
    for (const slide of slides) expect(fits(contentOf(slide))).toBe(true)
    expect(texts(slides, 'li')).toEqual(itemNames(10))
  })

  it('continues ordered-list numbering on the next page', () => {
    const list = Array.from(
      { length: 10 },
      (_, i) => `${i + 1}. item ${String(i + 1).padStart(2, '0')}`,
    )
    const { slides } = render(list.join('\n'), fitsChars(30))
    const second = contentOf(slides[1]!).querySelector('ol')!
    const onFirst = contentOf(slides[0]!).querySelectorAll('li').length
    expect(second.getAttribute('start')).toBe(String(onFirst + 1))
  })

  it('repeats the table header on every page', () => {
    const rows = Array.from({ length: 10 }, (_, i) => `| row${i} | v${i} |`).join('\n')
    const { slides } = render(`| a | b |\n|---|---|\n${rows}`, fitsChars(40))
    expect(slides.length).toBeGreaterThan(1)
    for (const slide of slides) {
      expect(contentOf(slide).querySelector('thead th')?.textContent).toBe('a')
    }
    expect(texts(slides, 'tbody tr td:first-child')).toEqual(
      Array.from({ length: 10 }, (_, i) => `row${i}`),
    )
  })

  it('splits code on lines without breaking syntax highlighting', () => {
    const lines = Array.from(
      { length: 12 },
      (_, i) => `const v${String(i).padStart(2, '0')} = ${i}`,
    )
    const { slides } = render('```ts\n' + lines.join('\n') + '\n```', fitsChars(60))
    expect(slides.length).toBeGreaterThan(1)
    expect(texts(slides, 'pre code').join('')).toBe(lines.join('\n') + '\n')
    for (const slide of slides) {
      const code = contentOf(slide).querySelector('pre code')!
      expect(code.querySelector('.hljs-keyword')).not.toBeNull()
    }
  })

  it('splits a long paragraph at word boundaries and keeps the inline markup', () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${String(i).padStart(2, '0')}`)
    const markdown = `${words.slice(0, 30).join(' ')} **${words.slice(30, 40).join(' ')}** ${words.slice(40).join(' ')}`
    const { slides } = render(markdown, fitsChars(90))
    expect(slides.length).toBeGreaterThan(1)
    expect(texts(slides, 'p').join(' ').split(/\s+/).filter(Boolean)).toEqual(words)
    expect(texts(slides, 'strong').join(' ').split(/\s+/)).toEqual(words.slice(30, 40))
  })

  it('repeats the leading heading on continuation pages without duplicating its id', () => {
    const { slides } = render(`# Title\n\n${items(10)}`, fitsChars(40))
    expect(slides.length).toBeGreaterThan(1)
    for (const slide of slides) {
      expect(contentOf(slide).querySelector('h1')?.textContent).toBe('Title')
    }
    const ids = slides.flatMap((slide) =>
      [...contentOf(slide).querySelectorAll('h1[id]')].map((h) => h.id),
    )
    expect(ids).toEqual(['title'])
  })

  it('gives each page its own source-line range inside the original slide', () => {
    const markdown = `# T\n\n${items(10)}`
    const { slides } = render(markdown, fitsChars(30))
    expect(slides.map((slide) => slide.lineRange)).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 9 },
      { start: 10, end: 11 },
    ])
    expect(slideIndexForLine(slides, 0)).toBe(0)
    expect(slideIndexForLine(slides, 7)).toBe(1)
    expect(slideIndexForLine(slides, 11)).toBe(2)
  })

  it('keeps line ranges inside the slide even when the source has fewer lines than pages', () => {
    const words = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ')
    const { slides } = render(`${words}\n\n---\n\nnext`, fitsChars(30))
    const next = slides.at(-1)!
    expect(slides.length).toBeGreaterThan(3)
    for (const slide of slides.slice(0, -1)) {
      expect(slide.lineRange.start).toBeLessThanOrEqual(0 + 1)
      expect(slide.lineRange.end).toBeLessThan(next.lineRange.start)
    }
  })

  it('shows the speaker notes on every page of a split slide', () => {
    const { slides } = render(`${items(10)}\n\n<!-- remember the demo -->`, fitsChars(30))
    expect(slides.length).toBeGreaterThan(1)
    for (const slide of slides) expect(slide.notes).toEqual(['remember the demo'])
  })

  it('numbers pages in sequence across the deck', () => {
    const markdown = `<!-- paginate: true -->\n\n# A\n\n---\n\n${items(10)}\n\n---\n\n# Z`
    const { slides } = render(markdown, fitsChars(30))
    expect(slides.length).toBeGreaterThan(3)
    const numbers = slides.map((slide) => contentOf(slide).dataset.marpitPagination)
    expect(numbers).toEqual(slides.map((_, i) => String(i + 1)))
    for (const slide of slides) {
      expect(contentOf(slide).dataset.marpitPaginationTotal).toBe(String(slides.length))
    }
    const ids = slides.map((slide) => contentOf(slide).id)
    expect(new Set(ids).size).toBe(slides.length)
  })

  it('keeps header, footer and backgrounds on every page', () => {
    const markdown = `<!-- header: HEAD -->\n<!-- footer: FOOT -->\n\n![bg](x.png)\n\n${items(10)}`
    const { slides } = render(markdown, fitsChars(30))
    expect(slides.length).toBeGreaterThan(1)
    for (const slide of slides) {
      const section = contentOf(slide)
      expect(section.querySelector('header')?.textContent).toBe('HEAD')
      expect(section.querySelector('footer')?.textContent).toBe('FOOT')
      expect(parse(slide).querySelectorAll('foreignObject')).toHaveLength(3)
    }
  })

  it('keeps later slides after the pages of a split slide', () => {
    const { slides } = render(`# First\n\n---\n\n${items(10)}\n\n---\n\n# Last`, fitsChars(30))
    expect(slides.length).toBeGreaterThan(3)
    expect(textOf(slides[0]!)).toBe('First')
    expect(textOf(slides.at(-1)!)).toBe('Last')
  })

  it('warns about content that cannot be split instead of looping', () => {
    const { slides, warnings } = render(`# ${'very long heading '.repeat(5)}`, fitsChars(10))
    expect(slides).toHaveLength(1)
    expect(warnings).toEqual([
      { line: 0, message: expect.stringMatching(/taller than the slide.*can't be split/i) },
    ])
  })
})