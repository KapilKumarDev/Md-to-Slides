import { render } from '@testing-library/react'
import { SlideView, ThemeStyle } from './index'

it('renders slide html inside a marpit container and merges a class name', () => {
  const { container } = render(
    <SlideView html='<svg data-marpit-svg=""><text>Hi</text></svg>' className="extra" />,
  )
  const wrapper = container.firstElementChild
  expect(wrapper).toHaveClass('marpit', 'extra')
  expect(wrapper?.querySelector('svg')).not.toBeNull()
})

it('renders theme css in a style element', () => {
  const { container } = render(<ThemeStyle css=".marpit{color:red}" />)
  expect(container.querySelector('style')?.textContent).toBe('.marpit{color:red}')
})
