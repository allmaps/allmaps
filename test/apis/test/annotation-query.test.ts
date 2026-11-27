import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createTestContext, type TestContext } from './helpers/context.ts'

describe('annotation query parameters', () => {
  let context: TestContext
  let adminCookie: string
  let point: string
  const paths = new Map<string, string>()

  function request(path: string) {
    return context.annotations.handle(
      new Request(context.env.PUBLIC_ANNOTATIONS_BASE_URL + path, {
        headers: { Cookie: adminCookie }
      })
    )
  }

  beforeAll(async () => {
    context = await createTestContext({ seed: 'demo' })
    const catalog = context.seedCatalog!
    const map = catalog.maps[0]
    const image = catalog.images[0]
    const login = await context.rest.handle(
      new Request(
        context.env.PUBLIC_REST_BASE_URL + '/__dev/login/local-admin',
        { method: 'POST' }
      )
    )
    adminCookie = login.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')
    const {
      rows: [row]
    } = await context.client.query<{
      lat: number
      lng: number
      checksum: string
      image_checksum: string
    }>(
      'SELECT ST_Y(ST_PointOnSurface(geo_mask)) AS lat, ST_X(ST_PointOnSurface(geo_mask)) AS lng, checksum, image_checksum FROM maps WHERE id = $1 AND latest',
      [map.id]
    )
    point = [row.lat, row.lng].join(',')
    const list = catalog.lists.find(
      (list) => list.key === 'amsterdam-research'
    )!
    const owner = catalog.users.find((user) => user.id === list.userId)!
    const listPath = `/@${owner.slug}/lists/${list.id}`
    for (const [key, path] of Object.entries({
      maps: '/maps',
      random: '/maps/random',
      map: '/maps/' + map.id,
      version: `/maps/${map.id}@${row.checksum}`,
      image: '/images/' + image.id,
      imageVersion: `/images/${image.id}@${row.image_checksum}`,
      canvas: '/canvases/' + image.canvasId,
      manifest: '/manifests/' + catalog.manifests[0].id,
      organization: '/organizations/' + catalog.organizations[0].slug,
      listExport: listPath + '/georeference-annotations'
    }))
      paths.set(key, path)
  })

  afterAll(async () => {
    await context?.close()
  })

  it.each([
    'maps',
    'random',
    'map',
    'version',
    'image',
    'imageVersion',
    'canvas',
    'manifest',
    'organization',
    'listExport'
  ])('honors the same spatial filters on %s', async (route) => {
    const path = paths.get(route)!
    const single = ['map', 'random', 'version'].includes(route)
    const matching = await request(path + '?limit=1&intersects=' + point)
    expect(matching.status).toBe(200)
    const json = await matching.json()
    if (single) expect(json.type).toBe('Annotation')
    else expect(json.items).toHaveLength(1)

    const outside = await request(path + '?intersects=-60,-140')
    expect(outside.status).toBe(single ? 404 : 200)
    if (!single) expect((await outside.json()).items).toEqual([])

    const [lat, lng] = point.split(',')
    const empty = await request(
      path +
        `?intersects=${lat}&intersects=${lng}&containedBy=-61,-141,-59,-139`
    )
    expect(empty.status).toBe(single ? 404 : 200)
    if (!single) expect((await empty.json()).items).toEqual([])
    expect((await request(path + '?intersects=1,2,3')).status).toBe(400)
  })

  it.each(['maps', 'organization', 'image', 'imageVersion', 'map', 'version'])(
    'filters the GeoJSON form of %s',
    async (route) => {
      const response = await request(
        paths.get(route) + '.geojson?intersects=' + point
      )
      expect(response.status).toBe(200)
      const excluded = await request(paths.get(route) + '.geojson?minArea=1e20')
      if (route === 'map' || route === 'version')
        expect(excluded.status).toBe(404)
      else expect((await excluded.json()).features).toEqual([])
    }
  )

  it.each([
    '/organizations/missing',
    '/images/ffff',
    '/manifests/ffff',
    '/canvases/ffff'
  ])('retains 404 for unknown %s', async (path) => {
    for (const query of ['', '?limit=1', '?intersects=' + point]) {
      expect((await request(path + query)).status).toBe(404)
    }
  })

  it.each(['', '?limit=1', '?intersects=-60,-140'])(
    'returns empty collections for indexed IIIF resources without maps (%s)',
    async (query) => {
      const catalog = context.seedCatalog!
      const image = catalog.images.find(
        (image) => image.key === 'europe-unmapped'
      )!
      const manifest = catalog.manifests.find((manifest) =>
        manifest.uri.endsWith('/' + image.fixtureId + '.json')
      )!
      for (const path of [
        '/images/' + image.id,
        '/canvases/' + image.canvasId,
        '/manifests/' + manifest.id
      ]) {
        const response = await request(path + query)
        expect(response.status, path).toBe(200)
        expect(await response.json()).toMatchObject({
          type: 'AnnotationPage',
          items: []
        })
      }
      const geojson = await request('/images/' + image.id + '.geojson' + query)
      expect(geojson.status).toBe(200)
      expect(await geojson.json()).toMatchObject({
        type: 'FeatureCollection',
        features: []
      })
    }
  )

  it.each(['0', '-1', '1.5'])(
    'rejects limit=%s on both map APIs',
    async (limit) => {
      for (const [api, base] of [
        [context.annotations, context.env.PUBLIC_ANNOTATIONS_BASE_URL],
        [context.rest, context.env.PUBLIC_REST_BASE_URL]
      ] as const) {
        const response = await api.handle(
          new Request(base + '/maps?limit=' + limit)
        )
        expect(response.status).toBe(400)
        expect(await response.json()).toMatchObject({
          error: 'limit must be a positive integer'
        })
      }
    }
  )

  it('applies a point and repeated limit to a public organization URL', async () => {
    const url =
      context.env.PUBLIC_ANNOTATIONS_BASE_URL + paths.get('organization')
    const response = await context.annotations.handle(
      new Request(url + '?limit=10&intersects=' + point + '&limit=10')
    )
    expect(response.status).toBe(200)
    expect((await response.json()).items).toHaveLength(1)
    expect(
      (await request(paths.get('organization') + '?intersects=91,0')).status
    ).toBe(400)
  })

  it('forwards only map parameters when resolving a IIIF URL', async () => {
    const image = context.seedCatalog!.images[0]
    vi.stubGlobal('fetch', async () =>
      Response.json({
        '@context': 'http://iiif.io/api/image/3/context.json',
        id: image.uri,
        type: 'ImageService3',
        protocol: 'http://iiif.io/api/image',
        profile: 'level2',
        width: 2000,
        height: 2000
      })
    )
    try {
      const response = await request(
        '/?url=' +
          encodeURIComponent(image.uri + '/info.json') +
          '&intersects=1&intersects=2&limit=5&other=abc'
      )
      expect(response.status).toBe(301)
      const location = new URL(response.headers.get('Location')!)
      expect(location.pathname).toBe(paths.get('image'))
      expect([...location.searchParams]).toEqual([
        ['intersects', '1'],
        ['intersects', '2'],
        ['limit', '5']
      ])
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
