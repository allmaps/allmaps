import assert from 'node:assert/strict'
import { test } from 'node:test'
import { exampleSource } from '../src/lib/examples/source.ts'
import type {
  ExampleBounds,
  ExampleViewMode,
  ExampleLibrary,
  ExampleSettings
} from '../src/lib/examples/types.js'

const settings: ExampleSettings = {
  annotationUrl: 'https://annotations.allmaps.org/maps/example',
  opacity: 0.65,
  transformation: 'thinPlateSpline'
}

async function runCopiedExample(
  selectedSettings: ExampleSettings,
  library: ExampleLibrary,
  viewMode: ExampleViewMode = 'fit'
) {
  const selected: Partial<ExampleSettings> = {}
  const calls: string[] = []
  const pending: Promise<unknown>[] = []
  const bounds: ExampleBounds = [0, 0, 1, 1]
  let mapOptions: { bounds?: ExampleBounds } | undefined
  let sharedList: MockWarpedMapList | undefined
  class MockWarpedMapList {
    constructor(options?: {
      transformationType: ExampleSettings['transformation']
    }) {
      if (options?.transformationType)
        selected.transformation = options.transformationType
      sharedList = this
    }
    addGeoreferenceAnnotation() {
      calls.push('annotation')
    }
    getMapsBbox() {
      return bounds
    }
  }
  class MockMap {
    constructor(options?: { bounds?: ExampleBounds }) {
      mapOptions = options
      calls.push('map')
    }
    on(_event: string, callback: () => Promise<unknown>) {
      pending.push(Promise.resolve(callback()))
    }
    addLayer() {
      calls.push('layer')
    }
    fitBounds(value: unknown) {
      assert.deepEqual(
        value,
        library === 'Leaflet' && viewMode !== 'fit'
          ? [
              [0, 0],
              [1, 1]
            ]
          : bounds
      )
      calls.push('fit')
    }
    getView() {
      return { fit: (value: unknown) => this.fitBounds(value) }
    }
  }
  class MockWarpedMapLayer {
    constructor(
      options?: { warpedMapList: MockWarpedMapList },
      leafletOptions?: { warpedMapList: MockWarpedMapList }
    ) {
      if (viewMode === 'list')
        assert.equal((options ?? leafletOptions)?.warpedMapList, sharedList)
    }
    addTo() {
      calls.push('layer')
      return this
    }
    async addGeoreferenceAnnotationByUrl(value: string) {
      selected.annotationUrl = value
      calls.push('annotation')
    }
    setOpacity(value: number) {
      selected.opacity = value
      calls.push('opacity')
    }
    setLayerTransformationType(value: ExampleSettings['transformation']) {
      selected.transformation = value
      calls.push('transformation')
    }
    getBounds() {
      return bounds
    }
    getBbox() {
      return bounds
    }
  }
  class MockOptions {
    fit(value: unknown) {
      assert.deepEqual(value, bounds)
      calls.push('fit')
    }
  }
  const leaflet = {
    map: () => new MockMap(),
    tileLayer: () => ({ addTo() {} })
  }
  const source = exampleSource(
    selectedSettings,
    library,
    bounds,
    viewMode
  ).replace(/^import .*\n/gm, '')
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
  await new AsyncFunction(
    'Map',
    'WarpedMapLayer',
    'L',
    'View',
    'TileLayer',
    'OSM',
    'setWorkerUrl',
    'workerUrl',
    'WarpedMapList',
    'fetch',
    'transformExtent',
    'document',
    source
  )(
    MockMap,
    MockWarpedMapLayer,
    leaflet,
    MockOptions,
    MockOptions,
    MockOptions,
    () => {},
    '/worker.mjs',
    MockWarpedMapList,
    async (url: string) => {
      selected.annotationUrl = url
      return { ok: true, json: async () => ({}) }
    },
    (value: unknown) => value,
    { getElementById: () => ({ clientWidth: 800, clientHeight: 400 }) }
  )
  await Promise.all(pending)
  assert.deepEqual(selected, {
    annotationUrl: selectedSettings.annotationUrl,
    ...(selectedSettings.opacity === 1
      ? {}
      : { opacity: selectedSettings.opacity }),
    ...(selectedSettings.transformation === 'annotation'
      ? {}
      : { transformation: selectedSettings.transformation })
  })
  assert.equal(calls.filter((call) => call === 'annotation').length, 1)
  if (library === 'MapLibre') {
    assert.deepEqual(
      mapOptions?.bounds,
      viewMode === 'fit' ? undefined : bounds
    )
    assert.equal(
      calls.filter((call) => call === 'fit').length,
      viewMode === 'fit' ? 1 : 0
    )
  } else {
    assert.equal(calls.filter((call) => call === 'fit').length, 1)
  }
  if (viewMode === 'fit')
    assert.ok(calls.indexOf('fit') > calls.indexOf('annotation'))
  if (viewMode === 'bounds' && library !== 'MapLibre')
    assert.ok(calls.indexOf('fit') < calls.indexOf('annotation'))
  if (viewMode === 'list')
    assert.ok(calls.indexOf('annotation') < calls.indexOf('map'))
}

for (const library of ['MapLibre', 'Leaflet', 'OpenLayers'] as const) {
  for (const viewMode of ['fit', 'bounds', 'list'] as const) {
    test(`${library} ${viewMode} copied code loads once and positions the map correctly`, async () => {
      await runCopiedExample(settings, library, viewMode)
      await runCopiedExample(
        {
          annotationUrl:
            "https://example.org/maps/'; throw new Error('injected') //\\\n",
          opacity: 0.3,
          transformation: 'helmert'
        },
        library,
        viewMode
      )
    })
    test(`${library} ${viewMode} default code preserves annotation settings`, async () => {
      const defaults: ExampleSettings = {
        ...settings,
        opacity: 1,
        transformation: 'annotation'
      }
      const source = exampleSource(defaults, library, [0, 0, 1, 1], viewMode)
      assert.ok(!source.includes('.setOpacity('))
      assert.ok(!source.includes('.setLayerTransformationType('))
      await runCopiedExample(defaults, library, viewMode)
    })
  }
}
