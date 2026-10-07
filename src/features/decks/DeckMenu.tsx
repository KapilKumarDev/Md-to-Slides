import { useState } from 'react'
import {
  deckRepository,
  openInitialDeck,
  openNewDeck,
  reportError,
  useSession,
  type Deck,
} from '@/core/deck'
import { Button } from '@/shared/button'
import { Dialog, DialogActions, DialogBody } from '@/shared/dialog'
import styles from './DeckMenu.module.css'

const BLANK_DECK = '# Untitled deck\n'
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function DeckMenu() {
  const [open, setOpen] = useState(false)
  const [decks, setDecks] = useState<Deck[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const currentId = useSession((state) => state.deckId)

  const refresh = async () => {
    try {
      setDecks(await deckRepository.list())
    } catch (error) {
      reportError(error)
    }
  }

  const show = () => {
    setOpen(true)
    void refresh()
  }

  const close = () => {
    setOpen(false)
    setConfirmingId(null)
  }

  const openDeck = (deck: Deck) => {
    useSession.getState().loadDeck(deck)
    close()
  }

  const newDeck = async () => {
    close()
    await openNewDeck(BLANK_DECK, deckRepository)
  }

  const remove = async (deck: Deck) => {
    try {
      await deckRepository.delete(deck.id)
    } catch (error) {
      reportError(error)
      return
    }
    setConfirmingId(null)
    if (deck.id === useSession.getState().deckId) {
      close()
      await openInitialDeck(deckRepository)
    } else {
      await refresh()
    }
  }

  return (
    <>
      <Button onClick={show}>Decks</Button>
      <Dialog open={open} onClose={close} label="Your decks">
        <DialogBody>
          <h2>Your decks</h2>
          <DialogActions>
            <Button variant="primary" onClick={() => void newDeck()}>
              New deck
            </Button>
          </DialogActions>
          <ul className={styles.list}>
            {decks.map((deck) => (
              <li key={deck.id} className={styles.item}>
                <div className={styles.meta}>
                  <span className={styles.name}>{deck.title}</span>
                  <span className={styles.date}>{formatDate.format(deck.updatedAt)}</span>
                </div>
                {deck.id === currentId ? (
                  <span className={styles.current}>Open now</span>
                ) : (
                  <Button aria-label={`Open ${deck.title}`} onClick={() => openDeck(deck)}>
                    Open
                  </Button>
                )}
                {confirmingId === deck.id ? (
                  <Button
                    aria-label={`Confirm deleting ${deck.title}`}
                    onClick={() => void remove(deck)}
                  >
                    Confirm delete
                  </Button>
                ) : (
                  <Button
                    aria-label={`Delete ${deck.title}`}
                    onClick={() => setConfirmingId(deck.id)}
                  >
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <DialogActions>
            <Button onClick={close}>Close</Button>
          </DialogActions>
        </DialogBody>
      </Dialog>
    </>
  )
}
