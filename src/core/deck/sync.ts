import { render, type RenderResult } from '@/core/engine'
import { deriveTitle, type Deck } from './deck'
import { errorMessage, reportError } from './errors'
import type { DeckRepository } from './repository'
import type { useSession } from './session'

type SessionStore = Pick<typeof useSession, 'getState' | 'subscribe'>

/** Keeps `rendered` in step with `text`: once on start, at once on deck change, debounced on edits. */
export function startRenderSync(
  store: SessionStore,
  renderFn: (text: string) => RenderResult = render,
  delayMs = 150,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  const run = () => {
    const { text, setRendered, setRenderError } = store.getState()
    try {
      setRendered(renderFn(text))
    } catch (error) {
      setRenderError(errorMessage(error))
    }
  }

  run()
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.deckId !== previous.deckId) {
      clearTimeout(timer)
      run()
    } else if (state.text !== previous.text) {
      clearTimeout(timer)
      timer = setTimeout(run, delayMs)
    }
  })

  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}

/** Saves edits after a pause. Pending edits are flushed when the deck changes or on cleanup. */
export function startAutosave(
  store: SessionStore,
  repository: DeckRepository,
  delayMs = 800,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: Deck | null = null

  const flush = () => {
    clearTimeout(timer)
    if (!pending) return
    const deck = pending
    pending = null
    repository.save(deck).catch((error: unknown) => reportError(error, store))
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.deckId !== previous.deckId) {
      flush()
      return
    }
    if (state.deckId === null || state.text === previous.text) return
    pending = {
      id: state.deckId,
      title: deriveTitle(state.text),
      text: state.text,
      updatedAt: Date.now(),
    }
    clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  })

  return () => {
    unsubscribe()
    flush()
  }
}
