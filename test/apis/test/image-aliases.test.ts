import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import {
  addItemToList,
  addItemToListByUrl,
  createImageFromUrl,
  createManifestFromUrl,
  createUserList,
  getSavedImageResource,
  queryList,
  queryListGeoreferenceAnnotations,
  migrateImage,
  queryImageChecksums,
  resolveImageServices
} from '@allmaps/api-shared/db'
import { createTestContext, type TestContext } from './helpers/context.ts'
import { schema, type DbMaps3 } from '@allmaps/db'
import { eq } from 'drizzle-orm'
import { parseAnnotation } from '@allmaps/annotation'
import { Manifest } from '@allmaps/iiif-parser'
import {
  fetchManifestRecord,
  resolveEditorImage
} from '../../../apps/editor/src/lib/shared/api.ts'
import { fixtureMap } from './fixtures/map.ts'

const hash = (uri: string) =>
  createHash('sha1').update(uri).digest('hex').slice(0, 16)
const base = 'https://library.example'
const manifestUri = base + '/manifest'
const canonical = base + '/3/a%2Fb'
const encoded = base + '/3/a%252Fb'
const v2 = base + '/2/a%2Fb'
const moved = base + '/new/a'
const info = (id: string) => ({
  id,
  type: 'ImageService3',
  profile: 'level2',
  protocol: 'http://iiif.io/api/image',
  width: 1000,
  height: 1000
})
const infoV2 = (id: string) => ({
  '@id': id,
  '@context': 'http://iiif.io/api/image/2/context.json',
  protocol: 'http://iiif.io/api/image',
  profile: ['http://iiif.io/api/image/2/level2.json'],
  width: 1000,
  height: 1000
})
let context: TestContext
const responses = new Map<string, unknown>()

function addManifest(
  uri: string,
  olderService: string,
  preferredService: string,
  ...alternateV2Services: string[]
) {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        '../../../packages/iiif-parser/test/input/manifest.3.sfo-1762679999.json',
        import.meta.url
      ),
      'utf8'
    )
  )
  manifest.id = uri
  manifest.items = manifest.items.slice(0, 1)
  const canvas = manifest.items[0]
  canvas.id = uri + '/canvas'
  canvas.width = canvas.height = 250
  canvas.items[0].items[0].body.service = [
    ...[olderService, ...alternateV2Services].map((id) => ({
      id,
      type: 'ImageService2',
      profile: 'http://iiif.io/api/image/2/level2.json'
    })),
    { id: preferredService, type: 'ImageService3', profile: 'level2' }
  ]
  responses.set(uri, manifest)
}

beforeAll(async () => {
  context = await createTestContext({ seed: 'demo' })
  addManifest(manifestUri, v2, encoded)
  responses.set(encoded + '/info.json', info(canonical))
  responses.set(canonical + '/info.json', info(canonical))
  responses.set(v2 + '/info.json', infoV2(v2))
  responses.set(moved + '/info.json', info(moved))
  vi.stubGlobal('fetch', async (url: string) =>
    responses.has(url)
      ? Response.json(responses.get(url))
      : new Response(null, { status: 404 })
  )
})

afterAll(async () => {
  vi.unstubAllGlobals()
  await context?.close()
})

it.for([
  { host: 'scans.library.example', allowed: true },
  { host: 'unrelated.example', allowed: false }
])(
  'checks the canonical domain before fetching metadata from $host',
  async ({ host, allowed }, { onTestFinished }) => {
    const sourceUrl = base + '/proxy/' + host + '/info.json'
    const canonicalUri = 'https://' + host + '/scan'
    const canonicalUrl = canonicalUri + '/info.json'
    responses.set(sourceUrl, info(canonicalUri))
    responses.set(canonicalUrl, { ...info(canonicalUri), width: 3000 })
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    onTestFinished(() => {
      fetchSpy.mockRestore()
    })

    const image = createImageFromUrl(context.db, sourceUrl, {
      allowedUrlDomains: ['library.example'],
      allowedParsedUriDomains: ['library.example', 'scans.library.example']
    })
    if (allowed) {
      await expect(image).resolves.toMatchObject({
        uri: canonicalUri,
        width: 3000
      })
    } else {
      await expect(image).rejects.toMatchObject({
        status: 403,
        message: `Domain not allowed: ${host}`
      })
    }
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual(
      allowed ? [sourceUrl, canonicalUrl] : [sourceUrl]
    )
  }
)

it('preserves the Canvas resource and control points on save and update without fetching info.json', async ({
  onTestFinished
}) => {
  const canvas = {
    id: base + '/canvas/amsterdam',
    type: 'Canvas' as const,
    width: 1200,
    height: 1500
  }
  const map = { ...fixtureMap, resource: canvas }
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  onTestFinished(() => {
    fetchSpy.mockRestore()
  })

  const [saved] = await context.shareDb.saveMaps([map])
  const [mapId] = saved.mapIds
  const expectSnapshot = async (gcps: typeof map.gcps) => {
    await context.shareDb.flushPendingSnapshots()
    const snapshot = await context.client.query<{ data: DbMaps3 }>(
      'SELECT data FROM snapshots WHERE doc_id = $1',
      [hash(canvas.id)]
    )
    const stored = snapshot.rows[0].data[mapId]
    expect(stored.resource).toEqual({
      id: hash(canvas.id),
      uri: canvas.id,
      type: canvas.type,
      width: canvas.width,
      height: canvas.height
    })
    const storedGcps = Object.values(stored.gcps)
    expect(storedGcps).toHaveLength(gcps.length)
    gcps.forEach((gcp, index) => {
      expect(storedGcps).toContainEqual(
        expect.objectContaining({ ...gcp, index })
      )
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  }
  await expectSnapshot(map.gcps)

  const updatedGcps: typeof map.gcps = [
    ...map.gcps.slice(0, -1),
    { resource: [125, 875], geo: [4.891, 52.379] }
  ]
  await context.shareDb.updateMap(mapId, { ...map, gcps: updatedGcps })
  await expectSnapshot(updatedGcps)
})

it('resolves missing metadata in REST before Live saves or updates the map', async ({
  onTestFinished
}) => {
  const { client, db, env, rest, shareDb } = context
  const uri = base + '/write/declared'
  const proxy = base + '/write/proxy'
  const metadata = { ...info(uri), width: 7000, height: 8000 }
  responses.set(proxy + '/info.json', metadata)
  responses.set(uri + '/info.json', metadata)
  const map = {
    ...fixtureMap,
    resource: { ...fixtureMap.resource, id: proxy, width: 250, height: 250 }
  }
  await client.query(
    'INSERT INTO iiif.images (id, uri, width, height) VALUES ($1, $2, 250, 250)',
    [hash(proxy), proxy]
  )
  const headers = {
    'Content-Type': 'application/json',
    Cookie: await adminCookie()
  }
  const publisherFetch = globalThis.fetch
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  onTestFinished(() => {
    fetchSpy.mockRestore()
  })
  const missingMetadata = { status: 409 }
  await expect(shareDb.saveMaps([map])).rejects.toMatchObject(missingMetadata)
  await expect(shareDb.updateMap('missing', map)).rejects.toMatchObject(
    missingMetadata
  )
  expect(fetchSpy).not.toHaveBeenCalled()

  // Observe the REST-to-Live handoff using the same database as both APIs.
  const live = env.PUBLIC_LIVE_BASE_URL + '/maps'
  fetchSpy.mockImplementation(async (url, init) => {
    if (!String(url).startsWith(live)) return publisherFetch(url, init)
    const saved = await db.query.images.findFirst({ where: { id: hash(uri) } })
    expect(saved?.data).toEqual(metadata)
    // Stale scalar dimensions must never override the saved info.json.
    await client.query('UPDATE iiif.images SET width = 250 WHERE id = $1', [
      hash(uri)
    ])
    const callsBeforeLive = fetchSpy.mock.calls.length
    const body = JSON.parse(String(init?.body))
    const result =
      init?.method === 'POST'
        ? await shareDb.saveMaps(body)
        : await shareDb.updateMap(String(url).slice(live.length + 1), body)
    expect(fetchSpy.mock.calls).toHaveLength(callsBeforeLive)
    return Response.json(result)
  })
  const mapsUrl = env.PUBLIC_REST_BASE_URL + '/maps'
  const post = await rest.handle(
    new Request(mapsUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify([map, { ...map, gcps: map.gcps.slice(0, 3) }])
    })
  )
  expect(post.status).toBe(200)
  const [saved] = await post.json()
  expect(saved.imageId).toBe(hash(uri))
  expect(saved.mapIds).toHaveLength(2)
  const [mapId] = saved.mapIds
  expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
    proxy + '/info.json',
    uri + '/info.json',
    live
  ])
  const expectSavedMap = async (gcp: (typeof map.gcps)[number]) => {
    await shareDb.flushPendingSnapshots()
    const snapshot = await client.query<{ data: DbMaps3 }>(
      'SELECT data FROM snapshots WHERE doc_id = $1',
      [hash(uri)]
    )
    const stored = snapshot.rows[0].data[mapId]
    expect(stored.resource).toMatchObject({
      id: hash(uri),
      uri,
      width: metadata.width,
      height: metadata.height
    })
    expect(Object.values(stored.gcps)).toContainEqual(
      expect.objectContaining(gcp)
    )
  }
  await expectSavedMap(map.gcps[1])
  await client.query('UPDATE iiif.images SET data = NULL WHERE id = $1', [
    hash(uri)
  ])
  fetchSpy.mockClear()
  const updatedGcp: (typeof map.gcps)[number] = {
    resource: [3921, 4132],
    geo: [4.89, 52.38]
  }
  const patch = await rest.handle(
    new Request(mapsUrl + '/' + mapId, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        ...map,
        resource: { ...map.resource, id: uri },
        gcps: [...map.gcps, updatedGcp]
      })
    })
  )
  expect(patch.status).toBe(200)
  expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
    uri + '/info.json',
    live + '/' + mapId
  ])
  await expectSavedMap(updatedGcp)
})

it('resolves alternate services, preserves pixel coordinates and moves the edited image with its history', async () => {
  const api = context.env.PUBLIC_REST_BASE_URL
  const publisherFetch = globalThis.fetch
  const requests: Request[] = []
  const apiFetch = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((url, init) => {
      if (url === `${api}/manifests/${hash(manifestUri)}`) {
        const request = new Request(url, init)
        requests.push(request.clone())
        return context.rest.handle(request)
      }
      if (String(url).startsWith(api + '/images/'))
        return context.rest.handle(new Request(url, init))
      return publisherFetch(url, init)
    })
  const source = Manifest.parse(responses.get(manifestUri), {
    keepSource: true
  })
  try {
    const initial = await fetchManifestRecord(api, source)
    expect(initial.canvases[0].images[0].uri).toBe(encoded)
    const selected = await resolveEditorImage(api, encoded)
    expect(selected).toMatchObject({ uri: canonical, data: info(canonical) })
    const revisited = await fetchManifestRecord(api, source)
    expect(revisited.canvases[0].images[0].uri).toBe(canonical)
    expect(requests.map(({ method }) => method)).toEqual(['GET', 'PUT', 'GET'])
    const stored = await context.db.query.manifests.findFirst({
      where: { id: hash(manifestUri) }
    })
    expect(await requests[1].json()).toEqual({
      url: manifestUri,
      checksum: stored?.checksum
    })
  } finally {
    apiFetch.mockRestore()
  }
  const request = (path: string) =>
    context.rest.handle(new Request(context.env.PUBLIC_REST_BASE_URL + path))
  for (const uri of [encoded, v2]) {
    const response = await request('/images/' + hash(uri))
    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe(
      context.env.PUBLIC_REST_BASE_URL + '/images/' + hash(canonical)
    )
    expect(await resolveImageServices(context.db, [uri])).toMatchObject({
      uri: canonical,
      width: 1000
    })
  }
  const result = await context.shareDb.saveMaps([
    {
      ...fixtureMap,
      resource: { ...fixtureMap.resource, id: encoded, width: 250 }
    }
  ])
  await context.shareDb.flushPendingSnapshots()
  const [mapId] = result[0].mapIds
  const getMaps = async () =>
    (await request('/manifests/' + hash(manifestUri) + '/maps')).json()
  expect(await getMaps()).toMatchObject([
    { resource: { id: canonical, width: 1000, height: 1000 } }
  ])

  const getVersions = async (uri: string): Promise<{ version: string }[]> => {
    const response = await request('/images/' + hash(uri) + '/versions')
    expect(response.status).toBe(200)
    return response.json()
  }
  const readVersion = async (url: string) => {
    const response = await context.annotations.handle(new Request(url))
    expect(response.status).toBe(200)
    const maps = parseAnnotation(await response.json())
    expect(maps).toHaveLength(1)
    return maps[0]
  }
  const [{ version: savedVersionUrl }] = await getVersions(canonical)
  expect(new URL(savedVersionUrl).origin).toBe(
    new URL(context.env.PUBLIC_ANNOTATIONS_BASE_URL).origin
  )
  const original = await readVersion(savedVersionUrl)
  expect(original.resource.id).toBe(canonical)
  expect(original.gcps).toHaveLength(fixtureMap.gcps.length)

  await migrateImage(context.db, hash(v2), moved + '/info.json')
  responses.delete(encoded + '/info.json')
  expect(
    await migrateImage(context.db, hash(canonical), moved + '/info.json')
  ).toMatchObject({ id: hash(moved) })
  expect(await resolveImageServices(context.db, [encoded])).toMatchObject({
    uri: moved
  })
  expect(await getMaps()).toMatchObject([{ resource: { id: moved } }])
  const getImageMaps = async (uri: string, status: number) => {
    const reads = vi.spyOn(context.client, 'query')
    try {
      const response = await request('/images/' + hash(uri) + '/maps')
      expect(response.status).toBe(status)
      expect(reads).toHaveBeenCalledTimes(1)
      return await response.json()
    } finally {
      reads.mockRestore()
    }
  }
  const currentMaps = await getImageMaps(moved, 200)
  expect(currentMaps).toMatchObject([{ resource: { id: moved } }])
  expect(await getImageMaps(canonical, 200)).toEqual(currentMaps)
  await getImageMaps(base + '/missing', 404)

  const filtered = await context.annotations.handle(
    new Request(
      context.env.PUBLIC_ANNOTATIONS_BASE_URL +
        '/images/' +
        hash(v2) +
        '?minArea=1e20'
    )
  )
  expect(filtered.status).toBe(200)
  expect(await filtered.json()).toMatchObject({
    type: 'AnnotationPage',
    items: []
  })

  const getStatus = async (uri: string) => {
    const response = await request('/images/' + hash(uri) + '/georeferenced')
    expect(response.status).toBe(200)
    return response.json()
  }
  const statusQuery = vi.spyOn(context.client, 'query')
  try {
    const currentStatus = await getStatus(moved)
    expect(currentStatus).toEqual({
      georeferenced: true,
      mapCount: 1,
      georeferencedMapCount: 1,
      georeferencingUpdatedAt: expect.any(String)
    })
    expect(await getStatus(canonical)).toEqual(currentStatus)
    expect(statusQuery).toHaveBeenCalledTimes(2)
  } finally {
    statusQuery.mockRestore()
  }

  const historyQuery = vi.spyOn(context.client, 'query')
  try {
    const history = await getVersions(encoded)
    expect(history[1].version).toBe(savedVersionUrl)
    expect(
      history.map((row) => row.version.split('/').pop()?.split('@')[0])
    ).toEqual([hash(moved), hash(canonical)])
    expect(historyQuery).toHaveBeenCalledTimes(1)
  } finally {
    historyQuery.mockRestore()
  }
  const historical = await readVersion(savedVersionUrl)
  expect(historical.resource.id).toBe(original.resource.id)
  expect(historical.gcps).toEqual(original.gcps)

  const snapshots = await context.client.query<{
    doc_id: string
    data: Record<string, { resource: { uri: string } }>
  }>('SELECT doc_id, data FROM snapshots WHERE doc_id IN ($1, $2)', [
    hash(canonical),
    hash(moved)
  ])
  const updated = await context.shareDb.updateMap(mapId, {
    ...fixtureMap,
    resource: { ...fixtureMap.resource, id: encoded }
  })
  await context.shareDb.flushPendingSnapshots()
  expect(updated).toMatchObject({ resource: { id: moved } })
  expect(snapshots.rows).toHaveLength(2)
  expect(
    snapshots.rows.find((row) => row.doc_id === hash(moved))?.data[mapId]
      .resource.uri
  ).toBe(moved)
})

it('registers 300 canvases without fetching info.json and resolves only the selected image', async () => {
  const uri = base + '/manifest/large'
  const service = (index: number) => base + '/large/' + index
  addManifest(uri, service(0), service(0))
  const data = responses.get(uri) as {
    items: {
      id: string
      items: { items: { body: { service: { id: string }[] } }[] }[]
    }[]
  }
  const template = data.items[0]
  data.items = Array.from({ length: 300 }, (_, index) => {
    const canvas = structuredClone(template)
    canvas.id = uri + '/canvas/' + index
    const body = canvas.items[0].items[0].body
    body.service = [{ ...body.service[1], id: service(index) }]
    return canvas
  })
  const selected = service(213)
  const declared = base + '/large/canonical'
  responses.set(selected + '/info.json', info(declared))
  responses.set(declared + '/info.json', info(declared))
  const api = context.env.PUBLIC_REST_BASE_URL
  const publisherFetch = globalThis.fetch
  const publisherUrls: string[] = []
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((url, init) => {
      if (String(url).startsWith(api + '/'))
        return context.rest.handle(new Request(url, init))
      publisherUrls.push(String(url))
      return publisherFetch(url, init)
    })
  try {
    const source = Manifest.parse(data, { keepSource: true })
    const manifest = await fetchManifestRecord(api, source)
    expect(manifest.canvases).toHaveLength(300)
    expect(publisherUrls).toEqual([uri])
    const pending = await context.db.query.images.findFirst({
      where: { id: hash(selected) }
    })
    expect(pending).toMatchObject({ data: null, width: null, height: null })
    expect(await resolveEditorImage(api, selected)).toMatchObject({
      uri: declared,
      data: info(declared)
    })
    expect(publisherUrls.slice(1)).toEqual([
      selected + '/info.json',
      declared + '/info.json'
    ])
    await expect(resolveEditorImage(api, service(212))).rejects.toThrow()
    const calls = publisherUrls.length
    expect(await resolveEditorImage(api, selected)).toMatchObject({
      uri: declared
    })
    const revisited = await fetchManifestRecord(api, source)
    expect(
      revisited.canvases.find((c) => c.uri === uri + '/canvas/213')?.images
    ).toMatchObject([{ uri: declared }])
    expect(publisherUrls).toHaveLength(calls)
  } finally {
    fetchSpy.mockRestore()
  }
})

it('leaves a legacy document with existing edits reachable when discovery finds a different canonical ID', async () => {
  const legacy = base + '/legacy'
  responses.set(legacy + '/info.json', info(legacy))
  await resolveImageServices(context.db, [legacy])
  const [saved] = await context.shareDb.saveMaps([
    { ...fixtureMap, resource: { ...fixtureMap.resource, id: legacy } }
  ])
  await context.shareDb.flushPendingSnapshots()
  // Simulate a pre-alias database with a ShareDB document and an embedded image.
  await context.client.query(
    'DELETE FROM iiif.image_aliases WHERE image_id = $1',
    [saved.imageId]
  )
  await context.client.query(
    'UPDATE iiif.images SET data = NULL, width = 250, height = 250 WHERE id = $1',
    [saved.imageId]
  )
  responses.set(legacy + '/info.json', info(moved))
  await expect(resolveImageServices(context.db, [legacy])).rejects.toThrow(
    /reconciliation/
  )
  const original = await context.rest.handle(
    new Request(context.env.PUBLIC_REST_BASE_URL + '/images/' + saved.imageId)
  )
  expect(original.status).toBe(200)
  expect((await original.json()).maps).toHaveLength(1)
  const edit = await context.rest.handle(
    new Request(context.env.PUBLIC_REST_BASE_URL + '/images/' + saved.imageId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: legacy + '/info.json', resolve: true })
    })
  )
  expect(await edit.json()).toMatchObject({ uri: legacy, data: info(moved) })
  const history = await queryImageChecksums(
    'https://annotations.example',
    context.db,
    saved.imageId
  )
  expect(history.map((row) => row.version)).toEqual([
    expect.stringContaining(`/images/${saved.imageId}@`)
  ])

  const destination = legacy + '/new-service'
  responses.set(destination + '/info.json', info(destination))
  await migrateImage(context.db, saved.imageId, destination + '/info.json')
  const migrated = await context.rest.handle(
    new Request(
      context.env.PUBLIC_REST_BASE_URL + '/images/' + hash(destination)
    )
  )
  expect((await migrated.json()).maps).toHaveLength(1)
})

it('reads image details and saved resources in one query for each image ID', async () => {
  const current = base + '/single-read/current'
  const old = base + '/single-read/old'
  const legacy = base + '/single-read/legacy'
  const pending = base + '/single-read/pending'
  const unknown = base + '/single-read/unknown'
  await context.db.insert(schema.images).values(
    [current, legacy, pending].map((uri) => ({
      id: hash(uri),
      uri,
      data: uri === pending ? null : info(uri)
    }))
  )
  await context.db.insert(schema.imageAliases).values(
    [current, old].map((uri) => ({
      imageId: hash(uri),
      canonicalImageId: hash(current)
    }))
  )

  const inOneRead = async <T>(read: () => Promise<T>) => {
    const queries = vi.spyOn(context.client, 'query')
    try {
      return await read()
    } finally {
      const count = queries.mock.calls.length
      queries.mockRestore()
      expect(count).toBe(1)
    }
  }
  const api = context.env.PUBLIC_REST_BASE_URL
  const details = (uri: string) =>
    inOneRead(() =>
      context.rest.handle(new Request(api + '/images/' + hash(uri)))
    )
  const saved = (uri: string) =>
    inOneRead(() => getSavedImageResource(context.db, uri))

  for (const uri of [current, legacy, pending]) {
    const response = await details(uri)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      id: api + '/images/' + hash(uri),
      uri,
      fetched: uri !== pending,
      createdAt: expect.stringMatching(/Z$/),
      maps: [],
      canvases: []
    })
  }
  const redirect = await details(old)
  expect(redirect.status).toBe(302)
  expect(redirect.headers.get('Location')).toBe(
    api + '/images/' + hash(current)
  )
  expect((await details(unknown)).status).toBe(404)

  for (const uri of [old, current, legacy]) {
    expect(await saved(uri)).toEqual({
      id: uri === old ? current : uri,
      type: 'ImageService3',
      width: 1000,
      height: 1000
    })
  }
  for (const uri of [pending, unknown]) {
    await expect(saved(uri)).rejects.toMatchObject({ status: 409 })
  }
})

it('moves an unedited image twice and redirects directly to the current service', async () => {
  const uris = ['first', 'second', 'third'].map((name) => base + '/' + name)
  for (const uri of uris) responses.set(uri + '/info.json', info(uri))
  await resolveImageServices(context.db, [uris[0]])
  await migrateImage(context.db, hash(uris[0]), uris[1] + '/info.json')
  await migrateImage(context.db, hash(uris[0]), uris[2] + '/info.json')
  const api = context.env.PUBLIC_REST_BASE_URL
  for (const uri of uris.slice(0, 2)) {
    const res = await context.rest.handle(
      new Request(api + '/images/' + hash(uri))
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe(api + '/images/' + hash(uris[2]))
  }
  const unauthorized = await context.rest.handle(
    new Request(api + '/images/' + hash(uris[2]), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: uris[0] + '/info.json' })
    })
  )
  expect([401, 403]).toContain(unauthorized.status)
})

function alternateServices(name: string) {
  const manifest = base + '/manifest/' + name
  const older = base + '/2/' + name
  const preferred = base + '/3/' + name
  addManifest(manifest, older, preferred)
  responses.set(older + '/info.json', infoV2(older))
  responses.set(preferred + '/info.json', info(preferred))
  return { manifest, older, preferred }
}

async function adminCookie() {
  const api = context.env.PUBLIC_REST_BASE_URL
  const login = await context.rest.handle(
    new Request(api + '/__dev/login/local-admin', { method: 'POST' })
  )
  expect(login.status).toBe(200)
  return login.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
}

it.for([
  { metadata: 'saved', matches: true },
  { metadata: 'fetched', matches: true },
  { metadata: 'saved', matches: false },
  { metadata: 'fetched', matches: false }
])(
  'checks migration dimensions using $metadata source info.json (matching pixels: $matches)',
  async ({ metadata, matches }, { onTestFinished }) => {
    const source = base + '/migration-dimensions/' + metadata + '/' + matches
    const destination = source + '/new'
    const sourceInfo = { ...info(source), width: 7000, height: 8000 }
    const storedDimensions = { width: 1000, height: 1500 }
    // The legacy image row has canvas dimensions, even when info.json is available.
    await context.client.query(
      'INSERT INTO iiif.images (id, uri, width, height, data) VALUES ($1, $2, $3, $4, $5::jsonb)',
      [
        hash(source),
        source,
        storedDimensions.width,
        storedDimensions.height,
        metadata === 'saved' ? JSON.stringify(sourceInfo) : null
      ]
    )
    const sourceUrl = source + '/info.json'
    if (metadata === 'fetched') responses.set(sourceUrl, sourceInfo)
    const destinationUrl = destination + '/info.json'
    responses.set(destinationUrl, {
      ...sourceInfo,
      ...(matches ? {} : storedDimensions),
      id: destination
    })

    const cookie = await adminCookie()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    onTestFinished(() => {
      fetchSpy.mockRestore()
    })
    const api = context.env.PUBLIC_REST_BASE_URL
    const response = await context.rest.handle(
      new Request(api + '/images/' + hash(source), {
        method: 'PATCH',
        headers: { Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: destinationUrl })
      })
    )
    expect(response.status).toBe(matches ? 200 : 409)
    const record = await context.rest.handle(
      new Request(api + '/images/' + hash(source))
    )
    if (matches) {
      expect(await response.json()).toMatchObject({ id: hash(destination) })
      expect(record.headers.get('Location')).toBe(
        api + '/images/' + hash(destination)
      )
    } else {
      expect(await response.json()).toMatchObject({
        error: 'Migration requires matching image dimensions'
      })
      expect(record.status).toBe(200)
    }
    expect(
      fetchSpy.mock.calls.filter(([url]) => url === sourceUrl)
    ).toHaveLength(metadata === 'saved' ? 0 : 1)
  }
)

it('migrates an unopened manifest image using its service dimensions', async () => {
  const { manifest, preferred } = alternateServices('unopened')
  const registered = await createManifestFromUrl(context.db, manifest)
  const destination = base + '/migrated-unopened'
  responses.set(destination + '/info.json', info(destination))
  // The canvas already links to both services before the migration.
  await resolveImageServices(context.db, [destination])
  await context.db.insert(schema.canvasesToImages).values({
    canvasId: registered.canvases[0].id,
    imageId: hash(destination)
  })
  expect(
    await migrateImage(context.db, hash(preferred), destination + '/info.json')
  ).toMatchObject({ uri: destination })
  const record = await context.rest.handle(
    new Request(
      context.env.PUBLIC_REST_BASE_URL + '/manifests/' + hash(manifest)
    )
  )
  expect((await record.json()).canvases[0].images).toMatchObject([
    { uri: destination }
  ])
})

it('keeps both HTTPS image services in the publisher group and skips an FTP alternate', async () => {
  const manifest = base + '/manifest/mixed-schemes'
  const older = base + '/2/mixed-schemes'
  const preferred = base + '/3/mixed-schemes'
  const ftp = 'ftp://library.example/2/mixed-schemes'
  addManifest(manifest, older, preferred, ftp)
  responses.set(older + '/info.json', infoV2(older))
  responses.set(preferred + '/info.json', info(preferred))

  const registered = await createManifestFromUrl(context.db, manifest)
  expect(registered.canvases[0].images[0].uri).toBe(preferred)
  const { manifestsToCanvases } = schema
  const links = await context.db
    .select({ services: manifestsToCanvases.imageServiceUris })
    .from(manifestsToCanvases)
    .where(eq(manifestsToCanvases.manifestId, registered.id))
  expect(links).toEqual([{ services: [preferred, older] }])
  expect((await resolveImageServices(context.db, [older])).uri).toBe(preferred)
})

it.each([true, false])(
  'refreshes legacy manifest links once (trusted publisher: %s)',
  async (trusted) => {
    const { manifest, preferred, older } = alternateServices(
      'legacy-links-' + trusted
    )
    const sourceUrl = trusted
      ? manifest
      : 'https://other.example/legacy-manifest'
    responses.set(sourceUrl, responses.get(manifest))
    await createManifestFromUrl(context.db, sourceUrl)
    const links = schema.manifestsToCanvases
    await context.db
      .update(links)
      .set({ imageServiceUris: null })
      .where(eq(links.manifestId, hash(manifest)))
    const api = context.env.PUBLIC_REST_BASE_URL
    const publisherFetch = globalThis.fetch
    const requests: string[] = []
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((url, init) => {
        requests.push(`${init?.method ?? 'GET'} ${url}`)
        return String(url).startsWith(api + '/')
          ? context.rest.handle(new Request(url, init))
          : publisherFetch(url, init)
      })
    try {
      const source = Manifest.parse(responses.get(manifest), {
        keepSource: true
      })
      await fetchManifestRecord(api, source, sourceUrl)
      const refreshed = await fetchManifestRecord(api, source, sourceUrl)
      expect(refreshed.canvases[0].imageServicesIndexed).toBe(true)
      const endpoint = api + '/manifests/' + hash(manifest)
      expect(requests).toEqual([
        'GET ' + endpoint,
        'PUT ' + endpoint,
        'GET ' + sourceUrl,
        'GET ' + endpoint
      ])
      const [link] = await context.db
        .select({ services: links.imageServiceUris })
        .from(links)
        .where(eq(links.manifestId, hash(manifest)))
      expect(link.services).toEqual(trusted ? [preferred, older] : [])
      expect((await resolveEditorImage(api, older)).uri).toBe(
        trusted ? preferred : older
      )
    } finally {
      fetchSpy.mockRestore()
    }
  }
)

it('does not group services on the authority of a third-party manifest', async () => {
  const { manifest, older, preferred } = alternateServices('untrusted')
  const mirror = 'https://other.example/manifest'
  responses.set(mirror, responses.get(manifest))
  await createManifestFromUrl(context.db, mirror)
  for (const uri of [older, preferred])
    expect((await resolveImageServices(context.db, [uri])).uri).toBe(uri)
})

it.each(['v2 first', 'v3 first', 'only v2'])(
  'prefers v3 after direct discovery: %s',
  async (order) => {
    const { manifest, older, preferred } = alternateServices(
      order.replaceAll(' ', '-')
    )
    const visits =
      order === 'only v2'
        ? [older]
        : order === 'v2 first'
          ? [older, preferred]
          : [preferred, older]
    for (const uri of visits) await resolveImageServices(context.db, [uri])
    const result = await createManifestFromUrl(context.db, manifest)
    expect(result.canvases[0].images[0].uri).toBe(preferred)
    expect((await resolveImageServices(context.db, [older])).uri).toBe(
      preferred
    )
  }
)

it('keeps the edited service until an admin promotes its previously opened alias', async () => {
  const { manifest, older, preferred } = alternateServices('edited-v2')
  const api = context.env.PUBLIC_REST_BASE_URL
  for (const uri of [older, preferred])
    await resolveImageServices(context.db, [uri])
  const [saved] = await context.shareDb.saveMaps([
    { ...fixtureMap, resource: { ...fixtureMap.resource, id: older } }
  ])
  await context.shareDb.flushPendingSnapshots()
  // Opening v3 in Editor creates an empty document before the first map is added.
  const doc = context.shareDb.connection.get('images', hash(preferred))
  await new Promise<void>((resolve, reject) =>
    doc.create({}, 'json1', (err) => (err ? reject(err) : resolve()))
  )
  const discovered = await createManifestFromUrl(context.db, manifest)
  expect(discovered.canvases[0].images[0].uri).toBe(preferred)
  expect((await resolveImageServices(context.db, [preferred])).uri).toBe(older)
  const getMaps = async () =>
    (
      await context.rest.handle(
        new Request(api + '/manifests/' + hash(manifest) + '/maps')
      )
    ).json()
  expect(await getMaps()).toMatchObject([{ resource: { id: older } }])
  const cookie = await adminCookie()
  const promotion = await context.rest.handle(
    new Request(api + '/images/' + hash(preferred), {
      method: 'PATCH',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: preferred + '/info.json' })
    })
  )
  expect(promotion.status).toBe(200)
  expect(await promotion.json()).toMatchObject({ id: hash(preferred) })
  await context.shareDb.flushPendingSnapshots()
  expect(await getMaps()).toMatchObject([{ resource: { id: preferred } }])
  expect((await resolveImageServices(context.db, [older])).uri).toBe(preferred)
  const history = await queryImageChecksums(api, context.db, hash(older))
  expect(
    history.map((row) => row.version.split('/').pop()?.split('@')[0])
  ).toEqual([hash(preferred), saved.imageId])
  await new Promise<void>((resolve, reject) =>
    doc.fetch((err) => (err ? reject(err) : resolve()))
  )
  expect(doc.version).toBe(2)
  expect(doc.data).toHaveProperty(saved.mapIds[0])
})

it('keeps migrated maps current when an empty Editor create loses the race', async ({
  onTestFinished
}) => {
  const { db, client, shareDb, close } = await createTestContext({
    seed: 'map'
  })
  onTestFinished(close)
  const sourceId = hash(fixtureMap.resource.id)
  const destination = base + '/racing-create'
  const destinationId = hash(destination)
  responses.set(destination + '/info.json', info(destination))

  // Finish the migration after ShareDB prepares the empty snapshot but before
  // its database adapter attempts to write it.
  shareDb.shareDb.use('commit', (_request, next) => {
    migrateImage(db, sourceId, destination + '/info.json').then(
      () => next(),
      next
    )
  })
  const doc = shareDb.connection.get('images', destinationId)
  const create = new Promise<void>((resolve, reject) =>
    doc.create({}, 'json1', (error) => (error ? reject(error) : resolve()))
  )
  await expect(create).rejects.toMatchObject({
    code: 'ERR_DOC_ALREADY_CREATED'
  })
  await shareDb.flushPendingSnapshots()

  const snapshot = await client.query<{
    data: Record<string, unknown>
    version: number
  }>(
    "SELECT data, version FROM snapshots WHERE collection = 'images' AND doc_id = $1",
    [destinationId]
  )
  expect(snapshot.rows[0].version).toBe(1)
  const currentMaps = await db.query.maps.findMany({
    columns: { id: true },
    where: { imageId: destinationId, latest: true }
  })
  const mapIds = Object.keys(snapshot.rows[0].data)
  expect(mapIds).toHaveLength(1)
  expect(currentMaps.map((map) => map.id)).toEqual(mapIds)
})

it.each([false, true])(
  'leaves both edited documents reachable (legacy aliases: %s)',
  async (legacy) => {
    const { manifest, older, preferred } = alternateServices(
      'both-edited-' + legacy
    )
    for (const uri of [older, preferred]) {
      await resolveImageServices(context.db, [uri])
      await context.shareDb.saveMaps([
        { ...fixtureMap, resource: { ...fixtureMap.resource, id: uri } }
      ])
    }
    await context.shareDb.flushPendingSnapshots()
    await createManifestFromUrl(context.db, manifest)
    if (legacy) {
      await context.client.query(
        'DELETE FROM iiif.image_aliases WHERE image_id IN ($1, $2)',
        [hash(older), hash(preferred)]
      )
    }
    // Both edited images already have their own saved service metadata.
    responses.delete(older + '/info.json')
    responses.delete(preferred + '/info.json')
    for (const uri of [older, preferred]) {
      await expect(
        resolveImageServices(context.db, [uri])
      ).rejects.toMatchObject({ status: 409 })
      const endpoint = context.env.PUBLIC_REST_BASE_URL + '/images/' + hash(uri)
      const metadata = await context.rest.handle(
        new Request(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: uri + '/info.json', resolve: true })
        })
      )
      expect(metadata.status).toBe(200)
      expect(await metadata.json()).toMatchObject({
        id: hash(uri),
        uri,
        data: uri === older ? infoV2(uri) : info(uri)
      })
      const response = await context.rest.handle(new Request(endpoint))
      expect(response.status).toBe(200)
      expect((await response.json()).maps).toHaveLength(1)
    }
  }
)

it('follows image moves in a saved list and keeps a map version pinned', async () => {
  const [original, moved, current] = ['original', 'moved', 'current'].map(
    (name) => base + '/saved-list/' + name
  )
  for (const uri of [original, moved, current]) {
    responses.set(uri + '/info.json', info(uri))
  }
  await resolveImageServices(context.db, [original])
  const [saved] = await context.shareDb.saveMaps([
    { ...fixtureMap, resource: { ...fixtureMap.resource, id: original } }
  ])
  await context.shareDb.flushPendingSnapshots()
  const { db, env } = context
  const owner = context.seedCatalog!.users.find(
    (user) => user.slug === 'local-admin'
  )!
  const list = await createUserList(
    db,
    owner.id,
    'Saved image and pinned version'
  )
  await addItemToList(db, list.id, { imageId: saved.imageId })
  const readImageUris = async () => {
    const page = await queryListGeoreferenceAnnotations(
      env.PUBLIC_ANNOTATIONS_BASE_URL,
      db,
      owner.slug,
      list.id
    )
    return parseAnnotation(page)
      .map((map) => map.resource.id)
      .sort()
  }

  // A list created before the alias table still resolves by its saved ID.
  await context.client.query(
    'DELETE FROM iiif.image_aliases WHERE image_id = $1',
    [saved.imageId]
  )
  expect(await readImageUris()).toEqual([original])
  const pin = await addItemToListByUrl(
    db,
    list.id,
    env.PUBLIC_ANNOTATIONS_BASE_URL + '/maps/' + saved.mapIds[0]
  )
  expect(pin.success).toBe(true)
  for (const uri of [moved, current]) {
    await migrateImage(db, saved.imageId, uri + '/info.json')
    expect(await readImageUris()).toEqual([original, uri].sort())
    const collection = await queryList(
      env.PUBLIC_ANNOTATIONS_BASE_URL,
      db,
      owner.slug,
      list.id
    )
    expect(collection.first?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          allmapsUrl:
            env.PUBLIC_ANNOTATIONS_BASE_URL + '/images/' + saved.imageId,
          georeferencedMapCount: 1,
          target: expect.objectContaining({ id: uri, imageService: uri })
        }),
        expect.objectContaining({
          georeferencedMapCount: 1,
          target: expect.objectContaining({
            type: 'Annotation',
            imageService: original
          })
        })
      ])
    )
  }
  // Saving the new ID alongside the original still publishes each map row once.
  await addItemToList(db, list.id, { imageId: hash(current) })
  expect(await readImageUris()).toEqual([original, current].sort())
})
