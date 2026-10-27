import type { Page } from 'playwright'
import type {
  ScreenshotBounds,
  ScreenshotDefinition
} from '@allmaps/ui/screenshots'

export async function prepareScreenshot(
  page: Page,
  definition: ScreenshotDefinition
) {
  for (const [index, step] of (definition.steps ?? []).entries()) {
    try {
      const locator = page.locator(step.selector)
      switch (step.action) {
        case 'click':
          await locator.click()
          break
        case 'hover':
          await locator.hover()
          break
        case 'fill':
          await locator.fill(step.value)
          break
        case 'select':
          await locator.selectOption(step.value)
          break
        case 'press':
          await locator.press(step.key)
          break
        case 'waitFor':
          await locator.waitFor({ state: step.state ?? 'visible' })
          break
      }
    } catch (error) {
      throw new Error(
        `Screenshot ${definition.slug}, step ${index + 1} (${step.action} ${step.selector}): ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
}

/** Measure crop and targets together without scrolling or changing focus. */
export async function measureCapture(
  page: Page,
  definition: ScreenshotDefinition,
  deadline: number
) {
  const targets = definition.targets ?? {}
  const crop = definition.crop
  const selectors = Object.entries(targets).map(([name, selector]) => [
    `target ${name}`,
    selector
  ])
  if (crop && 'selector' in crop) selectors.push(['crop', crop.selector])
  for (const [name, selector] of selectors) {
    try {
      await page.locator(selector).waitFor({
        state: 'visible',
        timeout: Math.max(1, deadline - Date.now())
      })
    } catch (error) {
      throw new Error(
        `Screenshot ${definition.slug}, ${name}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }
  return page.evaluate(
    ({ targets, viewport, crop }) => {
      function rectangle(selector: string, name: string) {
        const elements = document.querySelectorAll(selector)
        if (elements.length !== 1)
          throw new Error(`Screenshot ${name} must match exactly one element`)
        const rectangle = elements[0].getBoundingClientRect()
        if (
          rectangle.width <= 0 ||
          rectangle.height <= 0 ||
          rectangle.x < 0 ||
          rectangle.y < 0 ||
          rectangle.right > viewport.width ||
          rectangle.bottom > viewport.height
        ) {
          throw new Error(
            `Screenshot ${name} must be fully inside the captured viewport`
          )
        }
        return rectangle
      }
      let capture = {
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height
      }
      if (crop) {
        if ('selector' in crop) {
          const element = rectangle(crop.selector, 'crop')
          const padding = crop.padding ?? 0
          const x = Math.max(0, Math.floor(element.x - padding))
          const y = Math.max(0, Math.floor(element.y - padding))
          capture = {
            x,
            y,
            width:
              Math.min(viewport.width, Math.ceil(element.right + padding)) - x,
            height:
              Math.min(viewport.height, Math.ceil(element.bottom + padding)) - y
          }
        } else {
          capture = crop
        }
      }
      const bounds: Record<string, ScreenshotBounds> = {}
      for (const [name, selector] of Object.entries(targets)) {
        const element = rectangle(selector, `target ${name}`)
        if (
          element.x < capture.x ||
          element.y < capture.y ||
          element.right > capture.x + capture.width ||
          element.bottom > capture.y + capture.height
        ) {
          throw new Error(
            `Screenshot target ${name} must be fully inside the crop`
          )
        }
        bounds[name] = {
          x: element.x - capture.x,
          y: element.y - capture.y,
          width: element.width,
          height: element.height
        }
      }
      return {
        bounds,
        ...(crop ? { crop: capture } : {}),
        scroll: { x: window.scrollX, y: window.scrollY }
      }
    },
    { targets, viewport: definition.viewport, crop }
  )
}
