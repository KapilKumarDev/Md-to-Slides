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
