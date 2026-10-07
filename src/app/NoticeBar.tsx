import { useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { classNames } from '@/shared/classNames'
import styles from './NoticeBar.module.css'

export function NoticeBar() {
  const notice = useSession((state) => state.notice)
  if (!notice) return null

  return (
    <div
      role={notice.kind === 'error' ? 'alert' : 'status'}
      className={classNames(styles.notice, notice.kind === 'error' && styles.error)}
    >
      <p className={styles.message}>{notice.message}</p>
      <Button onClick={() => useSession.getState().setNotice(null)}>Dismiss</Button>
    </div>
  )
}
