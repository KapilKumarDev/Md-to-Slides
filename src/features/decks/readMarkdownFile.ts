const MARKDOWN_FILE = /\.(md|markdown)$/i
const MAX_BYTES = 2 * 1024 * 1024

/** Every error message is written for the person importing the file. */
export async function readMarkdownFile(file: File): Promise<string> {
  if (!MARKDOWN_FILE.test(file.name)) {
    throw new Error(
      `"${file.name}" isn't a Markdown file. Choose a file ending in .md or .markdown.`,
    )
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `"${file.name}" is larger than 2 MB, which is too large to edit comfortably. Split it into smaller decks.`,
    )
  }

  let text: string
  try {
    text = await file.text()
  } catch {
    throw new Error(`"${file.name}" couldn't be read. Try choosing it again.`)
  }
  if (text.includes('\u0000')) {
    throw new Error(`"${file.name}" isn't a text file.`)
  }
  return text
}
