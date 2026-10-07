import { create } from 'zustand'
import { slideIndexForLine, type RenderResult } from '@/core/engine'
import type { Deck } from './deck'

interface Notice {
  kind: 'error' | 'info'
  message: string
}

type EditorRequest = { type: 'jump'; line: number } | { type: 'replace'; text: string }

interface SessionState {
  deckId: string | null
  text: string
  cursorLine: number
  rendered: RenderResult | null
  renderError: string | null
  mode: 'edit' | 'present'
  notice: Notice | null
  editorRequest: EditorRequest | null
  loadDeck: (deck: Deck) => void
  setText: (text: string) => void
  setCursorLine: (line: number) => void
  setRendered: (result: RenderResult) => void
  setRenderError: (message: string) => void
  setMode: (mode: 'edit' | 'present') => void
  setNotice: (notice: Notice | null) => void
  requestJump: (line: number) => void
  requestReplace: (text: string) => void
  clearEditorRequest: () => void
}

export const useSession = create<SessionState>()((set) => ({
  deckId: null,
  text: '',
  cursorLine: 0,
  rendered: null,
  renderError: null,
  mode: 'edit',
  notice: null,
  editorRequest: null,
  loadDeck: (deck) =>
    set({
      deckId: deck.id,
      text: deck.text,
      cursorLine: 0,
      renderError: null,
      editorRequest: null,
      mode: 'edit',
    }),
  setText: (text) => set({ text }),
  setCursorLine: (cursorLine) => set({ cursorLine }),
  setRendered: (rendered) => set({ rendered, renderError: null }),
  setRenderError: (renderError) => set({ renderError }),
  setMode: (mode) => set({ mode }),
  setNotice: (notice) => set({ notice }),
  requestJump: (line) => set({ editorRequest: { type: 'jump', line } }),
  requestReplace: (text) => set({ editorRequest: { type: 'replace', text } }),
  clearEditorRequest: () => set({ editorRequest: null }),
}))

type State = ReturnType<typeof useSession.getState>

export const selectActiveSlide = (state: State): number =>
  slideIndexForLine(state.rendered?.slides ?? [], state.cursorLine)

export const selectHasSlides = (state: State): boolean => (state.rendered?.slides.length ?? 0) > 0
