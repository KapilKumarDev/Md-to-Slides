export interface Deck {
  id: string
  title: string
  text: string
  updatedAt: number
}

const UNTITLED = 'Untitled deck'
const HEADING = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m

export function deriveTitle(text: string): string {
  return HEADING.exec(text)?.[1]?.trim() || UNTITLED
}

export function createDeck(text: string): Deck {
  return { id: crypto.randomUUID(), title: deriveTitle(text), text, updatedAt: Date.now() }
}
