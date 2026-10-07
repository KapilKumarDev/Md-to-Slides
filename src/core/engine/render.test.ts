import { describe, expect, it } from 'vitest'
import { render } from './render'

describe('render', () => {
  it('splits slides on horizontal rules', () => {
    const { slides } = render('# A\n\n---\n\n# B')
    expect(slides).toHaveLength(2)
    expect(slides[0]?.html).toContain('A')
    expect(slides[1]?.html).toContain('B')
  })

  it('returns the theme css', () => {
    expect(render('# A').css.length).toBeGreaterThan(0)
  })

  it('collects html comments as speaker notes', () => {
    const { slides } = render('# A\n\n<!-- remember the demo -->\n')
    expect(slides[0]?.notes).toEqual([expect.stringContaining('remember the demo')])
  })

  it('does not treat known directives as notes', () => {
    const { slides } = render('<!-- backgroundColor: black -->\n\n# A\n')
    expect(slides[0]?.notes).toEqual([])
  })

  it('reports 0-based inclusive line ranges per slide', () => {
    const { slides } = render('# A\n\n---\n\n# B\n')
    expect(slides.map((slide) => slide.lineRange)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 5 },
    ])
  })

  it('does not create a slide for front matter', () => {
    const { slides } = render('---\ntheme: default\n---\n\n# A\n')
    expect(slides).toHaveLength(1)
    expect(slides[0]?.lineRange.start).toBe(0)
  })

  it('gives the same slides and line ranges for CRLF line endings', () => {
    const lf = render('# A\n\n---\n\n# B\n')
    const crlf = render('# A\r\n\r\n---\r\n\r\n# B\r\n')
    expect(crlf.slides).toHaveLength(2)
    expect(crlf.slides.map((slide) => slide.lineRange)).toEqual(
      lf.slides.map((slide) => slide.lineRange),
    )
  })

  it('never emits script tags or javascript: links', () => {
    const { slides } = render('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n')
    const html = slides.map((slide) => slide.html).join('')
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/href="javascript:/i)
  })

  it('does not throw on empty markdown', () => {
    expect(() => render('')).not.toThrow()
  })
})

describe('directive warnings', () => {
  it('leaves an unrecognized directive-style comment in the speaker notes', () => {
    // This pins the Marp behavior the warning feature relies on.
    const { slides } = render('# A\n\n<!-- unknownkey: value -->\n')
    expect(slides[0]?.notes).toEqual([expect.stringContaining('unknownkey: value')])
  })

  it('warns, with a 0-based line, about a comment that looks like a directive but is not one', () => {
    const { warnings } = render('# A\n\n<!-- paginate: true -->\n\n<!-- TODOO: fix -->\n')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.line).toBe(4)
    expect(warnings[0]?.message).toContain('TODOO')
  })

  it('does not warn about recognized directives or plain notes', () => {
    const { warnings } = render('# A\n\n<!-- paginate: true -->\n\n<!-- say hello -->\n')
    expect(warnings).toEqual([])
  })
})
