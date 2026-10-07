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
