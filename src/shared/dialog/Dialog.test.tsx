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
