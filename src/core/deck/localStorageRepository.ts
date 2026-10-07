import type { Deck } from './deck'
import { StorageError, type DeckRepository } from './repository'

const KEY = 'markdown-slides:decks'

type DeckMap = Record<string, Deck>

export class LocalStorageDeckRepository implements DeckRepository {
  private readonly getStorage: () => Storage

  constructor(getStorage: () => Storage = () => window.localStorage) {
    this.getStorage = getStorage
  }

  private read(): DeckMap {
    try {
      const raw = this.getStorage().getItem(KEY)
      if (!raw) return {}
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new TypeError('Unexpected storage shape')
      }
      return parsed as DeckMap
    } catch (cause) {
      throw new StorageError(
        'Saved decks could not be read. Check that your browser allows site storage.',
        { cause },
      )
    }
  }

  private write(decks: DeckMap): void {
    try {
      this.getStorage().setItem(KEY, JSON.stringify(decks))
    } catch (cause) {
      throw new StorageError(
        'Your changes could not be saved because browser storage is full or unavailable. You can still export a PDF.',
        { cause },
      )
    }
  }

  async list(): Promise<Deck[]> {
    return Object.values(this.read()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async get(id: string): Promise<Deck | null> {
    return this.read()[id] ?? null
  }

  async save(deck: Deck): Promise<void> {
    this.write({ ...this.read(), [deck.id]: deck })
  }

  async delete(id: string): Promise<void> {
    this.write(Object.fromEntries(Object.entries(this.read()).filter(([key]) => key !== id)))
  }
}
