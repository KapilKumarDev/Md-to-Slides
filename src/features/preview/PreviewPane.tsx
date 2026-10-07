import { selectActiveSlide, useSession } from '@/core/deck'
import { SlideView } from '@/shared/slide-view'
import styles from './PreviewPane.module.css'
import { ThumbnailRail } from './ThumbnailRail'

export function PreviewPane() {
  const rendered = useSession((state) => state.rendered)
  const renderError = useSession((state) => state.renderError)
  const activeIndex = useSession(selectActiveSlide)

  const slides = rendered?.slides ?? []
  const active = slides[activeIndex]

  return (
    <section className={styles.pane} aria-label="Slide preview">
      {renderError && (
        <p role="alert" className={styles.error}>
          Couldn&apos;t render the slides: {renderError}. Showing the last version that worked.
        </p>
      )}
      {rendered && rendered.warnings.length > 0 && (
        <ul className={styles.warnings} aria-label="Warnings">
          {rendered.warnings.map((warning) => (
            <li key={warning.line}>
              <button
                type="button"
                className={styles.warning}
                onClick={() => useSession.getState().requestJump(warning.line)}
              >
                Line {warning.line + 1}: {warning.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      {active ? (
        <div className={styles.stage}>
          <ThumbnailRail slides={slides} activeIndex={activeIndex} />
          <div className={styles.view}>
            <div className={styles.mountFrame}>
              <div
                role="group"
                aria-label={`Slide ${activeIndex + 1} of ${slides.length}`}
                className={styles.mount}
              >
                <SlideView html={active.html} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>
          Write Markdown on the left. Start a new slide with a line containing ---.
        </p>
      )}
    </section>
  )
}
