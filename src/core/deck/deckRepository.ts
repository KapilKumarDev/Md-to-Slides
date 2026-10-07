import { LocalStorageDeckRepository } from './localStorageRepository'
import type { DeckRepository } from './repository'

/** The one place that chooses where decks live. A backend replaces this line. */
export const deckRepository: DeckRepository = new LocalStorageDeckRepository()
