import { useSession } from '@/core/deck'
import type { RenderedSlide } from '@/core/engine'
import { SlideView } from '@/shared/slide-view'
import styles from './ThumbnailRail.module.css'

interface ThumbnailRailProps {
  slides: RenderedSlide[]
  activeIndex: number
}

export function ThumbnailRail({ slides, activeIndex }: ThumbnailRailProps) {
  return (
    <nav className={styles.rail} aria-label="Slides">
      {slides.map((slide, index) => (
        <button
          key={index}
          type="button"
          className={styles.thumb}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === activeIndex ? 'true' : undefined}
          onClick={() => useSession.getState().requestJump(slide.lineRange.start)}
        >
          <span className={styles.preview} inert>
            <SlideView html={slide.html} />
          </span>
        </button>
      ))}
    </nav>
  )
}
