import '@testing-library/jest-dom/vitest'

afterEach(() => {
  localStorage.clear()
})

// jsdom does not implement the modal methods of <dialog>.
HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
}

// CodeMirror measures text through Range geometry, which jsdom does not provide.
const emptyRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  toJSON: () => ({}),
} as DOMRect
Range.prototype.getBoundingClientRect ??= () => emptyRect
Range.prototype.getClientRects ??= () =>
  ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList

// Some jsdom versions lack Blob.text().
Blob.prototype.text ??= function text(this: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(this)
  })
}
