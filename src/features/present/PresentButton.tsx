import { selectHasSlides, useSession } from '@/core/deck'
import { Button } from '@/shared/button'
import { enterPresent } from './enterPresent'

export function PresentButton() {
  const hasSlides = useSession(selectHasSlides)
  return (
    <Button
      variant="primary"
      disabled={!hasSlides}
      title="Press P while presenting to show the presenter view"
      onClick={() => void enterPresent()}
    >
      Present
    </Button>
  )
}
