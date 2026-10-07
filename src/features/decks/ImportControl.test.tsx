import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { deckRepository, useSession } from '@/core/deck'
import { ImportControl } from './ImportControl'

const user = userEvent.setup({ applyAccept: false })
const md = (name = 'talk.md', text = '# Imported\n') =>
  new File([text], name, { type: 'text/markdown' })
const dropOf = (...files: File[]) => ({ dataTransfer: { files, types: ['Files'] } })

function setup() {
  useSession
    .getState()
    .loadDeck({ id: 'current', title: 'Current', text: '# Current', updatedAt: 1 })
  const view = render(<ImportControl />)
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('File input missing')
  return { ...view, input }
}

const importDialog = () => screen.findByRole('dialog', { name: 'Import Markdown file' })

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('ImportControl', () => {
  it('asks what to do with a chosen file', async () => {
    const { input } = setup()
    await user.upload(input, md())
    const dialog = await importDialog()
    expect(dialog).toHaveTextContent('Import "talk.md"')
  })

  it('New deck saves the file as a separate deck and opens it', async () => {
    const { input } = setup()
    await user.upload(input, md())
    await user.click(await screen.findByRole('button', { name: 'New deck' }))
    await waitFor(() => expect(useSession.getState().text).toBe('# Imported\n'))
    expect(useSession.getState().deckId).not.toBe('current')
    expect((await deckRepository.list()).map((deck) => deck.title)).toContain('Imported')
  })

  it('Replace asks the editor to replace the text and keeps the same deck', async () => {
    const { input } = setup()
    await user.upload(input, md())
    await user.click(await screen.findByRole('button', { name: 'Replace current deck' }))
    expect(useSession.getState().editorRequest).toEqual({ type: 'replace', text: '# Imported\n' })
    expect(useSession.getState().deckId).toBe('current')
  })

  it('Cancel changes nothing', async () => {
    const { input } = setup()
    await user.upload(input, md())
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(useSession.getState().editorRequest).toBeNull()
    expect(useSession.getState().deckId).toBe('current')
    expect(useSession.getState().text).toBe('# Current')
    expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open')
  })

  it('rejects a non-Markdown file without touching the deck', async () => {
    const { input } = setup()
    await user.upload(input, md('notes.txt'))
    await waitFor(() => expect(useSession.getState().notice?.kind).toBe('error'))
    expect(useSession.getState().notice?.message).toMatch(/isn't a Markdown file/)
    expect(useSession.getState().text).toBe('# Current')
  })

  it('accepts one dropped file', async () => {
    setup()
    fireEvent.drop(window, dropOf(md('dropped.md')))
    expect(await importDialog()).toHaveTextContent('Import "dropped.md"')
  })

  it('shows a hint while a file is dragged over the window, and hides it on drop', async () => {
    setup()
    fireEvent.dragOver(window, { dataTransfer: { types: ['Files'] } })
    expect(await screen.findByRole('status')).toHaveTextContent('Drop a .md file to import it')
    fireEvent.drop(window, dropOf(md()))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
  })

  it('asks for one file at a time when several are dropped', async () => {
    setup()
    fireEvent.drop(window, dropOf(md('a.md'), md('b.md')))
    await waitFor(() =>
      expect(useSession.getState().notice?.message).toBe('Import one Markdown file at a time.'),
    )
  })

  it('ignores drags that do not carry files', () => {
    setup()
    fireEvent.drop(window, { dataTransfer: { files: [], types: ['text/plain'] } })
    expect(useSession.getState().notice).toBeNull()
  })
})
