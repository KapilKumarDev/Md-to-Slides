import { describe, expect, it } from 'vitest'
import { readMarkdownFile } from './readMarkdownFile'

const file = (parts: BlobPart[], name: string) => new File(parts, name, { type: 'text/markdown' })

describe('readMarkdownFile', () => {
  it.each(['talk.md', 'talk.markdown', 'TALK.MD'])('reads %s', async (name) => {
    await expect(readMarkdownFile(file(['# Hi\n'], name))).resolves.toBe('# Hi\n')
  })

  it('does not pass a UTF-8 byte order mark through', async () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('# Title')])
    await expect(readMarkdownFile(file([bytes], 'bom.md'))).resolves.toBe('# Title')
  })

  it('keeps Windows line endings for the editor to normalize', async () => {
    await expect(readMarkdownFile(file(['# A\r\n\r\n---\r\n'], 'win.md'))).resolves.toBe(
      '# A\r\n\r\n---\r\n',
    )
  })

  it('rejects other file types', async () => {
    await expect(readMarkdownFile(file(['x'], 'notes.txt'))).rejects.toThrow(
      /"notes.txt" isn't a Markdown file/,
    )
  })

  it('rejects files over 2 MB', async () => {
    const big = file([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.md')
    await expect(readMarkdownFile(big)).rejects.toThrow(/larger than 2 MB/)
  })

  it('rejects binary content with a Markdown name', async () => {
    await expect(readMarkdownFile(file(['a\u0000b'], 'image.md'))).rejects.toThrow(
      /isn't a text file/,
    )
  })
})
