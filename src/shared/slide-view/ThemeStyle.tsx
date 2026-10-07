/** Marp's CSS is scoped to `.marpit`, so one copy in the document styles every SlideView. */
export function ThemeStyle({ css }: { css: string }) {
  return <style>{css}</style>
}
