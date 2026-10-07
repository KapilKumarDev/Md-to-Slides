import type { ButtonHTMLAttributes } from 'react'
import { classNames } from '@/shared/classNames'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'quiet'
}

export function Button({ variant = 'quiet', ...props }: ButtonProps) {
  return <button type="button" className={classNames(styles.button, styles[variant])} {...props} />
}
