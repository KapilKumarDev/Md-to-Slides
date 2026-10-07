import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import styles from './SplitPane.module.css'

const MIN = 20
const MAX = 80
const STEP = 5

const snap = (percent: number) => Math.min(MAX, Math.max(MIN, Math.round(percent / STEP) * STEP))

interface SplitPaneProps {
  start: ReactNode
  end: ReactNode
  label: string
}

export function SplitPane({ start, end, label }: SplitPaneProps) {
  const [split, setSplit] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') setSplit((value) => snap(value - STEP))
    else if (event.key === 'ArrowRight') setSplit((value) => snap(value + STEP))
    else return
    event.preventDefault()
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!dragging.current || !rect || rect.width === 0) return
    setSplit(snap(((event.clientX - rect.left) / rect.width) * 100))
  }

  return (
    <div ref={containerRef} className={styles.split} data-split={split}>
      <div className={styles.pane}>{start}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={split}
        tabIndex={0}
        className={styles.handle}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragging.current = false
        }}
      />
      <div className={styles.pane}>{end}</div>
    </div>
  )
}
