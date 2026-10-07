# Markdown Slides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-only web app where a user writes or imports Markdown, sees live slides, presents them, and exports a PDF.

**Architecture:** Marp Core renders Markdown to per-slide HTML, theme CSS, speaker notes and source line ranges behind one `render()` function. One Zustand session store holds the deck text and UI state, and a single render coordinator feeds every consumer (preview, thumbnails, present mode, PDF print root). Features never import each other; they communicate through `core/deck`, and ESLint enforces the boundaries.

**Tech Stack:** React, Vite, TypeScript (strict), Zustand, `@marp-team/marp-core`, CodeMirror 6, CSS Modules, Vitest + Testing Library (jsdom), Playwright (Chromium), ESLint, Prettier, Knip.

**Spec:** `docs/superpowers/specs/2026-10-01-markdown-slides-design.md`

**Process note:** The user's required workflow is Research, Plan, Design, Implement, Test, Fix, Repeat, Present. Research and design are done (spec plus the Visual Direction below). Every task is implement, test, fix in a loop. Task 12 is the present step.

## Global Constraints

Copied from the spec; every task implicitly includes these.

- Export is **PDF only** in this build (no PPTX, no standalone HTML).
- The app is **client-only**; decks are saved in the browser, behind the `DeckRepository` interface.
- Imports flow in one direction only: `app` to `features` to `core`. (`shared` is the shared-module layer the spec allows; it may be imported by `app` and `features`, and may import nothing above itself.)
- Only `core/engine` may import Marp.
- TypeScript strict mode. ESLint and Prettier on every change.
- Knip fails the build on unused files, exports or dependencies (no dead code).
- CSS Modules plus token variables; **no inline styles** (no `style=` attributes in our own components).
- No duplicated logic; shared behavior lives in `core` or `shared`, not copied.
- Imported `.md` files: the user chooses each time between **New deck**, **Replace current deck** and **Cancel**; Replace is one editor transaction so undo restores the old text.
- Client-only PDF goes through the browser print dialog (a 16:9 `@page`, one slide per page).

**Interpretations the plan makes where the spec is silent** (call out at review if wrong):
- Line numbers inside `core` are **0-based**; CodeMirror's 1-based lines are converted at the editor boundary only.
- The presenter view is a **same-window toggle** (key `P`), not a second synced window.
- "Flag an invalid directive on the affected line" is realized as a **clickable warning** in the preview pane that jumps the editor to that line, for comments written like directives (`<!-- key: value -->`) that Marp left in the speaker notes. Marp exposes no validity report, so this is the reliable signal.
- Import size limit: 2 MB.

## Review Focus

Failure modes the spec implies that are most likely to bite someone using the app. Each has a test in the task named in brackets.

1. **Windows line endings or a BOM in an imported file** should give the same slides and line ranges as a clean file. [Task 2 CRLF test, Task 10 BOM test]
2. **Raw HTML or `<script>` in Markdown** must never execute or reach the page as live script. [Task 2 sanitization test]
3. **Browser storage unavailable, full or corrupted** must show a message and leave the in-memory deck working. [Task 3 tests, Task 4 autosave failure test]
4. **Switching decks inside the autosave delay** must not lose the last edits. [Task 4 flush test]
5. **Empty deck, zero slides, or a single slide** must not crash preview or present mode, must not allow an empty export, and must not step out of range. [Task 7 empty-state test, Task 8 single-slide test, Task 9 export test]

## Visual Direction

Applied from the frontend-design skill. A taste skill was not available in this session; if the user supplies one, revisit this section before Task 5.

**Subject and job:** a writing tool for people turning notes into talks. The slides are the content, so the interface stays quiet and the slide gets the one memorable treatment.

**Palette (named, with contrast checked against body text):**
- Lightbox `#E3E9EB`: the workspace surround, a cool pale grey-blue like a photographer's lightbox.
- Mount `#F6F7F5`: panels and slide mounts.
- Ink `#14282E`: text and the present-mode surround.
- Ink soft `#46585E`: secondary text.
- Viridian `#17705F`: the single accent (primary buttons, active slide, focus ring). Contrast on Mount is 5.4:1.
- Hairline `#B9C4C8`: borders.
- Rust `#B3402A`: errors only.

**Type:** Hanken Grotesk (UI, 400 and 600) and IBM Plex Mono (the editor only, where fixed width carries meaning). Self-hosted through Fontsource, no CDN. Sentence case everywhere, no all-caps labels.

**Layout:** header, then a split of editor and preview; the thumbnail rail sits inside the preview pane.

```
+----------------------------------------------------------------+
| Deck title            Decks  Import  Export PDF   [ Present ]   |
+----------------------------------------------------------------+
| editor (mono)               : +--rail--+  /-------------------\ |
| # Title                     : | [1]    |  |  mounted slide    | |
| ---                         : | [2] *  |  |                   | |
| ## Next slide               : | [3]    |  \-------------------/ |
+----------------------------------------------------------------+
```

**Principles:**
- **The memorable thing is the slide mount.** The preview shows the active slide in a mount with one clipped corner, like a 35 mm slide; the active thumbnail's mount turns viridian. Everything else is flat and plain.
- No cards, gradients, shadows beyond one soft shadow under the mount, or decorative motion. Motion exists only where the user acts (button feedback), and reduced-motion is respected.
- Words are plain verbs and say what happens: "Export PDF", "Replace current deck". Errors say what went wrong and what to do, without apology.
- Quality floor: visible keyboard focus everywhere, layout stacks vertically under 760 px, color contrast at least 4.5:1 for text.

**Review against the brief:** the first pass was a near-black workspace with a single bright accent, which is one of the common defaults. It was replaced with the pale lightbox surround because slides are judged by their own colors and a neutral light surround shows them accurately.

## File Structure

```
markdown-slides/
  e2e/app.spec.ts
  eslint.boundaries.js
  knip.json
  playwright.config.ts
  src/
    main.tsx
    app/            App.tsx, App.module.css, NoticeBar.tsx (+css, tests)
    features/
      editor/       Editor.tsx, Editor.module.css, index.ts
      preview/      PreviewPane.tsx, ThumbnailRail.tsx, *.module.css, index.ts
      present/      PresentMode.tsx, PresentButton.tsx, enterPresent.ts, useElapsed.ts, index.ts
      export/       exportPdf.ts, ExportButton.tsx, PrintRoot.tsx, index.ts
      decks/        DeckMenu.tsx, ImportControl.tsx, readMarkdownFile.ts, *.module.css, index.ts
    core/
      engine/       types.ts, render.ts, warnings.ts, slideIndex.ts, index.ts
      deck/         deck.ts, repository.ts, localStorageRepository.ts, deckRepository.ts,
                    errors.ts, starter.ts, session.ts, sync.ts, open.ts, index.ts
    shared/
      slide-view/   SlideView.tsx, ThemeStyle.tsx, SlideView.module.css, index.ts
      split-pane/   SplitPane.tsx, SplitPane.module.css, index.ts
      button/       Button.tsx, Button.module.css, index.ts
      dialog/       Dialog.tsx, Dialog.module.css, index.ts
    styles/         tokens.css, global.css, print.css
    test/           setup.ts
```

Each source file has a co-located `*.test.ts(x)` where it contains logic.

---

### Task 1: Project scaffold, tooling and boundary lint

**Files:**
- Create: `markdown-slides/` (Vite project), `eslint.boundaries.js`, `.prettierrc`, `.prettierignore`, `knip.json`, `src/test/setup.ts`, `src/styles/tokens.css`, `src/styles/global.css`, `src/app/App.module.css`
- Modify: `package.json` (scripts), `vite.config.ts`, `tsconfig.app.json`, `eslint.config.js`, `index.html`, `src/main.tsx`
- Create: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: alias `@/` mapping to `src/`; npm scripts `lint`, `typecheck`, `test`, `knip`, `check`, `test:e2e`; lint rules that block cross-feature imports, deep imports into features, and Marp imports outside `core/engine`; token CSS variables `--color-lightbox`, `--color-mount`, `--color-ink`, `--color-ink-soft`, `--color-viridian`, `--color-hairline`, `--color-rust`, `--font-ui`, `--font-mono`, `--shadow-mount`.

- [ ] **Step 1: Scaffold the project**

```bash
npm create vite@latest markdown-slides -- --template react-ts
cd markdown-slides
git init
rm -rf src/assets src/App.css src/App.tsx src/index.css public/vite.svg
```

If the generator asks about experimental bundlers or "install and start now", decline both. Keep whatever lint and TypeScript settings the template generated (for example `erasableSyntaxOnly`); the changes below are additive.

- [ ] **Step 2: Install dependencies**

```bash
npm install zustand @marp-team/marp-core @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/lang-markdown @fontsource/hanken-grotesk @fontsource/ibm-plex-mono
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom @playwright/test pdf-lib knip prettier eslint-config-prettier
```

Use the latest releases npm resolves; do not pin old versions. Record nothing by hand, `package.json` is the record.

- [ ] **Step 3: Configure Vite, Vitest and the alias**

Replace `vite.config.ts` (keep the React plugin import the template used if it differs):

```ts
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: true,
  },
})
```

In `tsconfig.app.json`, inside `compilerOptions`, add the path alias and test types (merge with existing `types`):

```json
"paths": { "@/*": ["./src/*"] },
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
```

Also make sure `compilerOptions.lib` includes `"ES2023"` (the engine uses `Array.prototype.findLastIndex`) alongside `"DOM"` and `"DOM.Iterable"`.

In `index.html`, set `<title>Markdown Slides</title>` and delete the `<link rel="icon" ...>` line.

- [ ] **Step 4: Add the boundary lint rules**

Create `eslint.boundaries.js`:

```js
const features = ['editor', 'preview', 'present', 'export', 'decks']

const featurePatterns = (names) =>
  names.flatMap((name) => [`@/features/${name}`, `@/features/${name}/*`])

const rule = (...patterns) => ({ 'no-restricted-imports': ['error', { patterns }] })

const marp = { group: ['@marp-team/*'], message: 'Only src/core/engine may import Marp.' }
const noApp = { group: ['@/app', '@/app/*'], message: 'Only src/app composes features.' }
const noShared = { group: ['@/shared', '@/shared/*'], message: 'core must not depend on shared UI.' }
const noFeatures = (message) => ({ group: featurePatterns(features), message })

export const boundaries = [
  ...features.map((name) => ({
    files: [`src/features/${name}/**/*.{ts,tsx}`],
    rules: rule(
      {
        group: featurePatterns(features.filter((other) => other !== name)),
        message: 'Features must not import other features. Share state through @/core/deck.',
      },
      noApp,
      marp,
    ),
  })),
  {
    files: ['src/app/**/*.{ts,tsx}'],
    rules: rule(
      { group: ['@/features/*/*'], message: 'Import features only through their index.ts.' },
      marp,
    ),
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: rule(noFeatures('shared must not import features.'), noApp, marp),
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: rule(noFeatures('core must not import features.'), noApp, noShared, marp),
  },
  {
    // Declared after the core block so it wins for these files: engine may import Marp.
    files: ['src/core/engine/**/*.{ts,tsx}'],
    rules: rule(noFeatures('core must not import features.'), noApp, noShared),
  },
]
```

Open the generated `eslint.config.js`. Add `import { boundaries } from './eslint.boundaries.js'` and `import prettier from 'eslint-config-prettier'` at the top, then add `...boundaries,` and `prettier,` as the last two entries of the exported config array. Leave the template's own entries untouched.

- [ ] **Step 5: Add Prettier, Knip and scripts**

`.prettierrc`:

```json
{ "singleQuote": true, "semi": false, "printWidth": 100 }
```

`.prettierignore`:

```
dist
coverage
playwright-report
test-results
package-lock.json
```

`knip.json`:

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "entry": ["src/main.tsx"],
  "project": ["src/**/*.{ts,tsx}", "e2e/**/*.ts"]
}
```

```bash
npm pkg set scripts.lint="eslint ." scripts.typecheck="tsc -b" scripts.format="prettier --write ." scripts.test="vitest run" scripts.knip="knip" scripts.test:e2e="playwright test" scripts.check="npm run lint && npm run typecheck && npm run knip && npm run test"
printf "\nplaywright-report\ntest-results\n" >> .gitignore
```

- [ ] **Step 6: Add the test setup**

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'

afterEach(() => {
  localStorage.clear()
})

// jsdom does not implement the modal methods of <dialog>.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
}

// CodeMirror measures text through Range geometry, which jsdom does not provide.
const emptyRect = {
  x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, toJSON: () => ({}),
} as DOMRect
Range.prototype.getBoundingClientRect ??= () => emptyRect
Range.prototype.getClientRects ??= () =>
  ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList

// Some jsdom versions lack Blob.text().
Blob.prototype.text ??= function text(this: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(this)
  })
}
```

- [ ] **Step 7: Write the failing smoke test**

`src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { App } from './App'

it('renders the app heading', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Markdown Slides' })).toBeInTheDocument()
})
```

- [ ] **Step 8: Run it to verify it fails**

Run: `npx vitest run src/app/App.test.tsx`
Expected: FAIL (cannot resolve `./App`).

- [ ] **Step 9: Implement the shell, tokens and entry**

`src/styles/tokens.css`:

```css
:root {
  --color-lightbox: #e3e9eb;
  --color-mount: #f6f7f5;
  --color-ink: #14282e;
  --color-ink-soft: #46585e;
  --color-viridian: #17705f;
  --color-hairline: #b9c4c8;
  --color-rust: #b3402a;
  --shadow-mount: 0 1px 3px rgb(20 40 46 / 0.28);
  --font-ui: 'Hanken Grotesk', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  --radius: 3px;
}
```

`src/styles/global.css`:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background: var(--color-lightbox);
  color: var(--color-ink);
  font-family: var(--font-ui);
  line-height: 1.5;
}

button {
  font: inherit;
}

:focus-visible {
  outline: 2px solid var(--color-viridian);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

`src/app/App.module.css`:

```css
.shell {
  padding: 24px;
}

.title {
  margin: 0;
  font-size: 1.25rem;
}
```

`src/app/App.tsx`:

```tsx
import styles from './App.module.css'

export function App() {
  return (
    <main className={styles.shell}>
      <h1 className={styles.title}>Markdown Slides</h1>
    </main>
  )
}
```

`src/main.tsx`:

```tsx
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@/styles/tokens.css'
import '@/styles/global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 10: Run the smoke test to verify it passes**

Run: `npx vitest run src/app/App.test.tsx`
Expected: PASS.

- [ ] **Step 11: Prove the boundary lint works, then remove the probes**

```bash
mkdir -p src/features/editor src/features/preview src/shared
printf "import '@/features/preview'\n" > src/features/editor/probe.ts
printf "import '@marp-team/marp-core'\n" > src/shared/probe.ts
npx eslint src/features/editor/probe.ts src/shared/probe.ts
```

Expected: two errors, one containing "Features must not import other features" and one containing "Only src/core/engine may import Marp". If either file passes lint, fix `eslint.boundaries.js` or how it is spread into `eslint.config.js` before continuing.

```bash
rm src/features/editor/probe.ts src/shared/probe.ts
rmdir src/features/editor src/features/preview src/features src/shared
```

- [ ] **Step 12: Run the full check and commit**

Run: `npm run lint && npm run typecheck && npm run test`
Expected: all pass. (Skip `npm run knip` until Task 12; unused exports are expected while the app is incomplete.)

```bash
git add -A
git commit -m "chore: scaffold Vite React app with tooling and boundary lint"
```

### Task 2: Engine adapter (Marp Core behind `render()`)

**Files:**
- Create: `src/core/engine/types.ts`, `src/core/engine/render.ts`, `src/core/engine/warnings.ts`, `src/core/engine/slideIndex.ts`, `src/core/engine/index.ts`
- Test: `src/core/engine/render.test.ts`, `src/core/engine/slideIndex.test.ts`

**Interfaces:**
- Consumes: `@marp-team/marp-core` (`new Marp(...)`, `marp.render(markdown, { htmlAsArray: true })` returning `{ html: string[], css: string, comments: string[][] }`).
- Produces (all other tasks rely on these exact names):
  - `type RenderedSlide = { html: string; notes: string[]; lineRange: { start: number; end: number } }` (0-based, inclusive lines)
  - `type RenderResult = { css: string; slides: RenderedSlide[]; warnings: { line: number; message: string }[] }`
  - `render(markdown: string): RenderResult`
  - `slideIndexForLine(slides: RenderedSlide[], line: number): number`

This task also settles spec section 7's first gate: Marp Core must run in a browser-like DOM. If any test in this task cannot pass because Marp Core fails to load or render in jsdom, **stop and return to design review**; do not work around it.

- [ ] **Step 1: Write the failing tests**

`src/core/engine/render.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { render } from './render'

describe('render', () => {
  it('splits slides on horizontal rules', () => {
    const { slides } = render('# A\n\n---\n\n# B')
    expect(slides).toHaveLength(2)
    expect(slides[0]?.html).toContain('A')
    expect(slides[1]?.html).toContain('B')
  })

  it('returns the theme css', () => {
    expect(render('# A').css.length).toBeGreaterThan(0)
  })

  it('collects html comments as speaker notes', () => {
    const { slides } = render('# A\n\n<!-- remember the demo -->\n')
    expect(slides[0]?.notes).toEqual([expect.stringContaining('remember the demo')])
  })

  it('does not treat known directives as notes', () => {
    const { slides } = render('<!-- backgroundColor: black -->\n\n# A\n')
    expect(slides[0]?.notes).toEqual([])
  })

  it('reports 0-based inclusive line ranges per slide', () => {
    const { slides } = render('# A\n\n---\n\n# B\n')
    expect(slides.map((slide) => slide.lineRange)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 5 },
    ])
  })

  it('does not create a slide for front matter', () => {
    const { slides } = render('---\ntheme: default\n---\n\n# A\n')
    expect(slides).toHaveLength(1)
    expect(slides[0]?.lineRange.start).toBe(0)
  })

  it('gives the same slides and line ranges for CRLF line endings', () => {
    const lf = render('# A\n\n---\n\n# B\n')
    const crlf = render('# A\r\n\r\n---\r\n\r\n# B\r\n')
    expect(crlf.slides).toHaveLength(2)
    expect(crlf.slides.map((slide) => slide.lineRange)).toEqual(
      lf.slides.map((slide) => slide.lineRange),
    )
  })

  it('never emits script tags or javascript: links', () => {
    const { slides } = render('<script>alert(1)</script>\n\n[x](javascript:alert(1))\n')
    const html = slides.map((slide) => slide.html).join('')
    expect(html).not.toMatch(/<script/i)
    expect(html).not.toMatch(/href="javascript:/i)
  })

  it('does not throw on empty markdown', () => {
    expect(() => render('')).not.toThrow()
  })
})

describe('directive warnings', () => {
  it('leaves an unrecognized directive-style comment in the speaker notes', () => {
    // This pins the Marp behavior the warning feature relies on.
    const { slides } = render('# A\n\n<!-- unknownkey: value -->\n')
    expect(slides[0]?.notes).toEqual([expect.stringContaining('unknownkey: value')])
  })

  it('warns, with a 0-based line, about a comment that looks like a directive but is not one', () => {
    const { warnings } = render('# A\n\n<!-- paginate: true -->\n\n<!-- TODOO: fix -->\n')
    expect(warnings).toHaveLength(1)
    expect(warnings[0]?.line).toBe(4)
    expect(warnings[0]?.message).toContain('TODOO')
  })

  it('does not warn about recognized directives or plain notes', () => {
    const { warnings } = render('# A\n\n<!-- paginate: true -->\n\n<!-- say hello -->\n')
    expect(warnings).toEqual([])
  })
})
```

`src/core/engine/slideIndex.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { slideIndexForLine } from './slideIndex'
import type { RenderedSlide } from './types'

const slide = (start: number, end: number): RenderedSlide => ({
  html: '',
  notes: [],
  lineRange: { start, end },
})

describe('slideIndexForLine', () => {
  const slides = [slide(0, 3), slide(4, 9), slide(10, 12)]

  it.each([
    [0, 0],
    [3, 0],
    [4, 1],
    [9, 1],
    [12, 2],
    [99, 2],
  ])('maps line %i to slide %i', (line, expected) => {
    expect(slideIndexForLine(slides, line)).toBe(expected)
  })

  it('returns 0 when there are no slides', () => {
    expect(slideIndexForLine([], 5)).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/core/engine`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/core/engine/types.ts`:

```ts
export interface RenderedSlide {
  html: string
  notes: string[]
  /** 0-based, inclusive source lines belonging to this slide. */
  lineRange: { start: number; end: number }
}

export interface RenderResult {
  css: string
  slides: RenderedSlide[]
  warnings: { line: number; message: string }[]
}
```

`src/core/engine/slideIndex.ts`:

```ts
import type { RenderedSlide } from './types'

export function slideIndexForLine(slides: RenderedSlide[], line: number): number {
  return Math.max(0, slides.findLastIndex((slide) => slide.lineRange.start <= line))
}
```

`src/core/engine/warnings.ts`:

```ts
import type { RenderedSlide } from './types'

// Marp keeps `<!-- key: value -->` out of the notes only when it recognizes the key.
// A note that still looks like `key: value` was written as a directive but was not applied.
const DIRECTIVE_LIKE = /^[A-Za-z][\w-]*:[ \t]+\S/

export function findUnrecognizedDirectives(markdown: string, slides: RenderedSlide[]) {
  const lines = markdown.split('\n')
  return slides.flatMap((slide) =>
    slide.notes.flatMap((note) => {
      const trimmed = note.trim()
      if (!DIRECTIVE_LIKE.test(trimmed)) return []
      const line = lines.findIndex(
        (text, index) =>
          index >= slide.lineRange.start && index <= slide.lineRange.end && text.includes(trimmed),
      )
      if (line === -1) return []
      const key = trimmed.slice(0, trimmed.indexOf(':'))
      return [
        {
          line,
          message: `"${key}" looks like a directive, but Marp doesn't recognize it. It is treated as a speaker note.`,
        },
      ]
    }),
  )
}
```

`src/core/engine/render.ts`:

```ts
import { Marp } from '@marp-team/marp-core'
import type { RenderResult, RenderedSlide } from './types'
import { findUnrecognizedDirectives } from './warnings'

// `script: false` keeps Marp from emitting a browser <script>; HTML stays on Marp's allowlist.
const marp = new Marp({ script: false })

// Marpit's slide tokens carry the source line where each slide starts. Capture them in
// the same parse that produces the HTML, so the app never parses a deck twice.
let slideStartLines: number[] = []
marp.use((md: Marp['markdown']) => {
  md.core.ruler.push('slide_start_lines', (state) => {
    slideStartLines = state.tokens
      .filter((token) => token.type === 'marpit_slide_open')
      .map((token) => token.map?.[0] ?? 0)
  })
})

export function render(markdown: string): RenderResult {
  const { html, css, comments } = marp.render(markdown, { htmlAsArray: true })
  const pages = Array.isArray(html) ? html : [html]
  const lastLine = markdown.split('\n').length - 1

  const slides: RenderedSlide[] = pages.map((page, index) => {
    const nextStart = slideStartLines[index + 1]
    return {
      html: page,
      notes: comments[index] ?? [],
      lineRange: {
        start: index === 0 ? 0 : (slideStartLines[index] ?? 0),
        end: nextStart === undefined ? lastLine : nextStart - 1,
      },
    }
  })

  return { css, slides, warnings: findUnrecognizedDirectives(markdown, slides) }
}
```

`src/core/engine/index.ts`:

```ts
export { render } from './render'
export { slideIndexForLine } from './slideIndex'
export type { RenderResult, RenderedSlide } from './types'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/core/engine`
Expected: PASS.

If the line-range test fails with different numbers, print `slideStartLines` inside `render` once and compare against Marpit's token maps (a slide after the first starts at its `---` rule line). Fix the code, not the expectation. If the "leaves an unrecognized directive-style comment in the speaker notes" test fails because Marp drops the comment instead, **stop and ask the user**: the directive-warning behavior in the spec cannot be built as planned, and the options are to drop it or define it differently.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/core/engine
git commit -m "feat(engine): render Markdown to slides with notes, line ranges and directive warnings"
```

---

### Task 3: Deck model and storage

**Files:**
- Create: `src/core/deck/deck.ts`, `src/core/deck/repository.ts`, `src/core/deck/localStorageRepository.ts`, `src/core/deck/deckRepository.ts`, `src/core/deck/errors.ts`
- Test: `src/core/deck/deck.test.ts`, `src/core/deck/localStorageRepository.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface Deck { id: string; title: string; text: string; updatedAt: number }`
  - `deriveTitle(text: string): string` (first Markdown heading, else `'Untitled deck'`)
  - `createDeck(text: string): Deck` (new id, derived title, `updatedAt` now)
  - `interface DeckRepository { list(): Promise<Deck[]>; get(id: string): Promise<Deck | null>; save(deck: Deck): Promise<void>; delete(id: string): Promise<void> }`
  - `class StorageError extends Error` (message is user-facing)
  - `class LocalStorageDeckRepository implements DeckRepository`
  - `deckRepository: DeckRepository` (the single swap point for a future backend)
  - `errorMessage(error: unknown): string`

- [ ] **Step 1: Write the failing tests**

`src/core/deck/deck.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createDeck, deriveTitle } from './deck'

describe('deriveTitle', () => {
  it.each([
    ['# Hello\n', 'Hello'],
    ['---\ntheme: default\n---\n\n## Talk title ##\n', 'Talk title'],
    ['no heading here', 'Untitled deck'],
    ['', 'Untitled deck'],
    ['# Windows title\r\n', 'Windows title'],
  ])('derives a title from %j', (text, title) => {
    expect(deriveTitle(text)).toBe(title)
  })
})

describe('createDeck', () => {
  it('creates a deck with a unique id, derived title and timestamp', () => {
    const a = createDeck('# One')
    const b = createDeck('# One')
    expect(a.id).not.toBe(b.id)
    expect(a.title).toBe('One')
    expect(a.text).toBe('# One')
    expect(a.updatedAt).toBeGreaterThan(0)
  })
})
```

`src/core/deck/localStorageRepository.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Deck } from './deck'
import { LocalStorageDeckRepository } from './localStorageRepository'
import { StorageError } from './repository'

const deck = (id: string, updatedAt: number): Deck => ({ id, title: id, text: `# ${id}`, updatedAt })

afterEach(() => vi.restoreAllMocks())

describe('LocalStorageDeckRepository', () => {
  it('lists decks newest first', async () => {
    const repo = new LocalStorageDeckRepository()
    await repo.save(deck('old', 1))
    await repo.save(deck('new', 2))
    expect((await repo.list()).map((d) => d.id)).toEqual(['new', 'old'])
  })

  it('gets, overwrites and deletes a deck', async () => {
    const repo = new LocalStorageDeckRepository()
    await repo.save(deck('a', 1))
    await repo.save({ ...deck('a', 2), text: 'changed' })
    expect((await repo.get('a'))?.text).toBe('changed')
    await repo.delete('a')
    expect(await repo.get('a')).toBeNull()
  })

  it('returns null for a missing deck', async () => {
    expect(await new LocalStorageDeckRepository().get('nope')).toBeNull()
  })

  it('rejects with a StorageError when storage is full', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    await expect(new LocalStorageDeckRepository().save(deck('a', 1))).rejects.toThrow(StorageError)
    await expect(new LocalStorageDeckRepository().save(deck('a', 1))).rejects.toThrow(/full/i)
  })

  it('rejects with a StorageError when storage is unavailable', async () => {
    const repo = new LocalStorageDeckRepository(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    await expect(repo.list()).rejects.toThrow(StorageError)
  })

  it('rejects with a StorageError when stored data is corrupted', async () => {
    localStorage.setItem('markdown-slides:decks', '{not json')
    await expect(new LocalStorageDeckRepository().list()).rejects.toThrow(StorageError)
    localStorage.setItem('markdown-slides:decks', '["array"]')
    await expect(new LocalStorageDeckRepository().list()).rejects.toThrow(StorageError)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/core/deck`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/core/deck/deck.ts`:

```ts
export interface Deck {
  id: string
  title: string
  text: string
  updatedAt: number
}

const UNTITLED = 'Untitled deck'
const HEADING = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m

export function deriveTitle(text: string): string {
  return HEADING.exec(text)?.[1]?.trim() || UNTITLED
}

export function createDeck(text: string): Deck {
  return { id: crypto.randomUUID(), title: deriveTitle(text), text, updatedAt: Date.now() }
}
```

`src/core/deck/repository.ts`:

```ts
import type { Deck } from './deck'

export interface DeckRepository {
  list(): Promise<Deck[]>
  get(id: string): Promise<Deck | null>
  save(deck: Deck): Promise<void>
  delete(id: string): Promise<void>
}

/** The message is written for the person using the app. */
export class StorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'StorageError'
  }
}
```

`src/core/deck/localStorageRepository.ts`:

```ts
import type { Deck } from './deck'
import { StorageError, type DeckRepository } from './repository'

const KEY = 'markdown-slides:decks'

type DeckMap = Record<string, Deck>

export class LocalStorageDeckRepository implements DeckRepository {
  private readonly getStorage: () => Storage

  constructor(getStorage: () => Storage = () => window.localStorage) {
    this.getStorage = getStorage
  }

  private read(): DeckMap {
    try {
      const raw = this.getStorage().getItem(KEY)
      if (!raw) return {}
      const parsed: unknown = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new TypeError('Unexpected storage shape')
      }
      return parsed as DeckMap
    } catch (cause) {
      throw new StorageError(
        'Saved decks could not be read. Check that your browser allows site storage.',
        { cause },
      )
    }
  }

  private write(decks: DeckMap): void {
    try {
      this.getStorage().setItem(KEY, JSON.stringify(decks))
    } catch (cause) {
      throw new StorageError(
        'Your changes could not be saved because browser storage is full or unavailable. You can still export a PDF.',
        { cause },
      )
    }
  }

  async list(): Promise<Deck[]> {
    return Object.values(this.read()).sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async get(id: string): Promise<Deck | null> {
    return this.read()[id] ?? null
  }

  async save(deck: Deck): Promise<void> {
    this.write({ ...this.read(), [deck.id]: deck })
  }

  async delete(id: string): Promise<void> {
    this.write(Object.fromEntries(Object.entries(this.read()).filter(([key]) => key !== id)))
  }
}
```

`src/core/deck/deckRepository.ts`:

```ts
import { LocalStorageDeckRepository } from './localStorageRepository'
import type { DeckRepository } from './repository'

/** The one place that chooses where decks live. A backend replaces this line. */
export const deckRepository: DeckRepository = new LocalStorageDeckRepository()
```

`src/core/deck/errors.ts`:

```ts
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/core/deck`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/core/deck
git commit -m "feat(deck): deck model and localStorage repository behind DeckRepository"
```

---

### Task 4: Session store, render sync, autosave and deck opening

**Files:**
- Create: `src/core/deck/session.ts`, `src/core/deck/sync.ts`, `src/core/deck/open.ts`, `src/core/deck/starter.ts`, `src/core/deck/index.ts`
- Test: `src/core/deck/session.test.ts`, `src/core/deck/sync.test.ts`, `src/core/deck/open.test.ts`

**Interfaces:**
- Consumes: `render`, `slideIndexForLine`, `RenderResult` from `@/core/engine`; `Deck`, `createDeck`, `deriveTitle`, `errorMessage`, `DeckRepository`, `StorageError` from Task 3.
- Produces (the public surface of `@/core/deck`):
  - `useSession` (Zustand hook with `getState`, `setState`, `subscribe`, `getInitialState`) whose state is:
    `{ deckId: string | null; text: string; cursorLine: number; rendered: RenderResult | null; renderError: string | null; mode: 'edit' | 'present'; notice: { kind: 'error' | 'info'; message: string } | null; editorRequest: { type: 'jump'; line: number } | { type: 'replace'; text: string } | null }`
    and actions `loadDeck(deck)`, `setText(text)`, `setCursorLine(line)`, `setRendered(result)`, `setRenderError(message)`, `setMode(mode)`, `setNotice(notice | null)`, `requestJump(line)`, `requestReplace(text)`, `clearEditorRequest()`
  - `selectActiveSlide(state): number` (slide containing `cursorLine`)
  - `selectHasSlides(state): boolean` (true when at least one slide is rendered)
  - `startRenderSync(store, renderFn?, delayMs?): () => void`
  - `startAutosave(store, repository, delayMs?): () => void`
  - `openInitialDeck(repository): Promise<void>`, `openNewDeck(text, repository): Promise<void>`
  - re-exports: `deckRepository`, `deriveTitle`, `errorMessage`, `type Deck`

- [ ] **Step 1: Write the failing tests**

`src/core/deck/session.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import type { RenderResult } from '@/core/engine'
import { selectActiveSlide, selectHasSlides, useSession } from './session'

const slides = (...starts: number[]): RenderResult => ({
  css: '',
  warnings: [],
  slides: starts.map((start, i) => ({
    html: '',
    notes: [],
    lineRange: { start, end: (starts[i + 1] ?? 100) - 1 },
  })),
})

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('session store', () => {
  it('loads a deck and resets editor state', () => {
    useSession.getState().setCursorLine(9)
    useSession.getState().setMode('present')
    useSession.getState().loadDeck({ id: 'a', title: 'A', text: '# A', updatedAt: 1 })
    const state = useSession.getState()
    expect([state.deckId, state.text, state.cursorLine, state.mode]).toEqual(['a', '# A', 0, 'edit'])
  })

  it('clears a render error when a render succeeds', () => {
    useSession.getState().setRenderError('boom')
    useSession.getState().setRendered(slides(0))
    expect(useSession.getState().renderError).toBeNull()
  })

  it('selects the slide that contains the cursor line', () => {
    useSession.getState().setRendered(slides(0, 4, 10))
    useSession.getState().setCursorLine(5)
    expect(selectActiveSlide(useSession.getState())).toBe(1)
  })

  it('selects slide 0 before anything is rendered', () => {
    expect(selectActiveSlide(useSession.getState())).toBe(0)
  })

  it('reports whether there is anything to show', () => {
    expect(selectHasSlides(useSession.getState())).toBe(false)
    useSession.getState().setRendered(slides())
    expect(selectHasSlides(useSession.getState())).toBe(false)
    useSession.getState().setRendered(slides(0))
    expect(selectHasSlides(useSession.getState())).toBe(true)
  })

  it('stores and clears editor requests', () => {
    useSession.getState().requestJump(3)
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 3 })
    useSession.getState().requestReplace('# New')
    expect(useSession.getState().editorRequest).toEqual({ type: 'replace', text: '# New' })
    useSession.getState().clearEditorRequest()
    expect(useSession.getState().editorRequest).toBeNull()
  })
})
```

`src/core/deck/sync.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Deck } from './deck'
import { StorageError, type DeckRepository } from './repository'
import { useSession } from './session'
import { startAutosave, startRenderSync } from './sync'

const deck = (id: string, text: string): Deck => ({ id, title: id, text, updatedAt: 1 })
const result = (css: string) => ({ css, slides: [], warnings: [] })

beforeEach(() => {
  vi.useFakeTimers()
  useSession.setState(useSession.getInitialState(), true)
})
afterEach(() => vi.useRealTimers())

describe('startRenderSync', () => {
  it('renders once on start, then debounces text edits', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => result(text))
    const stop = startRenderSync(useSession, renderFn, 150)
    expect(renderFn).toHaveBeenCalledTimes(1)

    useSession.getState().setText('two')
    useSession.getState().setText('three')
    vi.advanceTimersByTime(149)
    expect(renderFn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    expect(renderFn).toHaveBeenCalledTimes(2)
    expect(renderFn).toHaveBeenLastCalledWith('three')
    expect(useSession.getState().rendered?.css).toBe('three')
    stop()
  })

  it('renders at once when a different deck loads', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => result(text))
    const stop = startRenderSync(useSession, renderFn, 150)
    useSession.getState().loadDeck(deck('b', 'other'))
    expect(renderFn).toHaveBeenLastCalledWith('other')
    stop()
  })

  it('keeps the last good result and records the error when render throws', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => {
      if (text === 'bad') throw new Error('bad deck')
      return result(text)
    })
    const stop = startRenderSync(useSession, renderFn, 150)
    useSession.getState().setText('bad')
    vi.advanceTimersByTime(150)
    expect(useSession.getState().rendered?.css).toBe('one')
    expect(useSession.getState().renderError).toBe('bad deck')
    stop()
  })

  it('stops reacting after cleanup', () => {
    useSession.getState().loadDeck(deck('a', 'one'))
    const renderFn = vi.fn((text: string) => result(text))
    startRenderSync(useSession, renderFn, 150)()
    useSession.getState().setText('two')
    vi.advanceTimersByTime(500)
    expect(renderFn).toHaveBeenCalledTimes(1)
  })
})

describe('startAutosave', () => {
  const makeRepo = (): DeckRepository & { save: ReturnType<typeof vi.fn> } => ({
    list: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
  })

  it('saves the edited deck after the delay', () => {
    const repo = makeRepo()
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Changed')
    vi.advanceTimersByTime(799)
    expect(repo.save).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', title: 'Changed', text: '# Changed' }),
    )
    stop()
  })

  it('does not save when a deck is merely loaded', () => {
    const repo = makeRepo()
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().loadDeck(deck('a', '# A'))
    vi.advanceTimersByTime(2000)
    expect(repo.save).not.toHaveBeenCalled()
    stop()
  })

  it('flushes pending edits immediately when another deck loads', () => {
    const repo = makeRepo()
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Unsaved edit')
    useSession.getState().loadDeck(deck('b', '# B'))
    expect(repo.save).toHaveBeenCalledTimes(1)
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', text: '# Unsaved edit' }))
    vi.advanceTimersByTime(2000)
    expect(repo.save).toHaveBeenCalledTimes(1)
    stop()
  })

  it('flushes on cleanup', () => {
    const repo = makeRepo()
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Edit')
    stop()
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('shows a notice when saving fails and keeps the deck in memory', async () => {
    const repo = makeRepo()
    repo.save.mockRejectedValue(new StorageError('Storage is full.'))
    useSession.getState().loadDeck(deck('a', '# A'))
    const stop = startAutosave(useSession, repo, 800)
    useSession.getState().setText('# Edit')
    await vi.advanceTimersByTimeAsync(800)
    expect(useSession.getState().notice).toEqual({ kind: 'error', message: 'Storage is full.' })
    expect(useSession.getState().text).toBe('# Edit')
    stop()
  })
})
```

`src/core/deck/open.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Deck } from './deck'
import { openInitialDeck, openNewDeck } from './open'
import { StorageError, type DeckRepository } from './repository'
import { useSession } from './session'
import { starterText } from './starter'

const deck = (id: string, updatedAt: number): Deck => ({ id, title: id, text: `# ${id}`, updatedAt })

const makeRepo = (overrides: Partial<DeckRepository> = {}): DeckRepository => ({
  list: vi.fn().mockResolvedValue([]),
  get: vi.fn(),
  delete: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
})

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('openInitialDeck', () => {
  it('opens the most recently updated deck', async () => {
    const repo = makeRepo({ list: vi.fn().mockResolvedValue([deck('newest', 2), deck('old', 1)]) })
    await openInitialDeck(repo)
    expect(useSession.getState().deckId).toBe('newest')
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('creates and saves a starter deck when none exist', async () => {
    const repo = makeRepo()
    await openInitialDeck(repo)
    expect(useSession.getState().text).toBe(starterText)
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('opens an unsaved starter deck and shows a notice when storage cannot be read', async () => {
    const repo = makeRepo({ list: vi.fn().mockRejectedValue(new StorageError('Cannot read.')) })
    await openInitialDeck(repo)
    expect(useSession.getState().text).toBe(starterText)
    expect(useSession.getState().notice).toEqual({ kind: 'error', message: 'Cannot read.' })
    expect(repo.save).not.toHaveBeenCalled()
  })
})

describe('openNewDeck', () => {
  it('saves and opens a new deck', async () => {
    const repo = makeRepo()
    await openNewDeck('# Fresh', repo)
    expect(useSession.getState().text).toBe('# Fresh')
    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Fresh' }))
  })

  it('still opens the deck and shows a notice when saving fails', async () => {
    const repo = makeRepo({ save: vi.fn().mockRejectedValue(new StorageError('Storage is full.')) })
    await openNewDeck('# Fresh', repo)
    expect(useSession.getState().text).toBe('# Fresh')
    expect(useSession.getState().notice?.message).toBe('Storage is full.')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/core/deck`
Expected: FAIL (session, sync, open, starter modules not found).

- [ ] **Step 3: Implement**

`src/core/deck/session.ts`:

```ts
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
```

`src/core/deck/sync.ts`:

```ts
import { render, type RenderResult } from '@/core/engine'
import { deriveTitle, type Deck } from './deck'
import { errorMessage } from './errors'
import type { DeckRepository } from './repository'
import type { useSession } from './session'

type SessionStore = Pick<typeof useSession, 'getState' | 'subscribe'>

/** Keeps `rendered` in step with `text`: once on start, at once on deck change, debounced on edits. */
export function startRenderSync(
  store: SessionStore,
  renderFn: (text: string) => RenderResult = render,
  delayMs = 150,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined

  const run = () => {
    const { text, setRendered, setRenderError } = store.getState()
    try {
      setRendered(renderFn(text))
    } catch (error) {
      setRenderError(errorMessage(error))
    }
  }

  run()
  const unsubscribe = store.subscribe((state, previous) => {
    if (state.deckId !== previous.deckId) {
      clearTimeout(timer)
      run()
    } else if (state.text !== previous.text) {
      clearTimeout(timer)
      timer = setTimeout(run, delayMs)
    }
  })

  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}

/** Saves edits after a pause. Pending edits are flushed when the deck changes or on cleanup. */
export function startAutosave(
  store: SessionStore,
  repository: DeckRepository,
  delayMs = 800,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: Deck | null = null

  const flush = () => {
    clearTimeout(timer)
    if (!pending) return
    const deck = pending
    pending = null
    repository
      .save(deck)
      .catch((error: unknown) =>
        store.getState().setNotice({ kind: 'error', message: errorMessage(error) }),
      )
  }

  const unsubscribe = store.subscribe((state, previous) => {
    if (state.deckId !== previous.deckId) {
      flush()
      return
    }
    if (state.deckId === null || state.text === previous.text) return
    pending = {
      id: state.deckId,
      title: deriveTitle(state.text),
      text: state.text,
      updatedAt: Date.now(),
    }
    clearTimeout(timer)
    timer = setTimeout(flush, delayMs)
  })

  return () => {
    unsubscribe()
    flush()
  }
}
```

`src/core/deck/starter.ts`:

```ts
export const starterText = `# Your first deck

Write Markdown on the left. Each slide appears on the right.

---

## Start a new slide with a line of three dashes

- Use lists, **bold text** and \`inline code\`
- Add speaker notes in an HTML comment

<!-- Speaker notes show in the presenter view. -->

---

## Ready to present?

Choose Present to run the deck, or Export PDF to share it.
`
```

`src/core/deck/open.ts`:

```ts
import { createDeck, type Deck } from './deck'
import { errorMessage } from './errors'
import type { DeckRepository } from './repository'
import { useSession } from './session'
import { starterText } from './starter'

const report = (error: unknown) =>
  useSession.getState().setNotice({ kind: 'error', message: errorMessage(error) })

/** Opens a new deck at once; a failed save is reported but never blocks opening. */
export async function openNewDeck(text: string, repository: DeckRepository): Promise<void> {
  const deck = createDeck(text)
  useSession.getState().loadDeck(deck)
  try {
    await repository.save(deck)
  } catch (error) {
    report(error)
  }
}

export async function openInitialDeck(repository: DeckRepository): Promise<void> {
  let latest: Deck | undefined
  try {
    latest = (await repository.list())[0]
  } catch (error) {
    report(error)
    useSession.getState().loadDeck(createDeck(starterText))
    return
  }
  if (latest) {
    useSession.getState().loadDeck(latest)
    return
  }
  await openNewDeck(starterText, repository)
}
```

`src/core/deck/index.ts`:

```ts
export { deriveTitle, type Deck } from './deck'
export { deckRepository } from './deckRepository'
export { errorMessage } from './errors'
export { openInitialDeck, openNewDeck } from './open'
export { selectActiveSlide, selectHasSlides, useSession } from './session'
export { startAutosave, startRenderSync } from './sync'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/core`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/core/deck
git commit -m "feat(deck): session store, render sync, autosave and deck opening"
```

---

### Task 5: Shared UI primitives

**Files:**
- Create: `src/shared/classNames.ts`, `src/shared/slide-view/{SlideView.tsx,ThemeStyle.tsx,SlideView.module.css,index.ts}`, `src/shared/split-pane/{SplitPane.tsx,SplitPane.module.css,index.ts}`, `src/shared/button/{Button.tsx,Button.module.css,index.ts}`, `src/shared/dialog/{Dialog.tsx,Dialog.module.css,index.ts}`
- Test: `src/shared/classNames.test.ts`, `src/shared/slide-view/SlideView.test.tsx`, `src/shared/split-pane/SplitPane.test.tsx`, `src/shared/button/Button.test.tsx`, `src/shared/dialog/Dialog.test.tsx`

**Interfaces:**
- Consumes: CSS tokens from Task 1.
- Produces:
  - `classNames(...parts: (string | false | undefined)[]): string` from `@/shared/classNames`
  - `SlideView({ html: string; className?: string })` renders one slide inside `<div class="marpit ...">`; `ThemeStyle({ css: string })` renders a `<style>` element. Both from `@/shared/slide-view`
  - `SplitPane({ start: ReactNode; end: ReactNode; label: string })` from `@/shared/split-pane` (split snaps to 5% steps between 20 and 80, set through a `data-split` attribute so no inline style is needed; keyboard: Left and Right arrows)
  - `Button` (all native button props plus `variant?: 'primary' | 'quiet'`, default `'quiet'`) from `@/shared/button`
  - `Dialog({ open: boolean; onClose: () => void; label: string; className?: string; children })` `DialogBody({ children })` (padded content wrapper that also styles its `h2`) and `DialogActions({ children })` (a wrapping row of buttons), all from `@/shared/dialog`. `onClose` is called on Escape and on backdrop click; the parent owns `open`.

- [ ] **Step 1: Write the failing tests**

`src/shared/classNames.test.ts`:

```ts
import { expect, it } from 'vitest'
import { classNames } from './classNames'

it('joins truthy parts and skips falsy ones', () => {
  expect(classNames('a', false, undefined, 'b')).toBe('a b')
  expect(classNames()).toBe('')
})
```

`src/shared/slide-view/SlideView.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { SlideView, ThemeStyle } from './index'

it('renders slide html inside a marpit container and merges a class name', () => {
  const { container } = render(
    <SlideView html='<svg data-marpit-svg=""><text>Hi</text></svg>' className="extra" />,
  )
  const wrapper = container.firstElementChild
  expect(wrapper).toHaveClass('marpit', 'extra')
  expect(wrapper?.querySelector('svg')).not.toBeNull()
})

it('renders theme css in a style element', () => {
  render(<ThemeStyle css=".marpit{color:red}" />)
  expect(document.querySelector('style')?.textContent).toBe('.marpit{color:red}')
})
```

`src/shared/split-pane/SplitPane.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { SplitPane } from './index'

const setup = () => {
  render(<SplitPane label="Resize panes" start={<p>left</p>} end={<p>right</p>} />)
  return screen.getByRole('separator', { name: 'Resize panes' })
}

it('starts at 50% and renders both panes', () => {
  const handle = setup()
  expect(handle).toHaveAttribute('aria-valuenow', '50')
  expect(screen.getByText('left')).toBeInTheDocument()
  expect(screen.getByText('right')).toBeInTheDocument()
})

it('moves in 5% steps with the arrow keys and clamps at the limits', () => {
  const handle = setup()
  fireEvent.keyDown(handle, { key: 'ArrowRight' })
  expect(handle).toHaveAttribute('aria-valuenow', '55')
  for (let i = 0; i < 20; i++) fireEvent.keyDown(handle, { key: 'ArrowLeft' })
  expect(handle).toHaveAttribute('aria-valuenow', '20')
  for (let i = 0; i < 20; i++) fireEvent.keyDown(handle, { key: 'ArrowRight' })
  expect(handle).toHaveAttribute('aria-valuenow', '80')
})

it('exposes the split to the stylesheet through data-split, not an inline style', () => {
  const handle = setup()
  const container = handle.parentElement
  expect(container).toHaveAttribute('data-split', '50')
  expect(container).not.toHaveAttribute('style')
})
```

`src/shared/button/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Button } from './index'

it('is a non-submitting button by default and calls onClick', async () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Save</Button>)
  const button = screen.getByRole('button', { name: 'Save' })
  expect(button).toHaveAttribute('type', 'button')
  await userEvent.click(button)
  expect(onClick).toHaveBeenCalledTimes(1)
})

it('does not call onClick when disabled', async () => {
  const onClick = vi.fn()
  render(<Button disabled onClick={onClick}>Save</Button>)
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onClick).not.toHaveBeenCalled()
})
```

`src/shared/dialog/Dialog.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { Dialog, DialogBody } from './index'

const setup = (open: boolean, onClose = vi.fn()) => {
  const view = render(
    <Dialog open={open} onClose={onClose} label="Example">
      <DialogBody>
        <button type="button">Inside</button>
      </DialogBody>
    </Dialog>,
  )
  return { ...view, onClose }
}

it('opens and closes with the open prop', () => {
  const { rerender, onClose } = setup(true)
  const dialog = screen.getByRole('dialog', { name: 'Example', hidden: true })
  expect(dialog).toHaveAttribute('open')
  rerender(
    <Dialog open={false} onClose={onClose} label="Example">
      <DialogBody>x</DialogBody>
    </Dialog>,
  )
  expect(dialog).not.toHaveAttribute('open')
})

it('asks the parent to close on Escape instead of closing itself', () => {
  const { onClose } = setup(true)
  const dialog = screen.getByRole('dialog', { name: 'Example' })
  const cancel = new Event('cancel', { cancelable: true })
  fireEvent(dialog, cancel)
  expect(cancel.defaultPrevented).toBe(true)
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(dialog).toHaveAttribute('open')
})

it('closes on a backdrop click but not on a click inside the content', () => {
  const { onClose } = setup(true)
  fireEvent.click(screen.getByRole('button', { name: 'Inside' }))
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('dialog', { name: 'Example' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement the code**

`src/shared/classNames.ts`:

```ts
export function classNames(...parts: (string | false | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
```

`src/shared/slide-view/SlideView.tsx`:

```tsx
import { classNames } from '@/shared/classNames'
import styles from './SlideView.module.css'

interface SlideViewProps {
  html: string
  className?: string
}

/** Marp's own CSS styles `.marpit > svg`, so the wrapper must carry the `marpit` class. */
export function SlideView({ html, className }: SlideViewProps) {
  return (
    <div
      className={classNames('marpit', styles.slide, className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
```

`src/shared/slide-view/ThemeStyle.tsx`:

```tsx
/** Marp's CSS is scoped to `.marpit`, so one copy in the document styles every SlideView. */
export function ThemeStyle({ css }: { css: string }) {
  return <style>{css}</style>
}
```

`src/shared/slide-view/SlideView.module.css`:

```css
.slide {
  width: 100%;
  overflow: hidden;
}
```

`src/shared/slide-view/index.ts`:

```ts
export { SlideView } from './SlideView'
export { ThemeStyle } from './ThemeStyle'
```

`src/shared/split-pane/SplitPane.tsx`:

```tsx
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import styles from './SplitPane.module.css'

const MIN = 20
const MAX = 80
const STEP = 5

const snap = (percent: number) => Math.min(MAX, Math.max(MIN, Math.round(percent / STEP) * STEP))

interface SplitPaneProps {
  start: ReactNode
  end: ReactNode
  label: string
}

export function SplitPane({ start, end, label }: SplitPaneProps) {
  const [split, setSplit] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') setSplit((value) => snap(value - STEP))
    else if (event.key === 'ArrowRight') setSplit((value) => snap(value + STEP))
    else return
    event.preventDefault()
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragging.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!dragging.current || !rect || rect.width === 0) return
    setSplit(snap(((event.clientX - rect.left) / rect.width) * 100))
  }

  return (
    <div ref={containerRef} className={styles.split} data-split={split}>
      <div className={styles.pane}>{start}</div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={label}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={split}
        tabIndex={0}
        className={styles.handle}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragging.current = false
        }}
      />
      <div className={styles.pane}>{end}</div>
    </div>
  )
}
```

`src/shared/split-pane/SplitPane.module.css` (the 13 `data-split` rules replace any need for an inline style):

```css
.split {
  --split: 50;
  display: grid;
  grid-template-columns: calc(var(--split) * 1%) 10px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
}

.split[data-split='20'] { --split: 20; }
.split[data-split='25'] { --split: 25; }
.split[data-split='30'] { --split: 30; }
.split[data-split='35'] { --split: 35; }
.split[data-split='40'] { --split: 40; }
.split[data-split='45'] { --split: 45; }
.split[data-split='50'] { --split: 50; }
.split[data-split='55'] { --split: 55; }
.split[data-split='60'] { --split: 60; }
.split[data-split='65'] { --split: 65; }
.split[data-split='70'] { --split: 70; }
.split[data-split='75'] { --split: 75; }
.split[data-split='80'] { --split: 80; }

.pane {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.handle {
  background: var(--color-hairline);
  cursor: col-resize;
  touch-action: none;
}

.handle:hover,
.handle:focus-visible {
  background: var(--color-viridian);
}

@media (max-width: 760px) {
  .split {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  .handle {
    display: none;
  }
}
```

`src/shared/split-pane/index.ts`:

```ts
export { SplitPane } from './SplitPane'
```

`src/shared/button/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'
import { classNames } from '@/shared/classNames'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'quiet'
}

export function Button({ variant = 'quiet', ...props }: ButtonProps) {
  return <button type="button" className={classNames(styles.button, styles[variant])} {...props} />
}
```

`src/shared/button/Button.module.css`:

```css
.button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: var(--radius);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 120ms;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quiet {
  border-color: var(--color-hairline);
  background: transparent;
  color: var(--color-ink);
}

.quiet:hover:not(:disabled) {
  background: var(--color-lightbox);
}

.primary {
  background: var(--color-viridian);
  color: var(--color-mount);
}

.primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-viridian) 85%, black);
}
```

`src/shared/button/index.ts`:

```ts
export { Button } from './Button'
```

`src/shared/dialog/Dialog.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react'
import { classNames } from '@/shared/classNames'
import styles from './Dialog.module.css'

interface DialogProps {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  children: ReactNode
}

/** A native modal <dialog>: focus trap, inert background and Escape come from the browser. */
export function Dialog({ open, onClose, label, className, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={classNames(styles.dialog, className)}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </dialog>
  )
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>
}
```

`src/shared/dialog/Dialog.module.css`:

```css
.dialog {
  width: min(520px, 92vw);
  padding: 0;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius);
  background: var(--color-mount);
  color: var(--color-ink);
}

.dialog::backdrop {
  background: rgb(20 40 46 / 0.45);
}

.body {
  display: grid;
  gap: 16px;
  padding: 24px;
}

.body h2 {
  margin: 0;
  font-size: 1.15rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
```

`src/shared/dialog/index.ts`:

```ts
export { Dialog, DialogActions, DialogBody } from './Dialog'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/shared`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/shared
git commit -m "feat(shared): slide view, split pane, button and dialog primitives"
```

---

### Task 6: Editor feature

**Files:**
- Create: `src/features/editor/Editor.tsx`, `src/features/editor/Editor.module.css`, `src/features/editor/index.ts`
- Test: `src/features/editor/Editor.test.tsx`

**Interfaces:**
- Consumes: `useSession` from `@/core/deck` (`text`, `setText`, `setCursorLine`, `editorRequest`, `clearEditorRequest`).
- Produces: `Editor` component (no props) from `@/features/editor`. The app mounts it with `key={deckId}` so a deck switch gets a fresh document and undo history. Behavior: initial document is the session text; edits write back through `setText`; the cursor's 0-based line goes to `setCursorLine`; a `{ type: 'jump', line }` request moves the cursor to that 0-based line (clamped to the last line) and focuses the editor; a `{ type: 'replace', text }` request replaces the whole document in one transaction (one undo step). Requests are cleared after being handled. The editable region has the accessible name "Slide Markdown".

- [ ] **Step 1: Write the failing tests**

`src/features/editor/Editor.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/editor`
Expected: FAIL (`./Editor` not found).

- [ ] **Step 3: Implement**

`src/features/editor/Editor.tsx`:

```tsx
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
```

`src/features/editor/Editor.module.css`:

```css
.editor {
  height: 100%;
  min-height: 0;
  background: var(--color-mount);
}

.editor :global(.cm-editor) {
  height: 100%;
  background: var(--color-mount);
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 0.9rem;
}

.editor :global(.cm-scroller) {
  line-height: 1.65;
}

.editor :global(.cm-gutters) {
  border-right: 1px solid var(--color-hairline);
  background: var(--color-mount);
  color: var(--color-ink-soft);
}

.editor :global(.cm-activeLine),
.editor :global(.cm-activeLineGutter) {
  background: var(--color-lightbox);
}

.editor :global(.cm-cursor) {
  border-left-color: var(--color-viridian);
}

.editor :global(.cm-editor.cm-focused) {
  outline: 2px solid var(--color-viridian);
  outline-offset: -2px;
}
```

`src/features/editor/index.ts`:

```ts
export { Editor } from './Editor'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/editor`
Expected: PASS. If CodeMirror throws a measurement error from jsdom, extend the `Range` polyfill in `src/test/setup.ts` rather than skipping the test; the Playwright journey in Task 12 also covers the real browser.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/features/editor
git commit -m "feat(editor): CodeMirror editor wired to the session, with jump and replace requests"
```

---

### Task 7: Preview feature (mounted slide, thumbnail rail, warnings)

**Files:**
- Create: `src/features/preview/PreviewPane.tsx`, `src/features/preview/PreviewPane.module.css`, `src/features/preview/ThumbnailRail.tsx`, `src/features/preview/ThumbnailRail.module.css`, `src/features/preview/index.ts`
- Test: `src/features/preview/PreviewPane.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `selectActiveSlide` from `@/core/deck`; `RenderedSlide`, `RenderResult` types from `@/core/engine`; `SlideView` from `@/shared/slide-view`.
- Produces: `PreviewPane` (no props) from `@/features/preview`. It shows the active slide inside the mount frame (group named `Slide N of M`), a rail of buttons named `Go to slide N` (clicking one calls `requestJump(slide.lineRange.start)`), an alert when `renderError` is set (while keeping the last good slide visible), a list of directive warnings whose buttons call `requestJump(warning.line)`, and an empty state when there are no slides. It does not render theme CSS; the app does that once.

- [ ] **Step 1: Write the failing tests**

`src/features/preview/PreviewPane.test.tsx`:

```tsx
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSession } from '@/core/deck'
import type { RenderResult, RenderedSlide } from '@/core/engine'
import { PreviewPane } from './PreviewPane'

const slide = (html: string, start: number, end: number): RenderedSlide => ({
  html,
  notes: [],
  lineRange: { start, end },
})

const rendered = (
  slides: RenderedSlide[],
  warnings: RenderResult['warnings'] = [],
): RenderResult => ({ css: '', slides, warnings })

const THREE = [slide('<p>First</p>', 0, 3), slide('<p>Second</p>', 4, 9), slide('<p>Third</p>', 10, 12)]

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

describe('PreviewPane', () => {
  it('shows the slide that contains the cursor, with its position', () => {
    useSession.getState().setRendered(rendered(THREE))
    render(<PreviewPane />)
    const main = screen.getByRole('group', { name: 'Slide 1 of 3' })
    expect(within(main).getByText('First')).toBeInTheDocument()

    act(() => useSession.getState().setCursorLine(5))
    expect(screen.getByRole('group', { name: 'Slide 2 of 3' })).toBeInTheDocument()
  })

  it('lists every slide in the rail and marks the active one', () => {
    useSession.getState().setRendered(rendered(THREE))
    useSession.getState().setCursorLine(5)
    render(<PreviewPane />)
    expect(screen.getAllByRole('button', { name: /Go to slide/ })).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Go to slide 2' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('asks the editor to jump to the first line of a clicked slide', async () => {
    useSession.getState().setRendered(rendered(THREE))
    render(<PreviewPane />)
    await userEvent.click(screen.getByRole('button', { name: 'Go to slide 3' }))
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 10 })
  })

  it('shows an alert but keeps the last good slide when rendering fails', () => {
    useSession.getState().setRendered(rendered(THREE))
    useSession.getState().setRenderError('bad directive')
    render(<PreviewPane />)
    expect(screen.getByRole('alert')).toHaveTextContent('bad directive')
    expect(screen.getByRole('group', { name: 'Slide 1 of 3' })).toBeInTheDocument()
  })

  it('lists directive warnings and jumps to the warned line', async () => {
    useSession.getState().setRendered(
      rendered(THREE, [{ line: 6, message: '"TODOO" looks like a directive.' }]),
    )
    render(<PreviewPane />)
    await userEvent.click(screen.getByRole('button', { name: /Line 7: "TODOO" looks like a directive/ }))
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 6 })
  })

  it.each([
    ['nothing rendered yet', null],
    ['an empty deck with no slides', rendered([])],
  ])('shows an empty state for %s', (_name, value) => {
    if (value) useSession.getState().setRendered(value)
    render(<PreviewPane />)
    expect(screen.getByText(/Write Markdown on the left/)).toBeInTheDocument()
    expect(screen.queryByRole('group')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/preview`
Expected: FAIL (`./PreviewPane` not found).

- [ ] **Step 3: Implement**

`src/features/preview/ThumbnailRail.tsx`:

```tsx
import { useSession } from '@/core/deck'
import type { RenderedSlide } from '@/core/engine'
import { SlideView } from '@/shared/slide-view'
import styles from './ThumbnailRail.module.css'

interface ThumbnailRailProps {
  slides: RenderedSlide[]
  activeIndex: number
}

export function ThumbnailRail({ slides, activeIndex }: ThumbnailRailProps) {
  return (
    <nav className={styles.rail} aria-label="Slides">
      {slides.map((slide, index) => (
        <button
          key={index}
          type="button"
          className={styles.thumb}
          aria-label={`Go to slide ${index + 1}`}
          aria-current={index === activeIndex ? 'true' : undefined}
          onClick={() => useSession.getState().requestJump(slide.lineRange.start)}
        >
          <span className={styles.preview} inert>
            <SlideView html={slide.html} />
          </span>
        </button>
      ))}
    </nav>
  )
}
```

`src/features/preview/ThumbnailRail.module.css` (the clipped corner is the slide-mount motif; the active mount turns viridian):

```css
.rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding: 12px;
  border-right: 1px solid var(--color-hairline);
}

.thumb {
  display: block;
  padding: 4px;
  border: 0;
  background: var(--color-mount);
  clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%);
  cursor: pointer;
}

.thumb[aria-current='true'] {
  background: var(--color-viridian);
}

.preview {
  display: block;
  pointer-events: none;
}
```

`src/features/preview/PreviewPane.tsx`:

```tsx
import { selectActiveSlide, useSession } from '@/core/deck'
import { SlideView } from '@/shared/slide-view'
import styles from './PreviewPane.module.css'
import { ThumbnailRail } from './ThumbnailRail'

export function PreviewPane() {
  const rendered = useSession((state) => state.rendered)
  const renderError = useSession((state) => state.renderError)
  const activeIndex = useSession(selectActiveSlide)

  const slides = rendered?.slides ?? []
  const active = slides[activeIndex]

  return (
    <section className={styles.pane} aria-label="Slide preview">
      {renderError && (
        <p role="alert" className={styles.error}>
          Couldn&apos;t render the slides: {renderError}. Showing the last version that worked.
        </p>
      )}
      {rendered && rendered.warnings.length > 0 && (
        <ul className={styles.warnings} aria-label="Warnings">
          {rendered.warnings.map((warning) => (
            <li key={warning.line}>
              <button
                type="button"
                className={styles.warning}
                onClick={() => useSession.getState().requestJump(warning.line)}
              >
                Line {warning.line + 1}: {warning.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      {active ? (
        <div className={styles.stage}>
          <ThumbnailRail slides={slides} activeIndex={activeIndex} />
          <div className={styles.view}>
            <div className={styles.mountFrame}>
              <div
                role="group"
                aria-label={`Slide ${activeIndex + 1} of ${slides.length}`}
                className={styles.mount}
              >
                <SlideView html={active.html} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>
          Write Markdown on the left. Start a new slide with a line containing ---.
        </p>
      )}
    </section>
  )
}
```

`src/features/preview/PreviewPane.module.css`:

```css
.pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--color-lightbox);
}

.error {
  margin: 0;
  padding: 10px 16px;
  border-left: 4px solid var(--color-rust);
  background: var(--color-mount);
}

.warnings {
  margin: 0;
  padding: 0;
  list-style: none;
  border-bottom: 1px solid var(--color-hairline);
  background: var(--color-mount);
}

.warning {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: 0;
  background: transparent;
  color: var(--color-ink);
  text-align: left;
  cursor: pointer;
}

.warning:hover {
  background: var(--color-lightbox);
}

.stage {
  display: grid;
  grid-template-columns: 148px minmax(0, 1fr);
  flex: 1;
  min-height: 0;
}

.view {
  display: grid;
  place-items: center;
  overflow: auto;
  padding: 24px;
}

.mountFrame {
  width: min(100%, 960px);
  filter: drop-shadow(var(--shadow-mount));
}

.mount {
  padding: 14px;
  background: var(--color-mount);
  clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%);
}

.empty {
  margin: auto;
  padding: 24px;
  max-width: 36ch;
  color: var(--color-ink-soft);
  text-align: center;
}

@media (max-width: 760px) {
  .stage {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
  }

  .stage > nav {
    flex-direction: row;
    border-right: 0;
    border-bottom: 1px solid var(--color-hairline);
  }
}
```

`src/features/preview/index.ts`:

```ts
export { PreviewPane } from './PreviewPane'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/preview`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS. (The `.stage > nav` selector in the mobile block is a structural selector on a child owned by `ThumbnailRail`; if lint or review prefers, replace it by exporting a `rail` modifier from `ThumbnailRail.module.css` instead.)

```bash
git add src/features/preview
git commit -m "feat(preview): mounted slide, thumbnail rail, error alert and directive warnings"
```

---

### Task 8: Present mode with presenter view

**Files:**
- Create: `src/features/present/PresentMode.tsx`, `src/features/present/PresentMode.module.css`, `src/features/present/PresentButton.tsx`, `src/features/present/enterPresent.ts`, `src/features/present/useElapsed.ts`, `src/features/present/index.ts`
- Test: `src/features/present/PresentMode.test.tsx`, `src/features/present/enterPresent.test.ts`, `src/features/present/PresentButton.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `selectActiveSlide`, `selectHasSlides` from `@/core/deck`; `Dialog` from `@/shared/dialog`; `SlideView` from `@/shared/slide-view`; `Button` from `@/shared/button`.
- Produces: `PresentMode` (no props; the app renders it only when `mode === 'present'`), `PresentButton` (no props) from `@/features/present`.
  - Starts on the slide containing the cursor. Keys: Right, Down, PageDown, Space, Enter go next; Left, Up, PageUp, Backspace go previous; Home and End jump; `P` toggles the presenter view; Escape (the dialog's cancel) exits. Navigation never leaves the range.
  - Presenter view shows the current slide, the next slide (or "End of deck"), the notes, `N / M`, an elapsed timer, and Previous, Next, Audience view and Exit buttons.
  - On exit it requests an editor jump to the current slide's first line and sets mode `'edit'`. If the browser leaves fullscreen (Esc inside fullscreen), it exits too.
  - `PresentButton` is disabled with no slides; clicking it switches to present mode and asks for fullscreen, but presents in the window if fullscreen is refused or unsupported.

- [ ] **Step 1: Write the failing tests**

`src/features/present/PresentMode.test.tsx`:

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/core/deck'
import type { RenderedSlide } from '@/core/engine'
import { PresentMode } from './PresentMode'

const slide = (html: string, start: number, end: number, notes: string[] = []): RenderedSlide => ({
  html,
  notes,
  lineRange: { start, end },
})

const THREE = [
  slide('<p>First</p>', 0, 3, ['Say hello']),
  slide('<p>Second</p>', 4, 9),
  slide('<p>Third</p>', 10, 12),
]

function start(cursorLine = 0, slides = THREE) {
  useSession.getState().setRendered({ css: '', warnings: [], slides })
  useSession.getState().setCursorLine(cursorLine)
  useSession.getState().setMode('present')
  return render(<PresentMode />)
}

const press = (key: string) => fireEvent.keyDown(window, { key })
const position = () => screen.getByText(/^\d+ \/ \d+$/)

beforeEach(() => useSession.setState(useSession.getInitialState(), true))
afterEach(() => vi.useRealTimers())

describe('PresentMode', () => {
  it('starts on the slide that contains the cursor', () => {
    start(5)
    press('p')
    expect(position()).toHaveTextContent('2 / 3')
  })

  it.each(['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'])('%j goes to the next slide', (key) => {
    start()
    press(key)
    press('p')
    expect(position()).toHaveTextContent('2 / 3')
  })

  it.each(['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'])('%j goes to the previous slide', (key) => {
    start(5)
    press(key)
    press('p')
    expect(position()).toHaveTextContent('1 / 3')
  })

  it('jumps with Home and End and never leaves the range', () => {
    start(5)
    press('End')
    press('ArrowRight')
    press('p')
    expect(position()).toHaveTextContent('3 / 3')
    press('Home')
    press('ArrowLeft')
    expect(position()).toHaveTextContent('1 / 3')
  })

  it('advances when the slide is clicked', () => {
    start()
    fireEvent.click(screen.getByText('First'))
    press('p')
    expect(position()).toHaveTextContent('2 / 3')
  })

  it('shows notes and the next slide in the presenter view, and toggles back', () => {
    start()
    expect(screen.queryByText('Say hello')).toBeNull()
    press('p')
    expect(screen.getByText('Say hello')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
    press('P')
    expect(screen.queryByText('Say hello')).toBeNull()
  })

  it('says when a slide has no notes and when the deck ends', () => {
    start(5)
    press('p')
    expect(screen.getByText('No notes for this slide.')).toBeInTheDocument()
    press('End')
    expect(screen.getByText('End of deck')).toBeInTheDocument()
  })

  it('shows an elapsed timer in the presenter view', () => {
    vi.useFakeTimers()
    start()
    press('p')
    expect(screen.getByText('00:00')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(65_000)
    })
    expect(screen.getByText('01:05')).toBeInTheDocument()
  })

  it('exits on Escape, returning the editor to the current slide', () => {
    start()
    press('ArrowRight')
    fireEvent(screen.getByRole('dialog', { name: 'Presentation' }), new Event('cancel', { cancelable: true }))
    expect(useSession.getState().mode).toBe('edit')
    expect(useSession.getState().editorRequest).toEqual({ type: 'jump', line: 4 })
  })

  it('exits when the browser leaves fullscreen', () => {
    start()
    fireEvent(document, new Event('fullscreenchange'))
    expect(useSession.getState().mode).toBe('edit')
  })

  it('stays on the only slide of a one-slide deck', () => {
    start(0, [slide('<p>Only</p>', 0, 2)])
    press('ArrowRight')
    press('End')
    press('p')
    expect(position()).toHaveTextContent('1 / 1')
    expect(screen.getByText('End of deck')).toBeInTheDocument()
  })

  it('explains there is nothing to present when the deck has no slides', () => {
    start(0, [])
    expect(screen.getByText('There are no slides to present.')).toBeInTheDocument()
  })
})
```

`src/features/present/enterPresent.test.ts`:

```ts
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useSession } from '@/core/deck'
import { enterPresent } from './enterPresent'

beforeEach(() => useSession.setState(useSession.getInitialState(), true))
afterEach(() => {
  Reflect.deleteProperty(document.documentElement, 'requestFullscreen')
})

it('switches to present mode and asks for fullscreen', async () => {
  const requestFullscreen = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: requestFullscreen,
    configurable: true,
  })
  await enterPresent()
  expect(useSession.getState().mode).toBe('present')
  expect(requestFullscreen).toHaveBeenCalledTimes(1)
})

it('still presents when fullscreen is refused', async () => {
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: vi.fn().mockRejectedValue(new Error('denied')),
    configurable: true,
  })
  await enterPresent()
  expect(useSession.getState().mode).toBe('present')
})

it('still presents when fullscreen is not supported', async () => {
  await enterPresent()
  expect(useSession.getState().mode).toBe('present')
})
```

`src/features/present/PresentButton.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it } from 'vitest'
import { useSession } from '@/core/deck'
import { PresentButton } from './PresentButton'

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

it('is disabled until there is at least one slide', () => {
  render(<PresentButton />)
  expect(screen.getByRole('button', { name: 'Present' })).toBeDisabled()
  act(() =>
    useSession.getState().setRendered({
      css: '',
      warnings: [],
      slides: [{ html: '<p>A</p>', notes: [], lineRange: { start: 0, end: 0 } }],
    }),
  )
  expect(screen.getByRole('button', { name: 'Present' })).toBeEnabled()
})

it('starts presenting when clicked', async () => {
  useSession.getState().setRendered({
    css: '',
    warnings: [],
    slides: [{ html: '<p>A</p>', notes: [], lineRange: { start: 0, end: 0 } }],
  })
  render(<PresentButton />)
  await userEvent.click(screen.getByRole('button', { name: 'Present' }))
  expect(useSession.getState().mode).toBe('present')
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/present`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/features/present/useElapsed.ts`:

```ts
import { useEffect, useState } from 'react'

/** Elapsed time since mount as `mm:ss`, computed from timestamps so a throttled tab does not drift. */
export function useElapsed(): string {
  const [startedAt] = useState(Date.now)
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(id)
  }, [startedAt])

  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
```

`src/features/present/enterPresent.ts`:

```ts
import { useSession } from '@/core/deck'

/** Must be called from a click handler so the fullscreen request counts as a user gesture. */
export async function enterPresent(): Promise<void> {
  useSession.getState().setMode('present')
  try {
    await document.documentElement.requestFullscreen()
  } catch {
    // Fullscreen is optional: refused or unsupported, the deck presents in the window.
  }
}
```

`src/features/present/PresentButton.tsx`:

```tsx
import { selectHasSlides, useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { enterPresent } from './enterPresent'

export function PresentButton() {
  const hasSlides = useSession(selectHasSlides)
  return (
    <Button
      variant="primary"
      disabled={!hasSlides}
      title="Press P while presenting to show the presenter view"
      onClick={() => void enterPresent()}
    >
      Present
    </Button>
  )
}
```

`src/features/present/PresentMode.tsx`:

```tsx
import { useCallback, useEffect, useMemo, useState } from 'react'
import { selectActiveSlide, useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { Dialog } from '@/shared/dialog'
import { SlideView } from '@/shared/slide-view'
import styles from './PresentMode.module.css'
import { useElapsed } from './useElapsed'

const NEXT_KEYS = ['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter']
const PREVIOUS_KEYS = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace']

export function PresentMode() {
  const rendered = useSession((state) => state.rendered)
  const slides = useMemo(() => rendered?.slides ?? [], [rendered])
  const [index, setIndex] = useState(() => selectActiveSlide(useSession.getState()))
  const [presenterView, setPresenterView] = useState(false)
  const elapsed = useElapsed()
  const last = slides.length - 1

  const next = useCallback(() => setIndex((value) => Math.min(value + 1, last)), [last])
  const previous = useCallback(() => setIndex((value) => Math.max(value - 1, 0)), [])

  const exit = useCallback(() => {
    const current = slides[index]
    if (current) useSession.getState().requestJump(current.lineRange.start)
    useSession.getState().setMode('edit')
    if (document.fullscreenElement) void document.exitFullscreen()
  }, [slides, index])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (NEXT_KEYS.includes(event.key)) next()
      else if (PREVIOUS_KEYS.includes(event.key)) previous()
      else if (event.key === 'Home') setIndex(0)
      else if (event.key === 'End') setIndex(Math.max(last, 0))
      else if (event.key === 'p' || event.key === 'P') setPresenterView((value) => !value)
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, previous, last])

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) exit()
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [exit])

  const current = slides[index]
  const upcoming = slides[index + 1]

  return (
    <Dialog open onClose={exit} label="Presentation" className={styles.present}>
      {!current ? (
        <div className={styles.empty}>
          <p>There are no slides to present.</p>
          <Button onClick={exit}>Back to editor</Button>
        </div>
      ) : presenterView ? (
        <div className={styles.presenter}>
          <div className={styles.current}>
            <SlideView html={current.html} />
          </div>
          <aside className={styles.side}>
            <section>
              <h2 className={styles.heading}>Next</h2>
              {upcoming ? <SlideView html={upcoming.html} /> : <p className={styles.muted}>End of deck</p>}
            </section>
            <section>
              <h2 className={styles.heading}>Notes</h2>
              {current.notes.length > 0 ? (
                current.notes.map((note, noteIndex) => <p key={noteIndex}>{note}</p>)
              ) : (
                <p className={styles.muted}>No notes for this slide.</p>
              )}
            </section>
          </aside>
          <footer className={styles.bar}>
            <span>
              {index + 1} / {slides.length}
            </span>
            <span>
              Elapsed <time>{elapsed}</time>
            </span>
            <Button onClick={previous} disabled={index === 0}>
              Previous
            </Button>
            <Button onClick={next} disabled={index === last}>
              Next
            </Button>
            <Button onClick={() => setPresenterView(false)}>Audience view</Button>
            <Button onClick={exit}>Exit</Button>
          </footer>
        </div>
      ) : (
        <div className={styles.audience} onClick={next}>
          <div className={styles.stage}>
            <SlideView html={current.html} />
          </div>
          <p className={styles.visuallyHidden} aria-live="polite">
            Slide {index + 1} of {slides.length}
          </p>
        </div>
      )}
    </Dialog>
  )
}
```

`src/features/present/PresentMode.module.css`:

```css
.present {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: var(--color-ink);
  color: var(--color-mount);
}

.audience {
  display: grid;
  place-items: center;
  height: 100%;
  cursor: pointer;
}

.stage {
  width: min(100vw, calc(100vh * 16 / 9));
}

.presenter {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 16px;
  height: 100%;
  padding: 16px;
  background: var(--color-lightbox);
  color: var(--color-ink);
}

.current {
  align-self: start;
}

.side {
  display: grid;
  align-content: start;
  gap: 16px;
  overflow-y: auto;
}

.heading {
  margin: 0 0 8px;
  font-size: 1rem;
}

.muted {
  color: var(--color-ink-soft);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  grid-column: 1 / -1;
  align-items: center;
  gap: 12px;
}

.empty {
  display: grid;
  place-items: center;
  gap: 16px;
  height: 100%;
  align-content: center;
}

.visuallyHidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 760px) {
  .presenter {
    grid-template-columns: minmax(0, 1fr);
    overflow-y: auto;
  }
}
```

`src/features/present/index.ts`:

```ts
export { PresentButton } from './PresentButton'
export { PresentMode } from './PresentMode'
```

`PresentButton` uses `selectHasSlides` from `@/core/deck`, which Task 4 defines and exports.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/present`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/features/present
git commit -m "feat(present): fullscreen present mode with presenter view, notes and timer"
```

---

### Task 9: PDF export through the print engine

**Files:**
- Create: `src/features/export/exportPdf.ts`, `src/features/export/ExportButton.tsx`, `src/features/export/PrintRoot.tsx`, `src/features/export/index.ts`, `src/styles/print.css`
- Modify: `src/main.tsx` (import `@/styles/print.css`)
- Test: `src/features/export/exportPdf.test.ts`, `src/features/export/PrintRoot.test.tsx`, `src/features/export/ExportButton.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `selectHasSlides`, `deriveTitle` from `@/core/deck`; `SlideView` from `@/shared/slide-view`; `Button` from `@/shared/button`.
- Produces: `PrintRoot` (no props; the app renders it once, as a sibling of the element with id `app-shell`) and `ExportButton` (no props) from `@/features/export`.
  - `PrintRoot` renders `<div id="print-root">` with one `div.marpit.print-page` per slide. `print.css` hides it on screen, and under `@media print` hides `#app-shell` and shows only the print root at 1280x720 CSS px per page, one slide per page, no trailing blank page.
  - Export sets `document.title` to the deck title while the print dialog is open (browsers use it as the default file name), then restores it, and shows an info notice that says to choose Save as PDF.
  - With no slides it shows an info notice and does not print. If `window.print` is not a function it shows an error notice.

- [ ] **Step 1: Write the failing tests**

`src/features/export/exportPdf.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSession } from '@/core/deck'
import { exportPdf } from './exportPdf'

const withSlides = (text: string) => {
  useSession.getState().loadDeck({ id: 'a', title: 'a', text, updatedAt: 1 })
  useSession.getState().setRendered({
    css: '',
    warnings: [],
    slides: [{ html: '<p>A</p>', notes: [], lineRange: { start: 0, end: 0 } }],
  })
}

beforeEach(() => useSession.setState(useSession.getInitialState(), true))
afterEach(() => vi.restoreAllMocks())

describe('exportPdf', () => {
  it('prints with the deck title as the document title, then restores it', () => {
    withSlides('# My talk\n')
    let titleWhilePrinting = ''
    vi.spyOn(window, 'print').mockImplementation(() => {
      titleWhilePrinting = document.title
    })
    const original = document.title
    exportPdf()
    expect(titleWhilePrinting).toBe('My talk')
    expect(document.title).toBe(original)
  })

  it('tells the user to choose Save as PDF', () => {
    withSlides('# My talk\n')
    vi.spyOn(window, 'print').mockImplementation(() => undefined)
    exportPdf()
    expect(useSession.getState().notice).toEqual({
      kind: 'info',
      message: 'In the print dialog, choose Save as PDF as the destination.',
    })
  })

  it('does not print an empty deck', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    exportPdf()
    useSession.getState().setRendered({ css: '', warnings: [], slides: [] })
    exportPdf()
    expect(print).not.toHaveBeenCalled()
    expect(useSession.getState().notice).toEqual({
      kind: 'info',
      message: 'There are no slides to export yet.',
    })
  })

  it('shows an error when the browser cannot print', () => {
    withSlides('# My talk\n')
    const original = window.print
    window.print = undefined as unknown as typeof window.print
    try {
      exportPdf()
    } finally {
      window.print = original
    }
    expect(useSession.getState().notice?.kind).toBe('error')
    expect(useSession.getState().notice?.message).toMatch(/can't open the print dialog/)
  })
})
```

`src/features/export/PrintRoot.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { useSession } from '@/core/deck'
import { PrintRoot } from './PrintRoot'

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

it('renders nothing before the first render finishes', () => {
  const { container } = render(<PrintRoot />)
  expect(container).toBeEmptyDOMElement()
})

it('renders one print page per slide', () => {
  useSession.getState().setRendered({
    css: '',
    warnings: [],
    slides: ['<p>A</p>', '<p>B</p>', '<p>C</p>'].map((html, i) => ({
      html,
      notes: [],
      lineRange: { start: i, end: i },
    })),
  })
  const { container } = render(<PrintRoot />)
  expect(container.querySelector('#print-root')).not.toBeNull()
  expect(container.querySelectorAll('#print-root .marpit.print-page')).toHaveLength(3)
})
```

`src/features/export/ExportButton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useSession } from '@/core/deck'
import { ExportButton } from './ExportButton'

beforeEach(() => useSession.setState(useSession.getInitialState(), true))
afterEach(() => vi.restoreAllMocks())

it('is disabled with no slides', () => {
  render(<ExportButton />)
  expect(screen.getByRole('button', { name: 'Export PDF' })).toBeDisabled()
})

it('opens the print dialog when clicked', async () => {
  const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
  useSession.getState().setRendered({
    css: '',
    warnings: [],
    slides: [{ html: '<p>A</p>', notes: [], lineRange: { start: 0, end: 0 } }],
  })
  render(<ExportButton />)
  await userEvent.click(screen.getByRole('button', { name: 'Export PDF' }))
  expect(print).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/export`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/features/export/exportPdf.ts`:

```ts
import { deriveTitle, selectHasSlides, useSession } from '@/core/deck'

export function exportPdf(): void {
  const state = useSession.getState()

  if (!selectHasSlides(state)) {
    state.setNotice({ kind: 'info', message: 'There are no slides to export yet.' })
    return
  }
  if (typeof window.print !== 'function') {
    state.setNotice({
      kind: 'error',
      message: "This browser can't open the print dialog, so a PDF can't be exported here. Try a desktop browser.",
    })
    return
  }

  // Browsers propose the document title as the PDF file name.
  const previousTitle = document.title
  document.title = deriveTitle(state.text)
  try {
    window.print()
  } finally {
    document.title = previousTitle
  }
  state.setNotice({
    kind: 'info',
    message: 'In the print dialog, choose Save as PDF as the destination.',
  })
}
```

`src/features/export/PrintRoot.tsx`:

```tsx
import { useSession } from '@/core/deck'
import { SlideView } from '@/shared/slide-view'

/** Hidden on screen. `src/styles/print.css` shows only this element when printing. */
export function PrintRoot() {
  const rendered = useSession((state) => state.rendered)
  if (!rendered) return null

  return (
    <div id="print-root">
      {rendered.slides.map((slide, index) => (
        <SlideView key={index} html={slide.html} className="print-page" />
      ))}
    </div>
  )
}
```

`src/features/export/ExportButton.tsx`:

```tsx
import { selectHasSlides, useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { exportPdf } from './exportPdf'

export function ExportButton() {
  const hasSlides = useSession(selectHasSlides)
  return (
    <Button disabled={!hasSlides} onClick={exportPdf}>
      Export PDF
    </Button>
  )
}
```

`src/features/export/index.ts`:

```ts
export { ExportButton } from './ExportButton'
export { PrintRoot } from './PrintRoot'
```

`src/styles/print.css`. The ids and the `print-page` class are shared by convention with `PrintRoot` and the app shell (`#app-shell`, Task 11):

```css
#print-root {
  display: none;
}

@page {
  size: 1280px 720px;
  margin: 0;
}

@media print {
  html,
  body {
    margin: 0;
    background: #fff;
  }

  #app-shell {
    display: none !important;
  }

  #print-root {
    display: block;
  }

  #print-root,
  #print-root * {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  #print-root .print-page {
    width: 1280px;
    height: 720px;
    overflow: hidden;
    break-inside: avoid;
  }

  #print-root .print-page:not(:last-child) {
    break-after: page;
  }

  #print-root .print-page > svg {
    display: block;
    width: 1280px;
    height: 720px;
  }
}
```

In `src/main.tsx`, add `import '@/styles/print.css'` after the `global.css` import.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/export`
Expected: PASS. (The real one-slide-per-page behavior is verified by the Playwright test in Task 12, because jsdom has no print layout.)

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/features/export src/styles/print.css src/main.tsx
git commit -m "feat(export): PDF export through the browser print engine with a 16:9 page"
```

---

### Task 10: Decks feature (deck menu and `.md` import)

**Files:**
- Create: `src/features/decks/readMarkdownFile.ts`, `src/features/decks/ImportControl.tsx`, `src/features/decks/ImportControl.module.css`, `src/features/decks/DeckMenu.tsx`, `src/features/decks/DeckMenu.module.css`, `src/features/decks/index.ts`
- Test: `src/features/decks/readMarkdownFile.test.ts`, `src/features/decks/ImportControl.test.tsx`, `src/features/decks/DeckMenu.test.tsx`

**Interfaces:**
- Consumes: from `@/core/deck`: `deckRepository`, `errorMessage`, `openInitialDeck`, `openNewDeck`, `useSession`, `type Deck`; from `@/shared/button` `Button`; from `@/shared/dialog` `Dialog`, `DialogBody`, `DialogActions`.
- Produces: `ImportControl` (no props) and `DeckMenu` (no props) from `@/features/decks`.
  - `readMarkdownFile(file: File): Promise<string>` (internal): accepts `.md` and `.markdown` (any case) up to 2 MB, rejects other extensions, larger files and files containing NUL bytes, each with a user-facing message. A UTF-8 byte order mark never reaches the text (the platform's UTF-8 decoding strips it; a test pins this).
  - `ImportControl`: an Import button with a hidden file input, plus window-level drag and drop of one file. A chosen file opens a dialog named "Import Markdown file" with **New deck**, **Replace current deck** and **Cancel**. New deck saves and opens a separate deck. Replace calls `requestReplace(text)`. Cancel changes nothing. Errors (wrong type, too large, unreadable, more than one file) show as error notices and never modify the open deck.
  - `DeckMenu`: a Decks button opening a dialog named "Your decks" that lists decks newest first. The open deck shows "Open now" instead of an Open button (so a stale copy can never overwrite unsaved edits). Delete takes two clicks. Deleting the open deck opens the most recent remaining deck, or a fresh starter deck.

- [ ] **Step 1: Write the failing tests**

`src/features/decks/readMarkdownFile.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readMarkdownFile } from './readMarkdownFile'

const file = (parts: BlobPart[], name: string) => new File(parts, name, { type: 'text/markdown' })

describe('readMarkdownFile', () => {
  it.each(['talk.md', 'talk.markdown', 'TALK.MD'])('reads %s', async (name) => {
    await expect(readMarkdownFile(file(['# Hi\n'], name))).resolves.toBe('# Hi\n')
  })

  it('does not pass a UTF-8 byte order mark through', async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('# Title')])
    await expect(readMarkdownFile(file([bytes], 'bom.md'))).resolves.toBe('# Title')
  })

  it('keeps Windows line endings for the editor to normalize', async () => {
    await expect(readMarkdownFile(file(['# A\r\n\r\n---\r\n'], 'win.md'))).resolves.toBe(
      '# A\r\n\r\n---\r\n',
    )
  })

  it('rejects other file types', async () => {
    await expect(readMarkdownFile(file(['x'], 'notes.txt'))).rejects.toThrow(
      /"notes.txt" isn't a Markdown file/,
    )
  })

  it('rejects files over 2 MB', async () => {
    const big = file([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.md')
    await expect(readMarkdownFile(big)).rejects.toThrow(/larger than 2 MB/)
  })

  it('rejects binary content with a Markdown name', async () => {
    await expect(readMarkdownFile(file(['a\u0000b'], 'image.md'))).rejects.toThrow(
      /isn't a text file/,
    )
  })
})
```

`src/features/decks/ImportControl.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { deckRepository, useSession } from '@/core/deck'
import { ImportControl } from './ImportControl'

const user = userEvent.setup({ applyAccept: false })
const md = (name = 'talk.md', text = '# Imported\n') => new File([text], name, { type: 'text/markdown' })
const dropOf = (...files: File[]) => ({ dataTransfer: { files, types: ['Files'] } })

function setup() {
  useSession.getState().loadDeck({ id: 'current', title: 'Current', text: '# Current', updatedAt: 1 })
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
    expect(screen.getByRole('dialog', { name: 'Import Markdown file', hidden: true })).not.toHaveAttribute('open')
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
```

`src/features/decks/DeckMenu.test.tsx`:

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deckRepository, useSession, type Deck } from '@/core/deck'
import { DeckMenu } from './DeckMenu'

const alpha: Deck = { id: 'alpha', title: 'Alpha', text: '# Alpha', updatedAt: 1 }
const beta: Deck = { id: 'beta', title: 'Beta', text: '# Beta', updatedAt: 2 }

async function openMenu() {
  render(<DeckMenu />)
  await userEvent.click(screen.getByRole('button', { name: 'Decks' }))
  return screen.findByRole('dialog', { name: 'Your decks' })
}

beforeEach(async () => {
  useSession.setState(useSession.getInitialState(), true)
  await deckRepository.save(alpha)
  await deckRepository.save(beta)
  useSession.getState().loadDeck(beta)
})
afterEach(() => vi.restoreAllMocks())

describe('DeckMenu', () => {
  it('lists decks and marks the open one', async () => {
    const dialog = await openMenu()
    expect(await within(dialog).findByText('Alpha')).toBeInTheDocument()
    expect(within(dialog).getByText('Beta')).toBeInTheDocument()
    expect(within(dialog).getByText('Open now')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Open Beta' })).toBeNull()
  })

  it('opens another deck', async () => {
    const dialog = await openMenu()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Open Alpha' }))
    expect(useSession.getState().deckId).toBe('alpha')
    expect(screen.getByRole('dialog', { name: 'Your decks', hidden: true })).not.toHaveAttribute('open')
  })

  it('creates a new deck', async () => {
    const dialog = await openMenu()
    await userEvent.click(within(dialog).getByRole('button', { name: 'New deck' }))
    await waitFor(() => expect(useSession.getState().text).toBe('# Untitled deck\n'))
    expect((await deckRepository.list()).map((deck) => deck.title)).toContain('Untitled deck')
  })

  it('needs a second click to delete a deck', async () => {
    const dialog = await openMenu()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Delete Alpha' }))
    expect(await deckRepository.get('alpha')).not.toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm deleting Alpha' }))
    await waitFor(async () => expect(await deckRepository.get('alpha')).toBeNull())
  })

  it('opens another deck when the open deck is deleted', async () => {
    const dialog = await openMenu()
    await userEvent.click(await within(dialog).findByRole('button', { name: 'Delete Beta' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm deleting Beta' }))
    await waitFor(() => expect(useSession.getState().deckId).toBe('alpha'))
  })

  it('shows a notice when saved decks cannot be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    await openMenu()
    await waitFor(() => expect(useSession.getState().notice?.kind).toBe('error'))
    expect(useSession.getState().notice?.message).toMatch(/could not be read/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/decks`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement**

`src/features/decks/readMarkdownFile.ts`:

```ts
const MARKDOWN_FILE = /\.(md|markdown)$/i
const MAX_BYTES = 2 * 1024 * 1024

/** Every error message is written for the person importing the file. */
export async function readMarkdownFile(file: File): Promise<string> {
  if (!MARKDOWN_FILE.test(file.name)) {
    throw new Error(`"${file.name}" isn't a Markdown file. Choose a file ending in .md or .markdown.`)
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" is larger than 2 MB, which is too large to edit comfortably. Split it into smaller decks.`)
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    throw new Error(`"${file.name}" couldn't be read. Try choosing it again.`)
  }
  if (text.includes('\u0000')) {
    throw new Error(`"${file.name}" isn't a text file.`)
  }
  return text
}
```

`src/features/decks/ImportControl.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { deckRepository, errorMessage, openNewDeck, useSession } from '@/core/deck'
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
    const { setNotice } = useSession.getState()
    if (!file || rest.length > 0) {
      setNotice({ kind: 'error', message: 'Import one Markdown file at a time.' })
      return
    }
    try {
      setPending({ name: file.name, text: await readMarkdownFile(file) })
    } catch (error) {
      setNotice({ kind: 'error', message: errorMessage(error) })
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
          <p>Add it as a new deck, or replace the text of the deck you have open. You can undo a replace.</p>
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
```

`src/features/decks/ImportControl.module.css`:

```css
.dropHint {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: grid;
  place-items: center;
  margin: 0;
  border: 3px dashed var(--color-viridian);
  background: rgb(23 112 95 / 0.16);
  color: var(--color-ink);
  font-size: 1.25rem;
  font-weight: 600;
  pointer-events: none;
}
```

`src/features/decks/DeckMenu.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react'
import {
  deckRepository,
  errorMessage,
  openInitialDeck,
  openNewDeck,
  useSession,
  type Deck,
} from '@/core/deck'
import { Button } from '@/shared/button'
import { Dialog, DialogActions, DialogBody } from '@/shared/dialog'
import styles from './DeckMenu.module.css'

const BLANK_DECK = '# Untitled deck\n'
const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

const report = (error: unknown) =>
  useSession.getState().setNotice({ kind: 'error', message: errorMessage(error) })

export function DeckMenu() {
  const [open, setOpen] = useState(false)
  const [decks, setDecks] = useState<Deck[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const currentId = useSession((state) => state.deckId)

  const refresh = useCallback(async () => {
    try {
      setDecks(await deckRepository.list())
    } catch (error) {
      report(error)
    }
  }, [])

  useEffect(() => {
    if (open) void refresh()
  }, [open, refresh])

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
      report(error)
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
      <Button onClick={() => setOpen(true)}>Decks</Button>
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
                  <Button aria-label={`Confirm deleting ${deck.title}`} onClick={() => void remove(deck)}>
                    Confirm delete
                  </Button>
                ) : (
                  <Button aria-label={`Delete ${deck.title}`} onClick={() => setConfirmingId(deck.id)}>
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
```

`src/features/decks/DeckMenu.module.css`:

```css
.list {
  display: grid;
  gap: 8px;
  max-height: 50vh;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-hairline);
}

.meta {
  display: grid;
  flex: 1;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date {
  color: var(--color-ink-soft);
  font-size: 0.875rem;
}

.current {
  padding: 0 14px;
  color: var(--color-viridian);
  font-weight: 600;
}
```

`src/features/decks/index.ts`:

```ts
export { DeckMenu } from './DeckMenu'
export { ImportControl } from './ImportControl'
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/features/decks`
Expected: PASS.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/features/decks
git commit -m "feat(decks): deck menu and .md import with new-deck or replace choice"
```

---

### Task 11: App shell, notices and composition

**Files:**
- Modify: `src/app/App.tsx`, `src/app/App.module.css`, `src/app/App.test.tsx` (replace the Task 1 placeholder versions completely)
- Create: `src/app/NoticeBar.tsx`, `src/app/NoticeBar.module.css`
- Test: `src/app/NoticeBar.test.tsx`, `src/app/App.test.tsx`

**Interfaces:**
- Consumes: everything produced by Tasks 2 to 10, only through the public entry points: `@/core/deck` (`useSession`, `deriveTitle`, `deckRepository`, `openInitialDeck`, `startRenderSync`, `startAutosave`), `@/features/{decks,editor,export,present,preview}`, `@/shared/split-pane`, `@/shared/slide-view`, `@/shared/button`, `@/shared/classNames`.
- Produces: `App` (no props). It is the only module that composes features. Behavior: on mount it starts render sync and autosave and opens the initial deck once (guarded against React StrictMode's double effect); until a deck is open it shows "Opening your decks..."; the header shows the deck title (first heading), Decks, Import, Export PDF and Present; theme CSS is injected once; `PrintRoot` is a sibling of `#app-shell`; `PresentMode` is rendered only in present mode; the editor is mounted with `key={deckId}` so switching decks gives a fresh document and undo history.

- [ ] **Step 1: Write the failing tests**

`src/app/NoticeBar.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it } from 'vitest'
import { useSession } from '@/core/deck'
import { NoticeBar } from './NoticeBar'

beforeEach(() => useSession.setState(useSession.getInitialState(), true))

it('renders nothing without a notice', () => {
  const { container } = render(<NoticeBar />)
  expect(container).toBeEmptyDOMElement()
})

it('announces errors as alerts and info as status, and can be dismissed', async () => {
  render(<NoticeBar />)
  act(() => useSession.getState().setNotice({ kind: 'error', message: 'Storage is full.' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Storage is full.')

  act(() => useSession.getState().setNotice({ kind: 'info', message: 'Choose Save as PDF.' }))
  expect(screen.getByRole('status')).toHaveTextContent('Choose Save as PDF.')

  await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
  expect(useSession.getState().notice).toBeNull()
})
```

`src/app/App.test.tsx` (replaces the Task 1 test):

```tsx
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
    expect(within(header).getByRole('heading', { level: 1, name: 'Your first deck' })).toBeInTheDocument()
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
    await waitFor(() => expect(localStorage.getItem('markdown-slides:decks')).toContain('Persisted deck'), {
      timeout: 3000,
    })
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app`
Expected: FAIL (`./NoticeBar` not found; App assertions fail against the Task 1 placeholder).

- [ ] **Step 3: Implement**

`src/app/NoticeBar.tsx`:

```tsx
import { useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { classNames } from '@/shared/classNames'
import styles from './NoticeBar.module.css'

export function NoticeBar() {
  const notice = useSession((state) => state.notice)
  if (!notice) return null

  return (
    <div
      role={notice.kind === 'error' ? 'alert' : 'status'}
      className={classNames(styles.notice, notice.kind === 'error' && styles.error)}
    >
      <p className={styles.message}>{notice.message}</p>
      <Button onClick={() => useSession.getState().setNotice(null)}>Dismiss</Button>
    </div>
  )
}
```

`src/app/NoticeBar.module.css`:

```css
.notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-hairline);
  border-left: 4px solid var(--color-viridian);
  background: var(--color-mount);
}

.error {
  border-left-color: var(--color-rust);
}

.message {
  margin: 0;
}
```

`src/app/App.tsx` (replaces the placeholder):

```tsx
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
```

`src/app/App.module.css` (replaces the placeholder):

```css
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-hairline);
  background: var(--color-mount);
}

.title {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 1.1rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.main {
  flex: 1;
  min-height: 0;
}

.loading {
  margin: 0;
  padding: 24px;
  color: var(--color-ink-soft);
}
```

- [ ] **Step 4: Run the whole unit suite to verify it passes**

Run: `npx vitest run`
Expected: PASS for all tests in Tasks 1 to 11. This also confirms Marp Core renders in a DOM environment end to end (spec section 7, first gate); the real-browser confirmation comes in Task 12.

- [ ] **Step 5: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`
Expected: PASS.

```bash
git add src/app
git commit -m "feat(app): compose editor, preview, present, export and decks into the workspace"
```

---

### Task 12: End-to-end verification, quality gates and handoff

**Files:**
- Create: `playwright.config.ts`, `e2e/app.spec.ts`, `README.md`
- Modify: `tsconfig.node.json` (include the e2e files), any source file Knip flags

**Interfaces:**
- Consumes: the finished app served from a production build.
- Produces: a passing end-to-end suite in Chromium that proves the success criteria the unit tests cannot (real layout, real print engine, real focus), a clean `npm run check`, and a README.

- [ ] **Step 1: Configure Playwright and TypeScript for the e2e files**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
})
```

In `tsconfig.node.json`, set `"include": ["vite.config.ts", "playwright.config.ts", "e2e"]` and make sure `compilerOptions.lib` contains `"DOM"` (the browser-side callbacks in the e2e file use `File` and `DataTransfer`) and `compilerOptions.types` contains `"node"` (install `@types/node` as a dev dependency if the template did not).

```bash
npx playwright install chromium
```

- [ ] **Step 2: Write the end-to-end tests**

`e2e/app.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const editor = (page: Page) => page.getByRole('textbox', { name: 'Slide Markdown' })
const railButtons = (page: Page) => page.getByRole('button', { name: /Go to slide/ })
const importDialog = (page: Page) => page.getByRole('dialog', { name: 'Import Markdown file' })
const deckTitle = (page: Page) => page.getByRole('banner').getByRole('heading', { level: 1 })

async function writeDeck(page: Page, markdown: string) {
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.type(markdown)
}

const THREE_SLIDES = '# One\n\n---\n\n# Two\n\n---\n\n# Three'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(railButtons(page)).toHaveCount(3) // the starter deck
})

test('the preview follows typing and the cursor', async ({ page }) => {
  await writeDeck(page, THREE_SLIDES)
  await expect(railButtons(page)).toHaveCount(3)
  await page.keyboard.press('ControlOrMeta+Home')
  await expect(page.getByRole('group', { name: 'Slide 1 of 3' })).toBeVisible()
  await page.getByRole('button', { name: 'Go to slide 3' }).click()
  await expect(page.getByRole('group', { name: 'Slide 3 of 3' })).toBeVisible()
})

test('edits are saved and restored after a reload', async ({ page }) => {
  await writeDeck(page, '# Saved deck\n')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('markdown-slides:decks')))
    .toContain('Saved deck')
  await page.reload()
  await expect(deckTitle(page)).toHaveText('Saved deck')
  await expect(editor(page)).toContainText('Saved deck')
})

test('presents with keyboard navigation and a presenter view', async ({ page }) => {
  await writeDeck(page, THREE_SLIDES)
  await expect(railButtons(page)).toHaveCount(3)
  await page.keyboard.press('ControlOrMeta+Home')
  await page.getByRole('button', { name: 'Present' }).click()
  await expect(page.getByRole('dialog', { name: 'Presentation' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('p')
  await expect(page.getByText('2 / 3')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Presentation' })).toBeHidden()
})

test('the PDF has one 16:9 page per slide', async ({ page }) => {
  await writeDeck(page, THREE_SLIDES)
  await expect(railButtons(page)).toHaveCount(3)
  await page.emulateMedia({ media: 'print' })
  const pdf = await PDFDocument.load(await page.pdf({ preferCSSPageSize: true, printBackground: true }))
  expect(pdf.getPageCount()).toBe(3)
  const { width, height } = pdf.getPage(0).getSize()
  expect(Math.round(width)).toBe(960) // 1280 CSS px
  expect(Math.round(height)).toBe(540) // 720 CSS px
})

test('imports a file as a new deck through the picker', async ({ page }) => {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'talk.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Imported talk\n'),
  })
  await importDialog(page).getByRole('button', { name: 'New deck' }).click()
  await expect(deckTitle(page)).toHaveText('Imported talk')
})

test('replace overwrites the open deck and undo brings it back', async ({ page }) => {
  await writeDeck(page, '# Original\n')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'new.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Replacement\n'),
  })
  await importDialog(page).getByRole('button', { name: 'Replace current deck' }).click()
  await expect(editor(page)).toContainText('Replacement')
  await editor(page).click()
  await page.keyboard.press('ControlOrMeta+Z')
  await expect(editor(page)).toContainText('Original')
})

test('cancel leaves the open deck untouched', async ({ page }) => {
  await writeDeck(page, '# Keep me\n')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'other.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Other\n'),
  })
  await importDialog(page).getByRole('button', { name: 'Cancel' }).click()
  await expect(editor(page)).toContainText('Keep me')
  await expect(editor(page)).not.toContainText('Other')
})

test('imports a dropped file', async ({ page }) => {
  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer()
    transfer.items.add(new File(['# Dropped deck\n'], 'dropped.md', { type: 'text/markdown' }))
    return transfer
  })
  await page.dispatchEvent('body', 'dragover', { dataTransfer })
  await expect(page.getByText('Drop a .md file to import it')).toBeVisible()
  await page.dispatchEvent('body', 'drop', { dataTransfer })
  await importDialog(page).getByRole('button', { name: 'New deck' }).click()
  await expect(deckTitle(page)).toHaveText('Dropped deck')
})

test('switching decks right after an edit does not lose the edit', async ({ page }) => {
  await writeDeck(page, '# Quick edit\n')
  await page.getByRole('button', { name: 'Decks' }).click()
  const menu = page.getByRole('dialog', { name: 'Your decks' })
  await menu.getByRole('button', { name: 'New deck' }).click()
  await expect(deckTitle(page)).toHaveText('Untitled deck')
  await page.getByRole('button', { name: 'Decks' }).click()
  await expect(menu.getByText('Quick edit')).toBeVisible()
})
```

- [ ] **Step 3: Run the end-to-end suite**

Run: `npm run test:e2e`
Expected: all tests pass.

Failure guidance (fix the cause, never loosen the assertion):
- PDF page count off by one: look for a trailing blank page in `src/styles/print.css` (`break-after` must not apply to the last page) or content spilling past 720px.
- PDF page size not 960 by 540 pt: confirm the `@page` rule survived CSS bundling in the production build (`dist/assets/*.css`).
- Present test fails on Escape: headless Chromium may handle Escape in fullscreen before the page sees it; the `fullscreenchange` handler in `PresentMode` should still exit. Check that handler first.
- A test that types fails intermittently: type with `page.keyboard.type`, not `fill`; CodeMirror is a contenteditable.

If Marp Core fails to render, or the print layout cannot produce one 1280x720 page per slide in a real browser, **stop and return to design review** (spec section 7). The fallback there is a custom unified/remark pipeline behind the same `render` interface.

- [ ] **Step 4: Run every quality gate**

```bash
npm run check
```

Expected: lint, typecheck, Knip and unit tests all pass. For every Knip finding, remove the unused export, file or dependency (or remove the `export` keyword if it is only used inside its own module). Do not add Knip ignore entries to silence a finding. Re-run until clean, then re-run the unit and e2e suites.

Also run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 5: Verify the success criteria by hand**

Run `npm run dev`, then confirm each item and note any that fails:
- [ ] Typing in a 100-slide deck (paste `---`-separated slides repeatedly) shows no perceptible lag in the editor.
- [ ] Present mode runs fullscreen, arrow keys navigate, `P` shows notes, next slide and timer, Escape returns to the editor on the same slide.
- [ ] Exported PDF (print dialog, destination Save as PDF) opens in a PDF viewer with one 16:9 slide per page, selectable text and sharp graphics.
- [ ] Under 760 px wide the editor and preview stack vertically and nothing overflows sideways.
- [ ] Keyboard only: every control is reachable, focus is always visible, the split handle moves with the arrow keys.
- [ ] Importing a `.md` file by picker and by drag-and-drop both ask New deck, Replace or Cancel.
- [ ] With site storage blocked in the browser, the app still opens a deck and explains why it cannot save.

- [ ] **Step 6: Write the README**

`README.md`:

````markdown
# Markdown Slides

Write Markdown, see slides live, present them, and export a PDF. Everything runs in your browser; decks are saved locally.

## Using it

- Start a new slide with a line containing `---`.
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

- `src/core/engine`: the only code that touches Marp. `render(markdown)` returns slides, theme CSS, notes, line ranges and warnings.
- `src/core/deck`: the session store, render sync, autosave and the `DeckRepository` interface.
- `src/features/*`: editor, preview, present, export, decks. Features never import each other; they share state through `core/deck`.
- `src/shared`: slide view, split pane, button, dialog.

ESLint enforces these boundaries, and Knip fails the build on unused files, exports or dependencies.

## Adding a backend later

- Implement `DeckRepository` and change the one line in `src/core/deck/deckRepository.ts`.
- For a one-click PDF download instead of the print dialog, replace `exportPdf` in `src/features/export` with a call to a server renderer.
````

- [ ] **Step 7: Final verification and commit**

Run: `npm run check && npm run test:e2e && npm run build`
Expected: all pass. (Do not claim completion without having seen this output.)

```bash
git add -A
git commit -m "test: end-to-end journeys, quality gates and README"
```

- [ ] **Step 8: Present**

Present the result to the user: what was built, the exact commands run for the final verification and their outcomes, any success-criteria item from Step 5 that did not pass, and anything left out of this build (PPTX and standalone HTML export, accounts, cloud storage, a second-window presenter view, an in-gutter marker for directive warnings).