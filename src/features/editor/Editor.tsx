import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { useEffect, useRef } from 'react'
import { useSession } from '@/core/deck'
import styles from './Editor.module.css'

export function Editor() {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const editorRequest = useSession((state) => state.editorRequest)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const { text, setText, setCursorLine } = useSession.getState()

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: text,
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          syntaxHighlighting(defaultHighlightStyle),
          markdown(),
          EditorView.lineWrapping,
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.contentAttributes.of({ 'aria-label': 'Slide Markdown' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) setText(update.state.doc.toString())
            if (update.docChanged || update.selectionSet) {
              const head = update.state.selection.main.head
              setCursorLine(update.state.doc.lineAt(head).number - 1)
            }
          }),
        ],
      }),
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!editorRequest || !view) return

    if (editorRequest.type === 'jump') {
      const line = view.state.doc.line(Math.min(editorRequest.line + 1, view.state.doc.lines))
      view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true })
      view.focus()
    } else {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: editorRequest.text },
        selection: { anchor: 0 },
        scrollIntoView: true,
      })
    }
    useSession.getState().clearEditorRequest()
  }, [editorRequest])

  return <div ref={hostRef} className={styles.editor} />
}
