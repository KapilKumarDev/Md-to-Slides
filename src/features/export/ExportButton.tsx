import { selectHasSlides, useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { exportPdf } from './exportPdf'

export function ExportButton() {
  const hasSlides = useSession(selectHasSlides)
  return (
    <Button disabled={!hasSlides} onClick={exportPdf}>
      Export PDF
    </Button>
  )
}
