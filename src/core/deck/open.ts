import { createDeck, type Deck } from './deck'
import { reportError } from './errors'
import type { DeckRepository } from './repository'
import { useSession } from './session'
import { starterText } from './starter'

/** Opens a new deck at once; a failed save is reported but never blocks opening. */
export async function openNewDeck(text: string, repository: DeckRepository): Promise<void> {
  const deck = createDeck(text)
  useSession.getState().loadDeck(deck)
  try {
    await repository.save(deck)
  } catch (error) {
    reportError(error)
  }
}

export async function openInitialDeck(repository: DeckRepository): Promise<void> {
  let latest: Deck | undefined
  try {
    latest = (await repository.list())[0]
  } catch (error) {
    reportError(error)
    useSession.getState().loadDeck(createDeck(starterText))
    return
  }
  if (latest) {
    useSession.getState().loadDeck(latest)
    return
  }
  await openNewDeck(starterText, repository)
}
