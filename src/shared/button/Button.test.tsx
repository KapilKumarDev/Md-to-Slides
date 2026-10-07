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
  render(
    <Button disabled onClick={onClick}>
      Save
    </Button>,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onClick).not.toHaveBeenCalled()
})
