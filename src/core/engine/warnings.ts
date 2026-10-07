import type { RenderedSlide } from './types'

// Marp keeps `<!-- key: value -->` out of the notes only when it recognizes the key.
// A note that still looks like `key: value` was written as a directive but was not applied.
const DIRECTIVE_LIKE = /^[A-Za-z][\w-]*:[ \t]+\S/

export function findUnrecognizedDirectives(markdown: string, slides: RenderedSlide[]) {
  const lines = markdown.split('\n')
  return slides.flatMap((slide) =>
    slide.notes.flatMap((note) => {
      const trimmed = note.trim()
      if (!DIRECTIVE_LIKE.test(trimmed)) return []
      const line = lines.findIndex(
        (text, index) =>
          index >= slide.lineRange.start && index <= slide.lineRange.end && text.includes(trimmed),
      )
      if (line === -1) return []
      const key = trimmed.slice(0, trimmed.indexOf(':'))
      return [
        {
          line,
          message: `"${key}" looks like a directive, but Marp doesn't recognize it. It is treated as a speaker note.`,
        },
      ]
    }),
  )
}
