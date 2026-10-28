/**
 * @param {HTMLElement} container
 * @param {AbortSignal} signal
 * @param {import('./types.js').ExampleInitialView} view
 */
export async function createExample(container, signal, view) {
  const [{ Map, NavigationControl, setWorkerUrl }, { WarpedMapLayer }, worker] =
    await Promise.all([
      import('maplibre-gl'),
      import('@allmaps/maplibre'),
      import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'),
      import('maplibre-gl/dist/maplibre-gl.css')
    ])

  signal?.throwIfAborted()

  setWorkerUrl(worker.default)
  const map = new Map({
    container,
    style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    maxPitch: 0,
    ...(view.bounds
      ? { bounds: view.bounds, fitBoundsOptions: { padding: 30 } }
      : {}),
    cooperativeGestures: true
  })
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
  const warpedMapLayer = new WarpedMapLayer({
    warpedMapList: view.warpedMapList
  })

  /** @type {(error: Error) => void} */
  let rejectReady = () => {}
  /** @type {Promise<void>} */
  const ready = new Promise((resolve, reject) => {
    rejectReady = reject
    map.once('load', () => {
      map.addLayer(warpedMapLayer)
      resolve()
    })
    map.once('error', (event) => reject(event.error))
  })
  const resizeObserver = new ResizeObserver(() => map.resize())
  resizeObserver.observe(container)

  return {
    ready,
    warpedMapLayer,
    get renderer() {
      return warpedMapLayer.renderer
    },
    getBounds() {
      return warpedMapLayer.getBbox()
    },
    fitBounds() {
      const bounds = warpedMapLayer.getBounds()
      if (bounds) map.fitBounds(bounds, { padding: 30, duration: 0 })
    },
    destroy() {
      resizeObserver.disconnect()
      rejectReady(new DOMException('The example was closed.', 'AbortError'))
      map.remove()
    }
  }
}
