/**
 * @param {HTMLElement} container
 * @param {AbortSignal} signal
 * @param {import('./types.js').ExampleInitialView} initialView
 */
export async function createExample(container, signal, initialView) {
  const [
    { default: Map },
    { default: View },
    { default: TileLayer },
    { default: OSM },
    { defaults: defaultInteractions },
    { transformExtent },
    { WarpedMapLayer }
  ] = await Promise.all([
    import('ol/Map.js'),
    import('ol/View.js'),
    import('ol/layer/Tile.js'),
    import('ol/source/OSM.js'),
    import('ol/interaction/defaults.js'),
    import('ol/proj.js'),
    import('@allmaps/openlayers'),
    import('ol/ol.css')
  ])

  signal?.throwIfAborted()

  const warpedMapLayer = new WarpedMapLayer({
    warpedMapList: initialView.warpedMapList
  })
  const view = new View({ center: [0, 0], zoom: 2 })
  if (initialView.bounds)
    view.fit(transformExtent(initialView.bounds, 'EPSG:4326', 'EPSG:3857'), {
      size: [container.clientWidth, container.clientHeight],
      padding: [30, 30, 30, 30]
    })
  const map = new Map({
    target: container,
    layers: [new TileLayer({ source: new OSM() }), warpedMapLayer],
    view,
    interactions: defaultInteractions({ onFocusOnly: true })
  })
  const resizeObserver = new ResizeObserver(() => map.updateSize())
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
      const bounds = warpedMapLayer.getBbox({
        projection: { definition: 'EPSG:3857' }
      })
      if (bounds) map.getView().fit(bounds, { padding: [30, 30, 30, 30] })
    },
    destroy() {
      resizeObserver.disconnect()
      map.setTarget(undefined)
      map.dispose()
    }
  }
}
