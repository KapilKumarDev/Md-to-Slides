import { useEffect, useState } from 'react'

/** Elapsed time since mount as `mm:ss`, computed from timestamps so a throttled tab does not drift. */
export function useElapsed(): string {
  const [startedAt] = useState(Date.now)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
