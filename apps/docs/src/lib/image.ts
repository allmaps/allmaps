import { validateAnnotationUrl } from './examples/source.ts'

export type ImageSettings = {
  annotationUrl: string
  width: number
  height: number
  format: 'png' | 'webp' | 'jpeg'
}

export type ImageWorkerResponse =
  | { type: 'progress'; message: string }
  | { type: 'complete'; blob: Blob; mapCount: number }
  | { type: 'error'; message: string }

export function validateImageSettings(settings: ImageSettings): ImageSettings {
  for (const dimension of [settings.width, settings.height]) {
    if (!Number.isInteger(dimension) || dimension < 64 || dimension > 2048) {
      throw new Error('Choose a width and height between 64 and 2,048 pixels.')
    }
  }
  if (!['png', 'webp', 'jpeg'].includes(settings.format)) {
    throw new Error('Choose PNG, JPEG, or WebP.')
  }
  return {
    ...settings,
    annotationUrl: validateAnnotationUrl(settings.annotationUrl.trim())
  }
}

export function imageExampleSource(settings: ImageSettings) {
  return `import { CanvasRenderer } from '@allmaps/render/canvas'

// Run this code in a Web Worker to keep the page responsive.
const response = await fetch(${JSON.stringify(settings.annotationUrl)})
if (!response.ok) throw new Error('Could not load the annotation')
const annotation = await response.json()

const canvas = new OffscreenCanvas(${settings.width}, ${settings.height})
const renderer = new CanvasRenderer(canvas)

try {
  const results = renderer.addGeoreferenceAnnotation(annotation)
  const failure = results.find((result) => !result.ok)
  if (failure) throw failure.error
  if (!results.length) throw new Error('No georeferenced maps found')

  await renderer.render()${
    settings.format === 'jpeg'
      ? `
  // Fill transparent areas with white before encoding as JPEG.
  renderer.context.globalCompositeOperation = 'destination-over'
  renderer.context.fillStyle = '#fff'
  renderer.context.fillRect(0, 0, canvas.width, canvas.height)`
      : ''
  }
  const blob = await canvas.convertToBlob({ type: 'image/${settings.format}' })
  // Send the image back to the page for preview and download.
  self.postMessage({ blob })
} finally {
  renderer.destroy()
}`
}
