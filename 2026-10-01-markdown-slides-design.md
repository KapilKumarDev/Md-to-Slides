# Markdown Slides: Design Spec

Date: 2026-10-01
Status: Awaiting user review

## 1. Purpose and scope

A client-only web app that converts Markdown into slides. The user writes Markdown in an editor, sees a live preview, presents the deck, and exports it as PDF.

**In scope (first build):** editor, live preview, thumbnail rail, present mode with presenter view, `.md` file import, PDF export, local deck storage.

**Out of scope (first build):** PPTX export, standalone HTML export, accounts, cloud storage, collaboration, server-side rendering.

**Success criteria:**
- Typing Markdown updates the preview without perceptible lag.
- Present mode runs fullscreen with keyboard navigation and a presenter view (current slide, next slide, notes, timer).
- A `.md` or `.markdown` file can be imported by file picker or drag-and-drop, and the user chooses each time whether it becomes a new deck or replaces the current deck's text.
- Exported PDF has one 16:9 slide per page, selectable text and vector graphics.
- Adding a backend later requires new implementations of two interfaces and no UI changes.

## 2. Decisions

| Decision | Choice | Reason |
|---|---|---|
| Form | Web app | User choice |
| Export | PDF only | User choice (PPTX and HTML dropped) |
| Hosting | Client-only, backend-ready | User choice |
| Engine | Marp Core | Already handles Markdown to paginated slide HTML, themes, directives and notes; avoids reinventing |
| Stack | React, Vite, TypeScript, CodeMirror 6, Zustand | General mainstream stack |
| Structure | Feature-based layers | Research: scales, enforceable by lint |
| PDF method | Browser print engine with a 16:9 `@page` size | Print-accurate, no extra dependency, works client-only |

## 3. Architecture

Imports flow in one direction only: `app` to `features` to `core`.

```
src/
  app/                 shell, providers, composes features into the workspace
  features/
    editor/            CodeMirror editor, cursor-to-slide sync
    preview/           slide canvas, thumbnail rail
    present/           fullscreen mode, presenter view
    export/            exportPdf, print stylesheet
    decks/             deck list, open, save UI, .md import (picker, drag-and-drop, choice dialog)
  core/
    engine/            Marp adapter
    deck/              types, DeckRepository interface, localStorage implementation, session store
  styles/              design tokens as CSS variables
```

### Units and interfaces

- **`core/engine`** exports `render(markdown): RenderResult`, where `RenderResult` holds slide HTML per slide, theme CSS, speaker notes per slide, slide count and per-slide source line ranges. This is the only module that imports Marp.
- **`core/deck`** exports the `Deck` type, the `DeckRepository` interface (`list`, `get`, `save`, `delete`), a localStorage implementation, and the session store (deck text, active slide index, mode).
- **`features/export`** exports `exportPdf(renderResult)`. It applies the print stylesheet and invokes the browser print dialog.
- **Features** each expose a single `index.ts` public API. `app/` composes them.

### Data flow

1. The user types in the editor.
2. The session store updates the deck text.
3. A debounced call to `render` produces a `RenderResult`.
4. The preview, thumbnail rail, present mode and export all consume that same `RenderResult`, so they cannot drift apart.
5. Autosave writes the deck through `DeckRepository`, debounced.

### UI behavior

- Workspace: editor left, preview right, resizable divider, thumbnail rail.
- Cursor position selects the active slide; clicking a slide moves the editor cursor to its first line.
- Present: one click to fullscreen; arrow keys, space, Home, End navigate; Esc exits. Presenter view shows current slide, next slide, notes and elapsed timer.
- Import: an Import button (file picker) and drag-and-drop onto the workspace accept `.md` and `.markdown` files. The browser File API reads the text; no upload occurs. A dialog then asks each time: **New deck**, **Replace current deck**, or **Cancel**. New deck saves the file as a separate deck through `DeckRepository` and opens it. Replace overwrites the current deck's text as a single editor transaction, so undo restores the previous text. The imported text then follows the normal data flow through `render`.
- Export PDF: one button that opens the print dialog with a slide-sized page.

## 4. Rules enforced by tooling

- ESLint `no-restricted-imports` blocks feature-to-feature imports and imports that bypass a feature's `index.ts`.
- Only `core/engine` may import Marp.
- TypeScript strict mode.
- ESLint and Prettier on every change.
- Knip fails the build on unused files, exports or dependencies (no dead code).
- CSS Modules plus token variables; no inline styles.
- No duplicated logic; shared behavior lives in `core` or a shared module, not copied.

## 5. Error handling

- Render failure: keep the last good preview and show an inline error.
- Invalid directive: flag it on the affected line.
- Storage full or unavailable: visible notice; the in-memory deck stays intact and the user can still export.
- Print blocked or unsupported: visible message explaining the limitation.
- Import failure: a visible message for unreadable files, files that are not text, or unsupported extensions. The current deck is never modified until the user confirms New deck or Replace.

## 6. Testing

- Unit (Vitest): engine adapter, deck repository, session store, import file reader (accepts `.md` and `.markdown`, rejects other types and unreadable files).
- Component (Vitest plus Testing Library): editor-to-preview sync, thumbnail navigation, present-mode keyboard handling, import choice dialog (New deck, Replace, Cancel, and that Cancel changes nothing).
- End-to-end (Playwright): write Markdown, present it, and verify the print layout has one slide per page; import a file via picker and via drag-and-drop, and confirm both choices behave correctly, including undo after Replace.

## 7. Known limitation and risk

- **PDF dialog:** client-only PDF goes through the browser's "Save as PDF" dialog, not a silent one-click download. A true one-click download requires a server renderer, which the `exportPdf` seam allows later.
- **Marp in the browser:** the first implementation task must confirm that Marp Core renders fully client-side and prints cleanly to a 16:9 PDF. If it fails either check, stop and return to design review before continuing; the fallback is a custom unified/remark pipeline behind the same `render` interface, so no other module changes.

## 8. Visual design

Visual direction (typography, color tokens, layout polish) is defined during planning using the frontend-design skill. A taste skill was requested but was not available in this session; the user may supply it before planning.
