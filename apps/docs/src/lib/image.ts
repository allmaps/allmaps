import { validateAnnotationUrl } from '@allmaps/ui/examples/source'

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
  return `import { Viewport } from '@allmaps/render'
import { WasmRenderer } from '@allmaps/render/wasm'
import initializeWasm, * as wasmModule from '@allmaps/render-wasm'

// Run this code in a Web Worker to keep the page responsive.
await initializeWasm()

const response = await fetch(${JSON.stringify(settings.annotationUrl)})
if (!response.ok) throw new Error('Could not load the annotation')
const annotation = await response.json()

const renderer = new WasmRenderer(wasmModule, {
  outputFormat: '${settings.format}'${settings.format === 'jpeg' ? ',\n  backgroundColor: [255, 255, 255]' : ''}
})

try {
  const results = renderer.addGeoreferenceAnnotation(annotation)
  const failure = results.find((result) => !result.ok)
  if (failure) throw failure.error
  if (!results.length) throw new Error('No georeferenced maps found')

  const viewport = Viewport.fromSizeAndMaps(
    [${settings.width}, ${settings.height}], renderer.warpedMapList,
    { fit: 'contain' }
  )
  const bytes = await renderer.render(viewport)
  const blob = new Blob([bytes], { type: 'image/${settings.format}' })
  // Send the image back to the page for preview and download.
  self.postMessage({ blob })
} finally {
  renderer.destroy()
}`
}
