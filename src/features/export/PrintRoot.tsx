import { useSession } from '@/core/deck'
import { SlideView } from '@/shared/slide-view'

/** Hidden on screen. `src/styles/print.css` shows only this element when printing. */
export function PrintRoot() {
  const rendered = useSession((state) => state.rendered)
  if (!rendered) return null

  return (
    <div id="print-root">
      {rendered.slides.map((slide, index) => (
        <SlideView key={index} html={slide.html} className="print-page" />
      ))}
    </div>
  )
}
