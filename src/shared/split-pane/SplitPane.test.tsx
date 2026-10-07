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
