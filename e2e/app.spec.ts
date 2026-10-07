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

// Four slides, so the starter deck (three) can never satisfy an assertion about the typed deck.
const FOUR_SLIDES = '# One\n\n---\n\n# Two\n\n---\n\n# Three\n\n---\n\n# Four'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(railButtons(page)).toHaveCount(3) // the starter deck
})

test('the preview follows typing and the cursor', async ({ page }) => {
  await writeDeck(page, FOUR_SLIDES)
  await expect(railButtons(page)).toHaveCount(4)
  await page.keyboard.press('ControlOrMeta+Home')
  await expect(page.getByRole('group', { name: 'Slide 1 of 4' })).toBeVisible()
  await page.getByRole('button', { name: 'Go to slide 4' }).click()
  await expect(page.getByRole('group', { name: 'Slide 4 of 4' })).toBeVisible()
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
  await writeDeck(page, FOUR_SLIDES)
  await expect(railButtons(page)).toHaveCount(4)
  await page.keyboard.press('ControlOrMeta+Home')
  await page.getByRole('button', { name: 'Present' }).click()
  await expect(page.getByRole('dialog', { name: 'Presentation' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('p')
  await expect(page.getByText('2 / 4')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Presentation' })).toBeHidden()
})

test('the PDF has one 16:9 page per slide', async ({ page }) => {
  await writeDeck(page, FOUR_SLIDES)
  await expect(railButtons(page)).toHaveCount(4)
  await page.emulateMedia({ media: 'print' })
  const pdf = await PDFDocument.load(
    await page.pdf({ preferCSSPageSize: true, printBackground: true }),
  )
  expect(pdf.getPageCount()).toBe(4)
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
