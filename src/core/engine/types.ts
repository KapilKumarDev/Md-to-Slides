export interface RenderedSlide {
  html: string
  notes: string[]
  /** 0-based, inclusive source lines belonging to this slide. */
  lineRange: { start: number; end: number }
}

export interface RenderResult {
  css: string
  slides: RenderedSlide[]
  warnings: { line: number; message: string }[]
}

/** Whether the content currently mounted in a slide's `section` fits inside the slide. */
export type Fits = (section: HTMLElement) => boolean