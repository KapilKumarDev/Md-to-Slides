import { LINE_ATTR, lineOf } from './section'

/** A place to cut a block, and the source line (relative to the slide) of what follows it. */
interface Cut {
  node: Node
  offset: number
  line: number
}

/** A cut at the very start of an inline element would leave an empty one (a stray code pill) behind. */
function hoist(node: Node, offset: number, root: Element): Pick<Cut, 'node' | 'offset'> {
  while (offset === 0 && node !== root && node.parentNode) {
    offset = [...node.parentNode.childNodes].indexOf(node as ChildNode)
    node = node.parentNode
  }
  return { node, offset }
}

function betweenChildren(parent: Element, children: Element[]): Cut[] {
  return children.slice(1).map((child) => ({
    node: parent,
    offset: [...parent.childNodes].indexOf(child),
    line: lineOf(child),
  }))
}

function betweenLines(pre: Element): Cut[] {
  const text = pre.textContent ?? ''
  const firstLine = lineOf(pre) + 1 // the line after the opening fence
  const cuts: Cut[] = []
  const walker = pre.ownerDocument.createTreeWalker(pre, NodeFilter.SHOW_TEXT)
  let before = 0
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    for (let at = node.data.indexOf('\n'); at !== -1; at = node.data.indexOf('\n', at + 1)) {
      const next = before + at + 1
      if (next < text.length) cuts.push({ node, offset: at + 1, line: firstLine + cuts.length + 1 })
    }
    before += node.data.length
  }
  return cuts
}

function betweenWords(paragraph: Element): Cut[] {
  const cuts: Cut[] = []
  const walker = paragraph.ownerDocument.createTreeWalker(
    paragraph,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  )
  const firstLine = lineOf(paragraph)
  let breaks = 0 // each <br> is one source line break
  let seenWord = false
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if ((node as Element).tagName === 'BR') breaks++
      continue
    }
    for (const word of (node as Text).data.matchAll(/\S+/g)) {
      if (seenWord) cuts.push({ ...hoist(node, word.index, paragraph), line: firstLine + breaks })
      seenWord = true
    }
  }
  return cuts
}

// ponytail: a list item, table row or code block is cut as a whole unit at most one level deep;
// nested lists are never split inside an item. Add recursion if one item must span pages.
function cutsOf(el: Element): Cut[] {
  switch (el.tagName) {
    case 'UL':
    case 'OL':
    case 'BLOCKQUOTE':
      return betweenChildren(el, [...el.children])
    case 'TABLE': {
      const body = el.querySelector('tbody')
      return body ? betweenChildren(body, [...body.children]) : []
    }
    case 'PRE':
      return betweenLines(el)
    case 'P':
      return betweenWords(el)
    default:
      return []
  }
}

/** Lists, tables, code and quotes continue on the next page; a paragraph moves whole when it can. */
export const fillsPage = (el: Element) =>
  ['UL', 'OL', 'TABLE', 'PRE', 'BLOCKQUOTE'].includes(el.tagName)

/** How many pieces `el` can be cut into. 1 means it is atomic. */
export function unitCount(el: Element): number {
  return cutsOf(el).length + 1
}

/** Cuts a copy of `el` after its first `keep` units. `el` itself is not touched. */
export function splitAfter(el: Element, keep: number) {
  const doc = el.ownerDocument
  const head = doc.createElement('div').appendChild(el.cloneNode(true) as Element)
  const cut = cutsOf(head)[keep - 1]
  if (!cut) throw new RangeError(`Cannot keep ${keep} units of <${el.tagName.toLowerCase()}>`)

  // Cutting from inside `head` to just after it makes the browser clone every partly
  // selected ancestor (a <ul>, a highlighted <span>) into the tail, so both halves stay well formed.
  const range = doc.createRange()
  range.setStart(cut.node, cut.offset)
  range.setEndAfter(head)
  const tail = range.extractContents().firstElementChild as Element

  const header = head.tagName === 'TABLE' ? head.querySelector('thead') : null
  if (header) tail.prepend(header.cloneNode(true))
  if (head.tagName === 'OL')
    tail.setAttribute('start', String(Number(head.getAttribute('start') ?? 1) + keep))
  // The tail starts a new block: a code tail acts as if its fence sat one line above its first line.
  tail.setAttribute(LINE_ATTR, String(cut.line - (head.tagName === 'PRE' ? 1 : 0)))

  return { head, tail, tailLine: cut.line }
}