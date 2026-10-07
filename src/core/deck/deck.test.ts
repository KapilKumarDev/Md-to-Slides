import { describe, expect, it } from 'vitest'
import { createDeck, deriveTitle } from './deck'

describe('deriveTitle', () => {
  it.each([
    ['# Hello\n', 'Hello'],
    ['---\ntheme: default\n---\n\n## Talk title ##\n', 'Talk title'],
    ['no heading here', 'Untitled deck'],
    ['', 'Untitled deck'],
    ['# Windows title\r\n', 'Windows title'],
  ])('derives a title from %j', (text, title) => {
    expect(deriveTitle(text)).toBe(title)
  })
})

describe('createDeck', () => {
  it('creates a deck with a unique id, derived title and timestamp', () => {
    const a = createDeck('# One')
    const b = createDeck('# One')
    expect(a.id).not.toBe(b.id)
    expect(a.title).toBe('One')
    expect(a.text).toBe('# One')
    expect(a.updatedAt).toBeGreaterThan(0)
  })
})
