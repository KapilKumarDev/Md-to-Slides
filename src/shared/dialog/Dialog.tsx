import { useEffect, useRef, type ReactNode } from 'react'
import { classNames } from '@/shared/classNames'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  children: ReactNode
}

/** A native modal <dialog>: focus trap, inert background and Escape come from the browser. */
export function Dialog({ open, onClose, label, className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={classNames(styles.dialog, className)}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}
