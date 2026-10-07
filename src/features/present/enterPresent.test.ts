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
