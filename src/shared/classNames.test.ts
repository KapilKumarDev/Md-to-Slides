import { expect, it } from 'vitest'
import { classNames } from './classNames'

it('joins truthy parts and skips falsy ones', () => {
  expect(classNames('a', false, undefined, 'b')).toBe('a b')
  expect(classNames()).toBe('')
})
