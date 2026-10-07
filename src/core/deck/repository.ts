import type { Deck } from './deck'

export interface DeckRepository {
  list(): Promise<Deck[]>
  get(id: string): Promise<Deck | null>
  save(deck: Deck): Promise<void>
  delete(id: string): Promise<void>
}

/** The message is written for the person using the app. */
export class StorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StorageError'
  }
}
