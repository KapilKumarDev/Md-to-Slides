import { useCallback, useEffect, useRef, useState } from 'react'
import { deckRepository, openNewDeck, reportError, useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { Dialog, DialogActions, DialogBody } from '@/shared/dialog'
import styles from './ImportControl.module.css'
import { readMarkdownFile } from './readMarkdownFile'

interface PendingImport {
  name: string
  text: string
}

export function ImportControl() {
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const begin = useCallback(async (files: FileList | File[]) => {
    const [file, ...rest] = Array.from(files)
    if (!file || rest.length > 0) {
      reportError(new Error('Import one Markdown file at a time.'))
      return
    }
    try {
      setPending({ name: file.name, text: await readMarkdownFile(file) })
    } catch (error) {
      reportError(error)
    }
  }, [])

  useEffect(() => {
    const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false
    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      setDragging(true)
    }
    const onDragLeave = (event: DragEvent) => {
      if (event.relatedTarget === null) setDragging(false)
    }
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      setDragging(false)
      if (event.dataTransfer) void begin(event.dataTransfer.files)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [begin])

  async function choose(choice: 'new' | 'replace') {
    if (!pending) return
    const { text } = pending
    setPending(null)
    if (choice === 'new') await openNewDeck(text, deckRepository)
    else useSession.getState().requestReplace(text)
  }

  return (
    <>
      <Button onClick={() => inputRef.current?.click()}>Import</Button>
      <input
        ref={inputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        hidden
        onChange={(event) => {
          if (event.target.files) void begin(event.target.files)
          event.target.value = ''
        }}
      />
      {dragging && (
        <p role="status" className={styles.dropHint}>
          Drop a .md file to import it
        </p>
      )}
      <Dialog open={pending !== null} onClose={() => setPending(null)} label="Import Markdown file">
        <DialogBody>
          <h2>Import &quot;{pending?.name}&quot;</h2>
          <p>
            Add it as a new deck, or replace the text of the deck you have open. You can undo a
            replace.
          </p>
          <DialogActions>
            <Button variant="primary" onClick={() => void choose('new')}>
              New deck
            </Button>
            <Button onClick={() => void choose('replace')}>Replace current deck</Button>
            <Button onClick={() => setPending(null)}>Cancel</Button>
          </DialogActions>
        </DialogBody>
      </Dialog>
    </>
  )
}
