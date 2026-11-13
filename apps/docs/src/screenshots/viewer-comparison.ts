import { defineScreenshot } from '@allmaps/ui/screenshots'

export const lynnAtlasViewerUrl =
  'https://viewer.allmaps.org/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmanifests%2F23379602e8187445'

const backgroundControl = 'button[data-checkbox-root]'
const imageViewControl = 'button[aria-label="Show image view"]'
const zoomInControl = 'button[aria-label="Zoom in"]'
const zoomOutControl = 'button[aria-label="Zoom out"]'

const capture = {
  url: lynnAtlasViewerUrl,
  viewport: { width: 1067, height: 667, deviceScaleFactor: 1 },
  waitForRender: true
}

export const viewerMapMode = defineScreenshot({
  ...capture,
  slug: 'viewer-lynn-atlas'
})

export const viewerBackgroundRemoved = defineScreenshot({
  ...capture,
  slug: 'viewer-lynn-atlas-background-removed',
  version: 2,
  steps: [
    { action: 'click', selector: backgroundControl },
    { action: 'click', selector: zoomInControl },
    { action: 'click', selector: zoomInControl },
    { action: 'click', selector: zoomInControl },
    // Park the pointer in the gap between the zoom buttons.
    {
      action: 'hover',
      selector: `div:has(> ${zoomInControl}):has(> ${zoomOutControl})`
    }
  ],
  waitForSelector: `${backgroundControl}[aria-checked="true"]`,
  targets: { background: backgroundControl }
})

export const viewerImageMode = defineScreenshot({
  ...capture,
  slug: 'viewer-lynn-atlas-image-mode',
  steps: [
    { action: 'click', selector: imageViewControl },
    { action: 'click', selector: 'button[aria-label="Zoom to extent"]' }
  ],
  waitForSelector: `${imageViewControl}[aria-pressed="true"]`,
  targets: {
    view: `div:has(> button[aria-label="Show map view"]):has(> ${imageViewControl})`
  }
})
