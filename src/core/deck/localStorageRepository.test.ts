import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Deck } from './deck'
import { LocalStorageDeckRepository } from './localStorageRepository'
import { StorageError } from './repository'

const deck = (id: string, updatedAt: number): Deck => ({
  id,
  title: id,
  text: `# ${id}`,
  updatedAt,
})

afterEach(() => vi.restoreAllMocks())

describe('LocalStorageDeckRepository', () => {
  it('lists decks newest first', async () => {
    const repo = new LocalStorageDeckRepository()
    await repo.save(deck('old', 1))
    await repo.save(deck('new', 2))
    expect((await repo.list()).map((d) => d.id)).toEqual(['new', 'old'])
  })

  it('gets, overwrites and deletes a deck', async () => {
    const repo = new LocalStorageDeckRepository()
    await repo.save(deck('a', 1))
    await repo.save({ ...deck('a', 2), text: 'changed' })
    expect((await repo.get('a'))?.text).toBe('changed')
    await repo.delete('a')
    expect(await repo.get('a')).toBeNull()
  })

  it('returns null for a missing deck', async () => {
    expect(await new LocalStorageDeckRepository().get('nope')).toBeNull()
  })

  it('rejects with a StorageError when storage is full', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    await expect(new LocalStorageDeckRepository().save(deck('a', 1))).rejects.toThrow(StorageError)
    await expect(new LocalStorageDeckRepository().save(deck('a', 1))).rejects.toThrow(/full/i)
  })

  it('rejects with a StorageError when storage is unavailable', async () => {
    const repo = new LocalStorageDeckRepository(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    await expect(repo.list()).rejects.toThrow(StorageError)
  })

  it('rejects with a StorageError when stored data is corrupted', async () => {
    localStorage.setItem('markdown-slides:decks', '{not json')
    await expect(new LocalStorageDeckRepository().list()).rejects.toThrow(StorageError)
    localStorage.setItem('markdown-slides:decks', '["array"]')
    await expect(new LocalStorageDeckRepository().list()).rejects.toThrow(StorageError)
  })
})
