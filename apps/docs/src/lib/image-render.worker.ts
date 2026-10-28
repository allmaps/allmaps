import type { ImageSettings, ImageWorkerResponse } from './image.ts'

function report(message: ImageWorkerResponse) {
  self.postMessage(message)
}

// This worker is created only after Render image is selected.
let runtime: ReturnType<typeof loadRuntime> | undefined
async function loadRuntime() {
  const [{ Viewport }, { WasmRenderer }, wasmModule, { default: wasmUrl }] =
    await Promise.all([
      import('@allmaps/render'),
      import('@allmaps/render/wasm'),
      import('@allmaps/render-wasm'),
      import('@allmaps/render-wasm/wasm?url')
    ])
  await wasmModule.default({ module_or_path: wasmUrl })
  return { Viewport, WasmRenderer, wasmModule }
}

self.onmessage = async (event: MessageEvent<ImageSettings>) => {
  let renderer:
    | InstanceType<Awaited<ReturnType<typeof loadRuntime>>['WasmRenderer']>
    | undefined
  try {
    report({ type: 'progress', message: 'Loading renderer…' })
    runtime ??= loadRuntime()
    const [
      { Viewport, WasmRenderer, wasmModule },
      { fetchAnnotation },
      { validateImageSettings }
    ] = await Promise.all([
      runtime,
      import('@allmaps/ui/examples/data'),
      import('./image.ts')
    ])
    const settings = validateImageSettings(event.data)
    report({ type: 'progress', message: 'Loading annotation…' })
    const annotation = await fetchAnnotation(settings.annotationUrl)
    renderer = new WasmRenderer(wasmModule, {
      outputFormat: settings.format,
      backgroundColor: settings.format === 'jpeg' ? [255, 255, 255] : undefined,
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
    const viewport = Viewport.fromSizeAndMaps(
      [settings.width, settings.height],
      renderer.warpedMapList,
      { fit: 'contain' }
    )
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
    const bytes = await Promise.race([renderer.render(viewport), failed])
    const blob = new Blob([new Uint8Array(bytes)], {
      type: `image/${settings.format}`
    })
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
