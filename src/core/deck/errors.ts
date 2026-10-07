import { useSession } from './session'

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Shows an error to the person using the app. The open deck is never touched. */
export function reportError(
  error: unknown,
  store: Pick<typeof useSession, 'getState'> = useSession,
): void {
  store.getState().setNotice({ kind: 'error', message: errorMessage(error) })
}
