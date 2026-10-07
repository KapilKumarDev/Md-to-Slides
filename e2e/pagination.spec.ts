import { expect, test, type Page } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

const railButtons = (page: Page) => page.getByRole('button', { name: /Go to slide/ })

const bullets = (count: number) =>
  Array.from({ length: count }, (_, i) => `- Point ${i + 1} explains one idea in a full sentence`)
const words = (count: number) => Array.from({ length: count }, (_, i) => `word${i}`).join(' ')

// One slide per `---` block, none of them short enough to fit.
const LONG_DOCUMENT = [
  '# Report',
  '',
  ...bullets(40),
  '',
  '---',
  '',
  '## Notes',
  '',
  words(400),
  '',
  '---',
  '',
  '## Code',
  '',
  '```ts',
  ...Array.from({ length: 45 }, (_, i) => `const value${i} = compute(${i})`),
  '```',
  '',
  '---',
  '',
  '## Data',
  '',
  '| name | value |',
  '|------|-------|',
  ...Array.from({ length: 30 }, (_, i) => `| row ${i} | ${i} |`),
].join('\n')

async function importAsNewDeck(page: Page, markdown: string) {
  await page.locator('input[type="file"]').setInputFiles({
    name: 'long.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(markdown),
  })
  await page
    .getByRole('dialog', { name: 'Import Markdown file' })
    .getByRole('button', { name: 'New deck' })
    .click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(railButtons(page)).toHaveCount(3) // the starter deck
})

test('content that does not fit one slide continues on the next, and nothing overflows', async ({
  page,
}) => {
  await importAsNewDeck(page, LONG_DOCUMENT)
  await expect.poll(() => railButtons(page).count()).toBeGreaterThan(4)

  // Measured with plain geometry, independent of the engine's own check: every element of every
  // slide must sit inside the section's padding box (rects are scaled, so compare in layout px).
  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll('nav[aria-label="Slides"] svg')).map((svg) => {
      const section = (svg.querySelector('section[data-marpit-advanced-background="content"]') ??
        svg.querySelector('section')) as HTMLElement
      const box = section.getBoundingClientRect()
      const scale = box.width / section.offsetWidth
      const style = getComputedStyle(section)
      const inside = Array.from(section.querySelectorAll(':scope > :not(header):not(footer) *'))
      const bottoms = inside.map((el) => el.getBoundingClientRect().bottom)
      const limit = box.bottom - parseFloat(style.paddingBottom) * scale
      return Math.max(0, Math.max(...bottoms) - limit) / scale
    }),
  )
  expect(overflow.length).toBeGreaterThan(4)
  expect(Math.max(...overflow)).toBeLessThanOrEqual(2)
})

test('the PDF has one page for every page of a long slide', async ({ page }) => {
  await importAsNewDeck(page, LONG_DOCUMENT)
  await expect.poll(() => railButtons(page).count()).toBeGreaterThan(4)
  const pages = await railButtons(page).count()
  await page.emulateMedia({ media: 'print' })
  const pdf = await PDFDocument.load(
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  )
  expect(pdf.getPageCount()).toBe(pages)
})