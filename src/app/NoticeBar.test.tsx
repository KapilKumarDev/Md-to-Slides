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
