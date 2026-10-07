import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deckRepository, useSession, type Deck } from '@/core/deck'
import { DeckMenu } from './DeckMenu'

const alpha: Deck = { id: 'alpha', title: 'Alpha', text: '# Alpha', updatedAt: 1 }
const beta: Deck = { id: 'beta', title: 'Beta', text: '# Beta', updatedAt: 2 }

async function openMenu() {
  render(<DeckMenu />)
  await userEvent.click(screen.getByRole('button', { name: 'Decks' }))
  return screen.findByRole('dialog', { name: 'Your decks' })
}

beforeEach(async () => {
  useSession.setState(useSession.getInitialState(), true)
  await deckRepository.save(alpha)
  await deckRepository.save(beta)
  useSession.getState().loadDeck(beta)
})
afterEach(() => vi.restoreAllMocks())

describe('DeckMenu', () => {
  it('lists decks and marks the open one', async () => {
    const dialog = await openMenu()
    expect(await within(dialog).findByText('Alpha')).toBeInTheDocument()
    expect(within(dialog).getByText('Beta')).toBeInTheDocument()
    expect(within(dialog).getByText('Open now')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Open Beta' })).toBeNull()
  })

  it('opens another deck', async () => {
    const dialog = await openMenu()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Open Alpha' }))
    expect(useSession.getState().deckId).toBe('alpha')
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it('creates a new deck', async () => {
    const dialog = await openMenu()
    await userEvent.click(within(dialog).getByRole('button', { name: 'New deck' }))
    await waitFor(() => expect(useSession.getState().text).toBe('# Untitled deck\n'))
    expect((await deckRepository.list()).map((deck) => deck.title)).toContain('Untitled deck')
  })

  it('needs a second click to delete a deck', async () => {
    const dialog = await openMenu()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Delete Alpha' }))
    expect(await deckRepository.get('alpha')).not.toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm deleting Alpha' }))
    await waitFor(async () => expect(await deckRepository.get('alpha')).toBeNull())
  })

  it('opens another deck when the open deck is deleted', async () => {
    const dialog = await openMenu()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Delete Beta' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm deleting Beta' }))
    await waitFor(() => expect(useSession.getState().deckId).toBe('alpha'))
  })

  it('shows a notice when saved decks cannot be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    await openMenu()
    await waitFor(() => expect(useSession.getState().notice?.kind).toBe('error'))
    expect(useSession.getState().notice?.message).toMatch(/could not be read/)
  })
})
