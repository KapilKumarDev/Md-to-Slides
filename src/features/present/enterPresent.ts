import { useSession } from '@/core/deck'

/** Must be called from a click handler so the fullscreen request counts as a user gesture. */
export async function enterPresent(): Promise<void> {
  useSession.getState().setMode('present')
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    // Fullscreen is optional: refused or unsupported, the deck presents in the window.
  }
}
