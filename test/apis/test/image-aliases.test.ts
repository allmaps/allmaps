import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import {
  addItemToList,
  addItemToListByUrl,
  createManifestFromUrl,
  createUserList,
  queryListGeoreferenceAnnotations,
  migrateImage,
  queryImageChecksums,
  resolveImageServices
} from '@allmaps/api-shared/db'
import { createTestContext, type TestContext } from './helpers/context.ts'
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
  preferredService: string
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
    {
      id: olderService,
      type: 'ImageService2',
      profile: 'http://iiif.io/api/image/2/level2.json'
    },
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

  await migrateImage(context.db, hash(v2), moved + '/info.json')
  responses.delete(encoded + '/info.json')
  expect(
    await migrateImage(context.db, hash(canonical), moved + '/info.json')
  ).toMatchObject({ id: hash(moved) })
  expect(await resolveImageServices(context.db, [encoded])).toMatchObject({
    uri: moved
  })
  expect(await getMaps()).toMatchObject([{ resource: { id: moved } }])
  const historyQuery = vi.spyOn(context.client, 'query')
  try {
    const history = await queryImageChecksums(
      'https://annotations.example',
      context.db,
      hash(encoded)
    )
    expect(
      history.map((row) => row.version.split('/').pop()?.split('@')[0])
    ).toEqual([hash(moved), hash(canonical)])
    expect(historyQuery).toHaveBeenCalledTimes(1)
  } finally {
    historyQuery.mockRestore()
  }
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
    'UPDATE iiif.images SET data = NULL WHERE id = $1',
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

it('migrates an unopened manifest image using its service dimensions', async () => {
  const { manifest, preferred } = alternateServices('unopened')
  await createManifestFromUrl(context.db, manifest)
  const destination = base + '/migrated-unopened'
  responses.set(destination + '/info.json', info(destination))
  expect(
    await migrateImage(context.db, hash(preferred), destination + '/info.json')
  ).toMatchObject({ uri: destination })
  const record = await context.rest.handle(
    new Request(
      context.env.PUBLIC_REST_BASE_URL + '/manifests/' + hash(manifest)
    )
  )
  expect((await record.json()).canvases[0].images[0].uri).toBe(destination)
})

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
  const login = await context.rest.handle(
    new Request(api + '/__dev/login/local-admin', { method: 'POST' })
  )
  expect(login.status).toBe(200)
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ')
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

it('leaves both documents reachable if both services have edits', async () => {
  const { manifest, older, preferred } = alternateServices('both-edited')
  for (const uri of [older, preferred]) {
    await context.shareDb.saveMaps([
      { ...fixtureMap, resource: { ...fixtureMap.resource, id: uri } }
    ])
  }
  await context.shareDb.flushPendingSnapshots()
  await createManifestFromUrl(context.db, manifest)
  for (const uri of [older, preferred]) {
    await expect(resolveImageServices(context.db, [uri])).rejects.toMatchObject(
      { status: 409 }
    )
    const response = await context.rest.handle(
      new Request(context.env.PUBLIC_REST_BASE_URL + '/images/' + hash(uri))
    )
    expect((await response.json()).maps).toHaveLength(1)
  }
})

it('follows image moves in a saved list and keeps a map version pinned', async () => {
  const [original, moved, current] = ['original', 'moved', 'current'].map(
    (name) => base + '/saved-list/' + name
  )
  for (const uri of [original, moved, current]) {
    responses.set(uri + '/info.json', info(uri))
  }
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
  }
  // Saving the new ID alongside the original still publishes each map row once.
  await addItemToList(db, list.id, { imageId: hash(current) })
  expect(await readImageUris()).toEqual([original, current].sort())
})
