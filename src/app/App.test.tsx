import { EditorView } from '@codemirror/view'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/core/deck'
import { App } from './App'

const railButtons = () => screen.findAllByRole('button', { name: /Go to slide/ })

function editorView(container: HTMLElement) {
  const dom = container.querySelector<HTMLElement>('.cm-editor')
  const view = dom && EditorView.findFromDOM(dom)
  if (!view) throw new Error('Editor did not mount')
  return view
}

beforeEach(() => useSession.setState(useSession.getInitialState(), true))
afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('opens a starter deck with live slides and its title in the header', async () => {
    render(<App />)
    expect(await railButtons()).toHaveLength(3)
    const header = screen.getByRole('banner')
    expect(
      within(header).getByRole('heading', { level: 1, name: 'Your first deck' }),
    ).toBeInTheDocument()
  })

  it('updates the preview when the Markdown changes', async () => {
    const { container } = render(<App />)
    await railButtons()
    const view = editorView(container)
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '# A\n\n---\n\n# B' } })
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /Go to slide/ })).toHaveLength(2),
    )
  })

  it('saves edits to browser storage', async () => {
    const { container } = render(<App />)
    await railButtons()
    const view = editorView(container)
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '# Persisted deck' } })
    await waitFor(
      () => expect(localStorage.getItem('markdown-slides:decks')).toContain('Persisted deck'),
      { timeout: 3000 },
    )
  })

  it('presents and returns to the editor', async () => {
    render(<App />)
    await railButtons()
    await userEvent.click(screen.getByRole('button', { name: 'Present' }))
    const dialog = await screen.findByRole('dialog', { name: 'Presentation' })
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Presentation' })).toBeNull())
  })

  it('still opens a deck and explains the problem when browser storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be read/)
    expect(await railButtons()).toHaveLength(3)
  })
})
