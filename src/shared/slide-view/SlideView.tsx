import { classNames } from '@/shared/classNames'
import styles from './SlideView.module.css'

interface SlideViewProps {
  html: string
  className?: string
}

/** Marp's own CSS styles `.marpit > svg`, so the wrapper must carry the `marpit` class. */
export function SlideView({ html, className }: SlideViewProps) {
  return (
    <div
      className={classNames('marpit', styles.slide, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
