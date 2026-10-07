import { useCallback, useEffect, useMemo, useState } from 'react'
import { selectActiveSlide, useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { Dialog } from '@/shared/dialog'
import { SlideView } from '@/shared/slide-view'
import styles from './PresentMode.module.css'
import { useElapsed } from './useElapsed'

const NEXT_KEYS = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']

export function PresentMode() {
  const rendered = useSession((state) => state.rendered)
  const slides = useMemo(() => rendered?.slides ?? [], [rendered])
  const [index, setIndex] = useState(() => selectActiveSlide(useSession.getState()))
  const [presenterView, setPresenterView] = useState(false)
  const elapsed = useElapsed()
  const last = slides.length - 1

  const next = useCallback(() => setIndex((value) => Math.min(value + 1, last)), [last])
  const previous = useCallback(() => setIndex((value) => Math.max(value - 1, 0)), [])

  const exit = useCallback(() => {
    const current = slides[index]
    if (current) useSession.getState().requestJump(current.lineRange.start)
    useSession.getState().setMode('edit')
    if (document.fullscreenElement) void document.exitFullscreen()
  }, [slides, index])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (NEXT_KEYS.includes(event.key)) next()
      else if (PREVIOUS_KEYS.includes(event.key)) previous()
      else if (event.key === 'Home') setIndex(0)
      else if (event.key === 'End') setIndex(Math.max(last, 0))
      else if (event.key === 'p' || event.key === 'P') setPresenterView((value) => !value)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, previous, last])

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) exit()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [exit])

  const current = slides[index]
  const upcoming = slides[index + 1]

  return (
    <Dialog open onClose={exit} label="Presentation" className={styles.present}>
      {!current ? (
        <div className={styles.empty}>
          <p>There are no slides to present.</p>
          <Button onClick={exit}>Back to editor</Button>
        </div>
      ) : presenterView ? (
        <div className={styles.presenter}>
          <div className={styles.current}>
            <SlideView html={current.html} />
          </div>
          <aside className={styles.side}>
            <section>
              <h2 className={styles.heading}>Next</h2>
              {upcoming ? (
                <SlideView html={upcoming.html} />
              ) : (
                <p className={styles.muted}>End of deck</p>
              )}
            </section>
            <section>
              <h2 className={styles.heading}>Notes</h2>
              {current.notes.length > 0 ? (
                current.notes.map((note, noteIndex) => <p key={noteIndex}>{note}</p>)
              ) : (
                <p className={styles.muted}>No notes for this slide.</p>
              )}
            </section>
          </aside>
          <footer className={styles.bar}>
            <span>
              {index + 1} / {slides.length}
            </span>
            <span>
              Elapsed <time>{elapsed}</time>
            </span>
            <Button onClick={previous} disabled={index === 0}>
              Previous
            </Button>
            <Button onClick={next} disabled={index === last}>
              Next
            </Button>
            <Button onClick={() => setPresenterView(false)}>Audience view</Button>
            <Button onClick={exit}>Exit</Button>
          </footer>
        </div>
      ) : (
        <div className={styles.audience} onClick={next}>
          <div className={styles.stage}>
            <SlideView html={current.html} />
          </div>
          <p className={styles.visuallyHidden} aria-live="polite">
            Slide {index + 1} of {slides.length}
          </p>
        </div>
      )}
    </Dialog>
  )
}
