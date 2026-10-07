import { deriveTitle, selectHasSlides, useSession } from '@/core/deck'

export function exportPdf(): void {
  const state = useSession.getState()

  if (!selectHasSlides(state)) {
    state.setNotice({ kind: 'info', message: 'There are no slides to export yet.' })
    return
  }
  if (typeof window.print !== 'function') {
    state.setNotice({
      kind: 'error',
      message:
        "This browser can't open the print dialog, so a PDF can't be exported here. Try a desktop browser.",
    })
    return
  }

  // Browsers propose the document title as the PDF file name.
  const previousTitle = document.title
  document.title = deriveTitle(state.text)
  try {
    window.print()
  } finally {
    document.title = previousTitle
  }
  state.setNotice({
    kind: 'info',
    message: 'In the print dialog, choose Save as PDF as the destination.',
  })
}
