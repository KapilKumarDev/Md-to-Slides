# Markdown Slides

Write Markdown, see slides live, present them, and export a PDF. Everything runs in your browser; decks are saved locally.

## Using it

- Start a new slide with a line containing `---`.
- A slide that is too tall for the screen continues on the next one automatically: lists, tables, code and quotes break between items, long paragraphs between words, and the slide's heading repeats on each page. Content that can't be split, such as a very tall image, is listed as a warning under the preview. Page numbers, headers and footers follow the pages.
- Put speaker notes in an HTML comment: `<!-- say hello -->`. Directives such as `<!-- paginate: true -->` work too (Marp syntax). A comment written like a directive that Marp does not recognize is listed as a warning under the preview.
- **Import** a `.md` or `.markdown` file with the button or by dropping it on the window. You choose each time whether it becomes a new deck or replaces the current one; Replace can be undone.
- **Present** runs the deck fullscreen. Arrow keys, Space and Enter navigate; Home and End jump; `P` toggles the presenter view; Escape exits.
- **Export PDF** opens your browser's print dialog. Choose **Save as PDF** as the destination. This keeps text selectable and graphics sharp.

## Developing

```bash
npm install
npm run dev          # local dev server
npm run check        # lint, typecheck, unused-code check, unit tests
npx playwright install chromium   # first time only
npm run test:e2e     # end-to-end tests in Chromium
```

## Structure

Imports flow one way: `app` to `features` to `core`, with `shared` UI available to both.

- `src/core/engine`: the only code that touches Marp. `render(markdown)` returns slides, theme CSS, notes, line ranges and warnings. It also paginates: it measures each slide in a hidden copy of the page and splits what overflows. Pass a different `fits` function to `render` to test pagination without a browser.
- `src/core/deck`: the session store, render sync, autosave and the `DeckRepository` interface.
- `src/features/*`: editor, preview, present, export, decks. Features never import each other; they share state through `core/deck`.
- `src/shared`: slide view, split pane, button, dialog.

ESLint enforces these boundaries, and Knip fails the build on unused files, exports or dependencies.

## Adding a backend later

- Implement `DeckRepository` and change the one line in `src/core/deck/deckRepository.ts`.
- For a one-click PDF download instead of the print dialog, replace `exportPdf` in `src/features/export` with a call to a server renderer.