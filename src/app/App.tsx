import { useEffect, useRef } from 'react'
import {
  deckRepository,
  deriveTitle,
  openInitialDeck,
  startAutosave,
  startRenderSync,
  useSession,
} from '@/core/deck'
import { DeckMenu, ImportControl } from '@/features/decks'
import { Editor } from '@/features/editor'
import { ExportButton, PrintRoot } from '@/features/export'
import { PresentButton, PresentMode } from '@/features/present'
import { PreviewPane } from '@/features/preview'
import { ThemeStyle } from '@/shared/slide-view'
import { SplitPane } from '@/shared/split-pane'
import styles from './App.module.css'
import { NoticeBar } from './NoticeBar'

export function App() {
  const deckId = useSession((state) => state.deckId)
  const title = useSession((state) => deriveTitle(state.text))
  const mode = useSession((state) => state.mode)
  const css = useSession((state) => state.rendered?.css ?? '')
  const opened = useRef(false)

  useEffect(() => {
    const stopRender = startRenderSync(useSession)
    const stopAutosave = startAutosave(useSession, deckRepository)
    // React StrictMode runs effects twice in development; open the initial deck only once.
    if (!opened.current) {
      opened.current = true
      void openInitialDeck(deckRepository)
    }
    return () => {
      stopRender()
      stopAutosave()
    }
  }, [])

  return (
    <>
      <ThemeStyle css={css} />
      <div id="app-shell" className={styles.shell}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.actions}>
            <DeckMenu />
            <ImportControl />
            <ExportButton />
            <PresentButton />
          </div>
        </header>
        <NoticeBar />
        <main className={styles.main}>
          {deckId === null ? (
            <p className={styles.loading}>Opening your decks...</p>
          ) : (
            <SplitPane
              label="Resize the editor and preview"
              start={<Editor key={deckId} />}
              end={<PreviewPane />}
            />
          )}
        </main>
      </div>
      <PrintRoot />
      {mode === 'present' && <PresentMode />}
    </>
  )
}
