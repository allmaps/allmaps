import type { MaybeView, View } from '../types/shared.js'

export type TourTarget = {
  selector: string
  fallbackSelector?: string
  view?: MaybeView
  popover?: 'info' | 'maps' | 'mapSettings' | 'geocoder' | 'export'
  available?: boolean
}

export function getTourViewTarget(
  view: View,
  availability: { canEdit: boolean; resultsEnabled: boolean }
): TourTarget {
  const buttonSelector = `[data-tour="editor-${view}"]`
  const enabled =
    view === 'results'
      ? availability.resultsEnabled
      : view === 'mask' || view === 'georeference'
        ? availability.canEdit
        : true

  if (!enabled) {
    return { selector: buttonSelector }
  }

  return {
    selector: `[data-tour="editor-${view}-view"]`,
    fallbackSelector: buttonSelector,
    view
  }
}

// Resolve destinations when navigating, since maps and GCPs can change during
// the tour. Both Next and Back use the same availability and fallback rules.
export async function prepareTourStep(
  steps: { target: () => TourTarget }[],
  activeIndex: number,
  direction: 1 | -1,
  environment: {
    isActive: () => boolean
    prepare: (target: TourTarget) => Promise<void>
    waitForElement: (selector: string) => Promise<Element | undefined>
  }
): Promise<{ index: number; selector: string } | undefined> {
  let index = activeIndex + direction

  while (index >= 0 && index < steps.length) {
    if (!environment.isActive()) {
      return
    }

    const target = steps[index].target()
    if (target.available === false) {
      index += direction
      continue
    }

    await environment.prepare(target)
    if (!environment.isActive()) {
      return
    }

    const element = await environment.waitForElement(target.selector)
    if (!environment.isActive()) {
      return
    }

    // Driver displays a centered popover if even the fallback is missing.
    // Never leave the tour stuck waiting for a panel that cannot be mounted.
    return {
      index,
      selector: element
        ? target.selector
        : target.fallbackSelector || '[data-tour="editor-workflow"]'
    }
  }

  if (index >= steps.length && environment.isActive()) {
    return { index, selector: '' }
  }
}
