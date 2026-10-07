import { undo } from '@codemirror/commands'
import { EditorView } from '@codemirror/view'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSession } from '@/core/deck'
import { Editor } from './Editor'

const TEXT = '# One\n\n---\n\n# Two'

function mount() {
  useSession.getState().loadDeck({ id: 'a', title: 'a', text: TEXT, updatedAt: 1 })
  const { container } = render(<Editor />)
  const dom = container.querySelector<HTMLElement>('.cm-editor')
  const view = dom && EditorView.findFromDOM(dom)
  if (!view) throw new Error('Editor did not mount')
  return view
}

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('Editor', () => {
  it('starts with the session text', () => {
    expect(mount().state.doc.toString()).toBe(TEXT)
  })

  it('writes edits back to the session', () => {
    const view = mount()
    act(() => view.dispatch({ changes: { from: 0, insert: 'x' } }))
    expect(useSession.getState().text).toBe(`x${TEXT}`)
  })

  it('reports the 0-based cursor line', () => {
    const view = mount()
    act(() => view.dispatch({ selection: { anchor: view.state.doc.line(5).from } }))
    expect(useSession.getState().cursorLine).toBe(4)
  })

  it('moves the cursor to a requested 0-based line and clears the request', () => {
    const view = mount()
    act(() => useSession.getState().requestJump(4))
    expect(view.state.selection.main.head).toBe(view.state.doc.line(5).from)
    expect(useSession.getState().editorRequest).toBeNull()
  })

  it('clamps a jump past the end to the last line', () => {
    const view = mount()
    act(() => useSession.getState().requestJump(999))
    expect(view.state.selection.main.head).toBe(view.state.doc.line(view.state.doc.lines).from)
  })

  it('applies a replace request as one undoable change', () => {
    const view = mount()
    act(() => useSession.getState().requestReplace('# New'))
    expect(view.state.doc.toString()).toBe('# New')
    expect(useSession.getState().text).toBe('# New')
    expect(useSession.getState().editorRequest).toBeNull()
    undo(view)
    expect(view.state.doc.toString()).toBe(TEXT)
  })
})
