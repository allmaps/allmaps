import type { CanvasRenderer } from '@allmaps/render/canvas'
import type { ImageSettings, ImageWorkerResponse } from './image.ts'

function report(message: ImageWorkerResponse) {
  self.postMessage(message)
}

// This worker is created only after Render image is selected.
let runtime: Promise<typeof import('@allmaps/render/canvas')> | undefined

self.onmessage = async (event: MessageEvent<ImageSettings>) => {
  let renderer: CanvasRenderer | undefined
  try {
    report({ type: 'progress', message: 'Loading renderer…' })
    runtime ??= import('@allmaps/render/canvas')
    const [{ CanvasRenderer }, { fetchAnnotation }, { validateImageSettings }] =
      await Promise.all([
        runtime,
        import('./examples/data.js'),
        import('./image.ts')
      ])
    const settings = validateImageSettings(event.data)
    report({ type: 'progress', message: 'Loading annotation…' })
    const annotation = await fetchAnnotation(settings.annotationUrl)
    const canvas = new OffscreenCanvas(settings.width, settings.height)
    renderer = new CanvasRenderer(canvas, {
      createRTree: false,
      fetchFn: async (input, options) =>
        fetch(input, {
          ...options,
          signal: AbortSignal.any([
            ...(options?.signal ? [options.signal] : []),
            AbortSignal.timeout(30000)
          ])
        })
    })
    const results = renderer.addGeoreferenceAnnotation(annotation)
    const failure = results.find((result) => !result.ok)
    if (failure) throw failure.error
    const bounds = renderer.warpedMapList.getMapsBbox()
    if (!results.length || !bounds?.every(Number.isFinite)) {
      throw new Error(
        'This annotation does not contain any georeferenced maps with a valid extent.'
      )
    }
    // The renderer reports failed images/tiles as events; do not export a partial image.
    const failed = new Promise<never>((_, reject) => {
      const onError = (event: Event) => {
        const error = (event as Event & { error?: Error }).error
        reject(
          new Error(
            `Could not load the map image${error?.message ? `: ${error.message}` : '. Try another example.'}`
          )
        )
      }
      renderer!.addEventListener('imageinfofetcherror', onError)
      renderer!.addEventListener('error', onError)
      renderer!.tileCache.addEventListener('tilefetcherror', onError)
    })
    report({
      type: 'progress',
      message: 'Loading IIIF tiles and rendering image…'
    })
    await Promise.race([renderer.render(), failed])
    if (settings.format === 'jpeg') {
      renderer.context.globalCompositeOperation = 'destination-over'
      renderer.context.fillStyle = '#fff'
      renderer.context.fillRect(0, 0, settings.width, settings.height)
    }
    const blob = await canvas.convertToBlob({
      type: `image/${settings.format}`
    })
    if (blob.type !== `image/${settings.format}`) {
      throw new Error(
        `Your browser does not support exporting ${settings.format.toUpperCase()}.`
      )
    }
    report({ type: 'complete', blob, mapCount: results.length })
  } catch (error) {
    report({
      type: 'error',
      message:
        error instanceof Error ? error.message : 'Could not render the image.'
    })
  } finally {
    renderer?.destroy()
  }
}
