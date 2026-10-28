/**
 * @param {HTMLElement} container
 * @param {AbortSignal} signal
 * @param {import('./types.js').ExampleInitialView} view
 */
export async function createExample(container, signal, view) {
  const [L, { WarpedMapLayer }] = await Promise.all([
    import('leaflet'),
    import('@allmaps/leaflet'),
    import('leaflet/dist/leaflet.css')
  ])

  signal?.throwIfAborted()

  const map = L.map(container, {
    center: [0, 0],
    zoom: 2,
    zoomSnap: 0,
    zoomAnimationThreshold: 1,
    scrollWheelZoom: false
  })
  map.zoomControl.setPosition('topright')
  const bounds = view.bounds
  if (bounds)
    map.fitBounds(
      [
        [bounds[1], bounds[0]],
        [bounds[3], bounds[2]]
      ],
      {
        padding: [30, 30],
        animate: false
      }
    )
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map)
  const warpedMapLayer = new WarpedMapLayer(undefined, {
    warpedMapList: view.warpedMapList
  }).addTo(map)
  const resizeObserver = new ResizeObserver(() => map.invalidateSize())
  resizeObserver.observe(container)

  return {
    ready: Promise.resolve(),
    warpedMapLayer,
    get renderer() {
      return warpedMapLayer.renderer
    },
    getBounds() {
      return warpedMapLayer.getBbox()
    },
    fitBounds() {
      const bounds = warpedMapLayer.getBounds()
      if (bounds) map.fitBounds(bounds, { padding: [30, 30], animate: false })
    },
    destroy() {
      resizeObserver.disconnect()
      map.remove()
    }
  }
}
