import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Deck } from './deck'
import { StorageError, type DeckRepository } from './repository'
import { useSession } from './session'
import { startAutosave, startRenderSync } from './sync'

const deck = (id: string, text: string): Deck => ({ id, title: id, text, updatedAt: 1 })
const result = (css: string) => ({ css, slides: [], warnings: [] })

beforeEach(() => {
  vi.useFakeTimers()
  useSession.setState(useSession.getInitialState(), true)
})
afterEach(() => vi.useRealTimers())

describe('startRenderSync', () => {
  it('renders once on start, then debounces text edits', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => result(text))
    const stop = startRenderSync(useSession, renderFn, 150)
    expect(renderFn).toHaveBeenCalledTimes(1)

    useSession.getState().setText('two')
    useSession.getState().setText('three')
    vi.advanceTimersByTime(149)
    expect(renderFn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(renderFn).toHaveBeenCalledTimes(2)
    expect(renderFn).toHaveBeenLastCalledWith('three')
    expect(useSession.getState().rendered?.css).toBe('three')
    stop()
  })

  it('renders at once when a different deck loads', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => result(text))
    const stop = startRenderSync(useSession, renderFn, 150)
    useSession.getState().loadDeck(deck('b', 'other'))
    expect(renderFn).toHaveBeenLastCalledWith('other')
    stop()
  })

  it('keeps the last good result and records the error when render throws', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => {
      if (text === 'bad') throw new Error('bad deck')
      return result(text)
    })
    const stop = startRenderSync(useSession, renderFn, 150)
    useSession.getState().setText('bad')
    vi.advanceTimersByTime(150)
    expect(useSession.getState().rendered?.css).toBe('one')
    expect(useSession.getState().renderError).toBe('bad deck')
    stop()
  })

  it('stops reacting after cleanup', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => result(text))
    startRenderSync(useSession, renderFn, 150)()
    useSession.getState().setText('two')
    vi.advanceTimersByTime(500)
    expect(renderFn).toHaveBeenCalledTimes(1)
  })
})

describe('startAutosave', () => {
  const makeRepo = (): DeckRepository & { save: ReturnType<typeof vi.fn> } => ({
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  })

  it('saves the edited deck after the delay', () => {
    const repo = makeRepo()
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Changed')
    vi.advanceTimersByTime(799)
    expect(repo.save).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', title: 'Changed', text: '# Changed' }),
    )
    stop()
  })

  it('does not save when a deck is merely loaded', () => {
    const repo = makeRepo()
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().loadDeck(deck('a', '# A'))
    vi.advanceTimersByTime(2000)
    expect(repo.save).not.toHaveBeenCalled()
    stop()
  })

  it('flushes pending edits immediately when another deck loads', () => {
    const repo = makeRepo()
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Unsaved edit')
    useSession.getState().loadDeck(deck('b', '# B'))
    expect(repo.save).toHaveBeenCalledTimes(1)
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', text: '# Unsaved edit' }),
    )
    vi.advanceTimersByTime(2000)
    expect(repo.save).toHaveBeenCalledTimes(1)
    stop()
  })

  it('flushes on cleanup', () => {
    const repo = makeRepo()
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Edit')
    stop()
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('shows a notice when saving fails and keeps the deck in memory', async () => {
    const repo = makeRepo()
    repo.save.mockRejectedValue(new StorageError('Storage is full.'))
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Edit')
    await vi.advanceTimersByTimeAsync(800)
    expect(useSession.getState().notice).toEqual({ kind: 'error', message: 'Storage is full.' })
    expect(useSession.getState().text).toBe('# Edit')
    stop()
  })
})
