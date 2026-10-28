import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import { prepareAnnotation } from '../src/lib/examples/annotation.ts'
import { createImageFetch } from '../src/lib/examples/image-fetch.ts'

import { initializeView } from '../src/lib/examples/initialize-view.ts'
import { loadAnnotation } from '../src/lib/examples/load-annotation.ts'
import { watchImageLoading } from '../src/lib/examples/image-loading.ts'
import {
  exampleSource,
  validateAnnotationUrl
} from '../src/lib/examples/source.ts'
import type {
  ExampleBounds,
  ExampleViewMode,
  ExampleLibrary,
  ExampleMap,
  ExampleSettings
} from '../src/lib/examples/types.js'

const settings: ExampleSettings = {
  annotationUrl: 'https://annotations.allmaps.org/maps/example',
  opacity: 0.65,
  transformation: 'thinPlateSpline'
}

function exampleAnnotation() {
  return generateAnnotation({
    type: 'GeoreferencedMap',
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    resource: {
      id: 'https://example.org/image',
      type: 'ImageService2',
      width: 100,
      height: 100
    },
    resourceMask: [
      [0, 0],
      [100, 0],
      [100, 100],
      [0, 100]
    ],
    gcps: [
      { resource: [20, 20], geo: [100.2, 10.2] },
      { resource: [80, 20], geo: [100.8, 10.2] },
      { resource: [20, 80], geo: [100.2, 10.8] },
      { resource: [80, 80], geo: [100.8, 10.8] }
    ],
    transformation: { type: 'thinPlateSpline' }
  })
}

function mockRenderer() {
  return Object.assign(new EventTarget(), { tileCache: new EventTarget() })
}

test('IIIF image-info errors report the server and HTTP status', () => {
  const renderer = mockRenderer()
  const messages: string[] = []
  watchImageLoading(
    renderer,
    () => assert.fail('A failed image must not be marked loaded'),
    (message) => messages.push(message),
    new AbortController().signal
  )
  renderer.dispatchEvent(
    Object.assign(new Event('imageinfofetcherror'), {
      error: new Error('Forbidden'),
      data: {
        imageInfoUrl: 'https://gallica.bnf.fr/iiif/map/info.json',
        status: 403
      }
    })
  )
  assert.deepEqual(messages, [
    'Could not load the map image from gallica.bnf.fr (HTTP 403).'
  ])
})

test('only an image tile marks the map image loaded', () => {
  const renderer = mockRenderer()
  let loaded = false
  watchImageLoading(
    renderer,
    () => {
      loaded = true
    },
    () => assert.fail('No error expected'),
    new AbortController().signal
  )
  renderer.dispatchEvent(new Event('imageloaded'))
  assert.equal(loaded, false)
  renderer.tileCache.dispatchEvent(new Event('firstmaptileloaded'))
  assert.equal(loaded, true)
})

test('tile errors are visible, while aborts and disposed maps remain silent', () => {
  const renderer = mockRenderer()
  const abortController = new AbortController()
  const messages: string[] = []
  watchImageLoading(
    renderer,
    () => assert.fail('A disposed map must not update loading state'),
    (message) => messages.push(message),
    abortController.signal
  )
  renderer.tileCache.dispatchEvent(
    Object.assign(new Event('tilefetcherror'), {
      error: new Error('Image decoding failed')
    })
  )
  renderer.tileCache.dispatchEvent(
    Object.assign(new Event('tilefetcherror'), {
      error: new DOMException('Cancelled', 'AbortError')
    })
  )
  assert.deepEqual(messages, [
    'Could not load the map image: Image decoding failed.'
  ])
  abortController.abort()
  renderer.dispatchEvent(new Event('imageinfofetcherror'))
  renderer.dispatchEvent(new Event('error'))
  renderer.tileCache.dispatchEvent(new Event('firstmaptileloaded'))
  renderer.tileCache.dispatchEvent(new Event('tilefetcherror'))
  assert.equal(messages.length, 1)
})

function mockExample(results = [{ ok: true }]) {
  const calls: string[] = []
  const example: ExampleMap = {
    ready: Promise.resolve(),
    warpedMapLayer: {
      addGeoreferenceAnnotation: () => {
        calls.push('annotation')
        return results
      },
      setOpacity: (value) => calls.push(`opacity:${value}`),
      setLayerTransformationType: (value) =>
        calls.push(`transformation:${value}`),
      resetLayerOptions: (keys) => calls.push(`reset:${keys.join(',')}`)
    },
    getBounds: () => [0, 0, 1, 1],
    fitBounds: () => calls.push('fit'),
    destroy: () => calls.push('destroy')
  }
  return { example, calls }
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

test('annotation preparation calculates the transformed mask extent without fetching the image', async (context) => {
  const annotation = exampleAnnotation()
  const fetch = context.mock.method(globalThis, 'fetch', async () =>
    Response.json(annotation)
  )
  const prepared = await prepareAnnotation(
    settings.annotationUrl,
    'annotation',
    new AbortController().signal
  )
  assert.equal(fetch.mock.callCount(), 1)
  assert.ok(prepared.bounds[0] < 100.2)
  assert.ok(prepared.bounds[1] < 10.2)
  assert.ok(prepared.bounds[2] > 100.8)
  assert.ok(prepared.bounds[3] > 10.8)
  const { example, calls } = mockExample()
  await loadAnnotation(
    example,
    { ...settings, opacity: 1, transformation: 'annotation' },
    undefined,
    prepared.annotation
  )
  assert.equal(fetch.mock.callCount(), 1)
  assert.deepEqual(calls, ['annotation', 'fit'])
  prepared.warpedMapList.destroy()
})

test('IIIF fetch reports HTTP and network failures directly', async (context) => {
  const messages: string[] = []
  const controller = new AbortController()
  const request = createImageFetch(controller.signal, (message) =>
    messages.push(message)
  )
  const fetch = context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 403 })
  )
  assert.equal(
    (await request('https://gallica.bnf.fr/iiif/map/info.json')).status,
    403
  )
  assert.deepEqual(messages, [
    'Could not load the map image from gallica.bnf.fr (HTTP 403).'
  ])
  fetch.mock.mockImplementation(async () => {
    throw new TypeError('Failed to fetch')
  })
  await assert.rejects(request('https://gallica.bnf.fr/iiif/map/info.json'))
  assert.match(messages[1], /gallica\.bnf\.fr.*blocking browser requests/)
  controller.abort()
  await assert.rejects(request('https://gallica.bnf.fr/iiif/map/info.json'))
  assert.equal(messages.length, 2)
})

test('metadata error reporting is scoped to the annotation maps', async (context) => {
  context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 403 })
  )
  const messages: string[] = []
  const controller = new AbortController()
  const imageInfoFetch = createImageFetch(controller.signal, (message) =>
    messages.push(message)
  )
  const { example } = mockExample()
  let imageRequest: Promise<Response> | undefined
  example.warpedMapLayer.addGeoreferenceAnnotation = (
    _annotation,
    mapOptions
  ) => {
    assert.equal(mapOptions?.fetchFn, imageInfoFetch)
    imageRequest = mapOptions.fetchFn(
      'https://gallica.bnf.fr/iiif/map/info.json'
    )
    return [{ ok: true }]
  }
  await loadAnnotation(example, settings, controller.signal, {}, imageInfoFetch)
  assert.equal((await imageRequest)?.status, 403)
  assert.deepEqual(messages, [
    'Could not load the map image from gallica.bnf.fr (HTTP 403).'
  ])
  controller.abort()
})

test('missing tile events produce a retry message instead of waiting forever', async () => {
  const renderer = mockRenderer()
  const controller = new AbortController()
  const message = await new Promise<string>((resolve) => {
    watchImageLoading(
      renderer,
      () => assert.fail('No tile loaded'),
      resolve,
      controller.signal,
      1
    )
  })
  assert.match(message, /taking too long.*try again/i)
  controller.abort()
})

test('annotation URL accepts web URLs and rejects other protocols and credentials', () => {
  assert.equal(
    validateAnnotationUrl(settings.annotationUrl),
    settings.annotationUrl
  )
  for (const url of [
    'javascript:alert(1)',
    'file:///map.json',
    'https://username:password@example.org/map.json',
    'not a URL'
  ]) {
    assert.throws(() => validateAnnotationUrl(url))
  }
})

test('loading waits for map readiness before requesting an annotation', async (context) => {
  const { example, calls } = mockExample()
  let ready!: () => void
  example.ready = new Promise((resolve) => (ready = resolve))
  const request = context.mock.method(globalThis, 'fetch', async () => {
    calls.push('fetch')
    return new Response('{}')
  })
  const loading = loadAnnotation(example, settings)
  await Promise.resolve()
  assert.equal(request.mock.callCount(), 0)
  ready()
  await loading
  assert.deepEqual(calls, [
    'fetch',
    'annotation',
    'opacity:0.65',
    'transformation:thinPlateSpline',
    'fit'
  ])
})

test('a cancelled annotation response never reaches the map', async (context) => {
  const { example, calls } = mockExample()
  const abortController = new AbortController()
  context.mock.method(globalThis, 'fetch', async () => {
    return {
      ok: true,
      json: async () => {
        abortController.abort()
        return {}
      }
    } as Response
  })
  await assert.rejects(
    loadAnnotation(example, settings, abortController.signal),
    { name: 'AbortError' }
  )
  assert.deepEqual(calls, [])
})

test('a cancelled example does not fetch after map readiness', async (context) => {
  const { example } = mockExample()
  const abortController = new AbortController()
  const request = context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('{}')
  )
  abortController.abort()
  await assert.rejects(
    loadAnnotation(example, settings, abortController.signal),
    { name: 'AbortError' }
  )
  assert.equal(request.mock.callCount(), 0)
})

test('HTTP errors and empty annotations are reported before fitting a map', async (context) => {
  const { example, calls } = mockExample([])
  const request = context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 404 })
  )
  await assert.rejects(loadAnnotation(example, settings), /HTTP 404/)
  assert.deepEqual(calls, [])
  request.mock.mockImplementation(async () => new Response('{}'))
  await assert.rejects(
    loadAnnotation(example, settings),
    /does not contain any georeferenced maps/
  )
  assert.deepEqual(calls, ['annotation'])
})

for (const viewMode of ['fit', 'bounds', 'list'] as const) {
  test(`${viewMode} live initialization fetches once and follows the chosen order`, async (context) => {
    const { example, calls } = mockExample()
    const controller = new AbortController()
    const annotation = exampleAnnotation()
    const request = context.mock.method(globalThis, 'fetch', async () => {
      calls.push('fetch')
      return Response.json(annotation)
    })
    const imageInfoFetch = async () => {
      assert.fail('Preparing the extent must not fetch IIIF image metadata')
      return new Response()
    }
    const defaults: ExampleSettings = {
      ...settings,
      opacity: 1,
      transformation: 'annotation'
    }
    const knownBounds: ExampleBounds = [100, 10, 101, 11]
    let sharedList:
      Awaited<ReturnType<typeof prepareAnnotation>>['warpedMapList'] | undefined
    const initialized = await initializeView(
      async (view) => {
        calls.push('map')
        if (viewMode === 'fit') assert.deepEqual(view, {})
        if (viewMode === 'bounds')
          assert.deepEqual(view, { bounds: knownBounds })
        if (viewMode === 'list') {
          sharedList = view.warpedMapList
          assert.ok(sharedList)
          const maps = Array.from(sharedList.getWarpedMaps())
          assert.equal(maps.length, 1)
          assert.equal(maps[0].transformationType, 'thinPlateSpline')
          assert.equal(maps[0].mapOptions.fetchFn, imageInfoFetch)
          assert.deepEqual(view.bounds, sharedList.getMapsBbox())
          example.getBounds = () => sharedList?.getMapsBbox()
          const originalDestroy = example.destroy
          example.destroy = () => {
            originalDestroy()
            sharedList?.destroy()
          }
        }
        return example
      },
      defaults,
      viewMode,
      controller.signal,
      imageInfoFetch,
      () => calls.push('ready'),
      knownBounds
    )
    assert.equal(request.mock.callCount(), 1)
    assert.deepEqual(
      calls,
      viewMode === 'list'
        ? ['fetch', 'map', 'ready']
        : [
            'map',
            'ready',
            'fetch',
            'annotation',
            ...(viewMode === 'fit' ? ['fit'] : [])
          ]
    )
    assert.ok(initialized.bounds)
    controller.abort()
    initialized.example.destroy()
    assert.equal(calls.filter((call) => call === 'destroy').length, 1)
    if (sharedList)
      assert.equal(Array.from(sharedList.getWarpedMaps()).length, 0)
  })
}

test('known bounds can be calculated before creation without fetching twice or fitting afterwards', async (context) => {
  const { example, calls } = mockExample()
  context.mock.method(globalThis, 'fetch', async () => {
    calls.push('fetch')
    return Response.json(exampleAnnotation())
  })
  const controller = new AbortController()
  await initializeView(
    async (view) => {
      calls.push('map')
      assert.ok(view.bounds)
      assert.equal(view.warpedMapList, undefined)
      return example
    },
    { ...settings, opacity: 1, transformation: 'annotation' },
    'bounds',
    controller.signal,
    async () => new Response(),
    () => calls.push('ready')
  )
  assert.deepEqual(calls, ['fetch', 'map', 'ready', 'annotation'])
  controller.abort()
})

test('WarpedMapList applies transformation overrides before calculating its extent', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    Response.json(exampleAnnotation())
  )
  const controller = new AbortController()
  const prepared = await prepareAnnotation(
    settings.annotationUrl,
    'helmert',
    controller.signal
  )
  const maps = Array.from(prepared.warpedMapList.getWarpedMaps())
  assert.equal(maps[0].transformationType, 'helmert')
  assert.deepEqual(prepared.bounds, prepared.warpedMapList.getMapsBbox())
  prepared.warpedMapList.destroy()
})

test('cancellation while creating an example disposes the late map without loading an annotation', async (context) => {
  const { example, calls } = mockExample()
  const controller = new AbortController()
  const request = context.mock.method(globalThis, 'fetch', async () =>
    Response.json({})
  )
  let resolveFactory!: (example: ExampleMap) => void
  const initialized = initializeView(
    () =>
      new Promise((resolve) => {
        resolveFactory = resolve
      }),
    settings,
    'fit',
    controller.signal,
    async () => new Response(),
    () => assert.fail('Cancelled maps must not become ready')
  )
  controller.abort()
  resolveFactory(example)
  await assert.rejects(initialized, { name: 'AbortError' })
  assert.deepEqual(calls, ['destroy'])
  assert.equal(request.mock.callCount(), 0)
})

test('failed annotation loading disposes the created map', async (context) => {
  const { example, calls } = mockExample()
  context.mock.method(
    globalThis,
    'fetch',
    async () => new Response('', { status: 404 })
  )
  await assert.rejects(
    initializeView(
      async () => example,
      settings,
      'fit',
      new AbortController().signal,
      async () => new Response(),
      () => {}
    ),
    /HTTP 404/
  )
  assert.deepEqual(calls, ['destroy'])
})

test('a map that fails before attaching its layer also disposes its prepared list', async (context) => {
  context.mock.method(globalThis, 'fetch', async () =>
    Response.json(exampleAnnotation())
  )
  const { example, calls } = mockExample()
  example.ready = Promise.reject(new Error('Basemap unavailable'))
  // The initializer receives this promise after preparing the list asynchronously.
  void example.ready.catch(() => {})
  let sharedList:
    Awaited<ReturnType<typeof prepareAnnotation>>['warpedMapList'] | undefined
  await assert.rejects(
    initializeView(
      async (view) => {
        sharedList = view.warpedMapList
        return example
      },
      settings,
      'list',
      new AbortController().signal,
      async () => new Response(),
      () => assert.fail('A failed map must not become ready')
    ),
    /Basemap unavailable/
  )
  assert.ok(sharedList)
  assert.equal(Array.from(sharedList.getWarpedMaps()).length, 0)
  assert.deepEqual(calls, ['destroy'])
})
