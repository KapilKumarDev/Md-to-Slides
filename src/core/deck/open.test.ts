import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Deck } from './deck'
import { openInitialDeck, openNewDeck } from './open'
import { StorageError, type DeckRepository } from './repository'
import { useSession } from './session'
import { starterText } from './starter'

const deck = (id: string, updatedAt: number): Deck => ({
  id,
  title: id,
  text: `# ${id}`,
  updatedAt,
})

const makeRepo = (overrides: Partial<DeckRepository> = {}): DeckRepository => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(),
  delete: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('openInitialDeck', () => {
  it('opens the most recently updated deck', async () => {
    const repo = makeRepo({ list: vi.fn().mockResolvedValue([deck('newest', 2), deck('old', 1)]) })
    await openInitialDeck(repo)
    expect(useSession.getState().deckId).toBe('newest')
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('creates and saves a starter deck when none exist', async () => {
    const repo = makeRepo()
    await openInitialDeck(repo)
    expect(useSession.getState().text).toBe(starterText)
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('opens an unsaved starter deck and shows a notice when storage cannot be read', async () => {
    const repo = makeRepo({ list: vi.fn().mockRejectedValue(new StorageError('Cannot read.')) })
    await openInitialDeck(repo)
    expect(useSession.getState().text).toBe(starterText)
    expect(useSession.getState().notice).toEqual({ kind: 'error', message: 'Cannot read.' })
    expect(repo.save).not.toHaveBeenCalled()
  })
})

describe('openNewDeck', () => {
  it('saves and opens a new deck', async () => {
    const repo = makeRepo()
    await openNewDeck('# Fresh', repo)
    expect(useSession.getState().text).toBe('# Fresh')
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Fresh' }))
  })

  it('still opens the deck and shows a notice when saving fails', async () => {
    const repo = makeRepo({ save: vi.fn().mockRejectedValue(new StorageError('Storage is full.')) })
    await openNewDeck('# Fresh', repo)
    expect(useSession.getState().text).toBe('# Fresh')
    expect(useSession.getState().notice?.message).toBe('Storage is full.')
  })
})
