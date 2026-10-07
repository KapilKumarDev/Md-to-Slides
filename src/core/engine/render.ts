import { Marp } from '@marp-team/marp-core'
import type MarkdownIt from 'markdown-it'
import { fitsInSlide } from './fits'
import { paginate } from './paginate'
import { LINE_ATTR } from './section'
import type { Fits, RenderResult, RenderedSlide } from './types'
import { findUnrecognizedDirectives } from './warnings'

// `script: false` keeps Marp from emitting a browser <script>; HTML stays on Marp's allowlist.
const marp = new Marp({ script: false })

// Block tokens that become the elements pagination cuts between.
const BLOCKS = new Set([
  'paragraph_open',
  'heading_open',
  'bullet_list_open',
  'ordered_list_open',
  'list_item_open',
  'blockquote_open',
  'table_open',
  'tr_open',
  'fence',
  'code_block',
])

// Marpit's slide tokens carry the source line where each slide starts. Capture them in
// the same parse that produces the HTML, so the app never parses a deck twice. The same
// pass stamps each block with its line inside its slide, so a page cut out of a long slide
// still knows where it came from.
let slideStartLines: number[] = []
marp.use((md: MarkdownIt) => {
  md.core.ruler.push('source_lines', (state) => {
    slideStartLines = []
    let slideStart = 0
    for (const token of state.tokens) {
      if (token.type === 'marpit_slide_open') {
        slideStartLines.push(token.map?.[0] ?? 0)
        slideStart = slideStartLines.length === 1 ? 0 : (token.map?.[0] ?? 0)
      } else if (token.map && BLOCKS.has(token.type)) {
        token.attrSet(LINE_ATTR, String(token.map[0] - slideStart))
      }
    }
  })
})

/** `fits` decides when a slide is full. It defaults to measuring real layout in the browser. */
export function render(markdown: string, fits: Fits = fitsInSlide): RenderResult {
  const { html, css, comments } = marp.render(markdown, { htmlAsArray: true })
  const pages = Array.isArray(html) ? html : [html]
  const lastLine = markdown.split('\n').length - 1

  const slides: RenderedSlide[] = pages.map((page, index) => {
    const nextStart = slideStartLines[index + 1]
    return {
      html: page,
      notes: comments[index] ?? [],
      lineRange: {
        start: index === 0 ? 0 : (slideStartLines[index] ?? 0),
        end: nextStart === undefined ? lastLine : nextStart - 1,
      },
    }
  })

  return paginate({ css, slides, warnings: findUnrecognizedDirectives(markdown, slides) }, fits)
}