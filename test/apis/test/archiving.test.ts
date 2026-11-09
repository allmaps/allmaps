import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseAnnotation } from '@allmaps/annotation'
import { schema } from '@allmaps/db/schema'
import { eq } from 'drizzle-orm'

import { createTestContext, type TestContext } from './helpers/context.ts'
import { fixtureMap } from './fixtures/map.ts'

describe('admin archiving', () => {
  let context: TestContext
  let adminHeaders: HeadersInit
  let userHeaders: HeadersInit

  function request(
    api: 'rest' | 'annotations',
    path: string,
    init?: RequestInit
  ) {
    const baseUrl =
      api === 'rest'
        ? context.env.PUBLIC_REST_BASE_URL
        : context.env.PUBLIC_ANNOTATIONS_BASE_URL
    return context[api].handle(new Request(`${baseUrl}${path}`, init))
  }

  async function login(slug: string) {
    const response = await request('rest', `/__dev/login/${slug}`, {
      method: 'POST'
    })
    expect(response.status).toBe(200)
    return {
      Cookie: response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; ')
    }
  }

  const archive = (resource: 'maps' | 'images', id: string) =>
    request('rest', `/${resource}/${id}`, {
      method: 'DELETE',
      headers: adminHeaders
    })

  beforeEach(async () => {
    vi.stubGlobal('fetch', () => {
      throw new Error('Archive tests must not use the network')
    })
    context = await createTestContext({ seed: 'demo' })
    adminHeaders = await login('local-admin')
    userHeaders = await login('local-editor')
  })

  afterEach(async () => {
    try {
      await context?.close()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('requires an Allmaps admin and returns 404 for unknown resources', async () => {
    const map = context.seedCatalog!.maps[0]
    for (const [resource, id] of [
      ['maps', map.id],
      ['images', map.imageId]
    ]) {
      for (const headers of [undefined, userHeaders]) {
        const response = await request('rest', `/${resource}/${id}`, {
          method: 'DELETE',
          headers
        })
        expect(response.status).toBe(401)
      }
      const missing = await request('rest', `/${resource}/0000000000000000`, {
        method: 'DELETE',
        headers: adminHeaders
      })
      expect(missing.status).toBe(404)
      expect(missing.headers.get('Cache-Control')).toBe('private, no-store')
    }
    expect(
      (await context.db.select().from(schema.maps)).every(
        (map) => !map.archived
      )
    ).toBe(true)
    expect(
      (await context.db.select().from(schema.images)).every(
        (image) => !image.archived
      )
    ).toBe(true)
  })

  it('archives every map version idempotently without changing data or live documents', async () => {
    const map = context.seedCatalog!.maps[0]
    const before = await context.db.select().from(schema.maps)
    const snapshots = await context.db.select().from(schema.snapshots)
    const operations = await context.db.select().from(schema.ops)
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await archive('maps', map.id)
      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ success: true })
      expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    }
    const after = await context.db.select().from(schema.maps)
    expect(after).toEqual(
      expect.arrayContaining(
        before.map((row) => ({ ...row, archived: row.id === map.id }))
      )
    )
    expect(after).toHaveLength(before.length)
    expect(
      (await context.db.select().from(schema.images)).every(
        (image) => !image.archived
      )
    ).toBe(true)
    expect(await context.db.select().from(schema.snapshots)).toEqual(snapshots)
    expect(await context.db.select().from(schema.ops)).toEqual(operations)

    const document = context.shareDb.connection.get('images', map.imageId)
    await new Promise<void>((resolve, reject) =>
      document.fetch((error) => (error ? reject(error) : resolve()))
    )
    expect(document.data).toHaveProperty(map.id)
    await context.shareDb.flushPendingSnapshots()
    expect(
      (
        await context.db
          .select()
          .from(schema.maps)
          .where(eq(schema.maps.id, map.id))
      ).every((row) => row.archived)
    ).toBe(true)
    document.destroy()
  })

  it.each(['maps', 'images'] as const)(
    'filters current publications for archived %s while retaining historical and other REST reads',
    async (resource) => {
      const catalog = context.seedCatalog!
      const map = catalog.maps[0]
      const image = catalog.images.find((image) => image.id === map.imageId)!
      const versions = await context.db
        .select()
        .from(schema.maps)
        .where(eq(schema.maps.id, map.id))
      const historicalPaths = versions.flatMap((version) => [
        `/maps/${map.id}@${version.checksum}`,
        `/maps/${map.id}@${version.checksum}.geojson`,
        `/images/${map.imageId}@${version.imageChecksum}`,
        `/images/${map.imageId}@${version.imageChecksum}.geojson`
      ])
      const historical = await Promise.all(
        historicalPaths.map(async (path) =>
          (await request('annotations', path)).json()
        )
      )
      expect(
        (await archive(resource, resource === 'maps' ? map.id : map.imageId))
          .status
      ).toBe(200)

      for (const api of ['rest', 'annotations'] as const) {
        const response = await request(api, '/maps')
        expect(response.status).toBe(200)
        const maps =
          api === 'rest'
            ? await response.json()
            : parseAnnotation(await response.json())
        expect(maps).toHaveLength(catalog.maps.length - 1)
        expect(response.headers.get('Cache-Control')).toBe(
          'public, max-age=30, s-maxage=30'
        )
        const geojson = await (await request(api, '/maps.geojson')).json()
        expect(geojson.features).toHaveLength(catalog.maps.length - 1)
      }
      for (const path of [
        `/maps/${map.id}`,
        `/maps/${map.id}.geojson`,
        `/images/${map.imageId}`,
        `/images/${map.imageId}.geojson`,
        `/canvases/${image.canvasId}`,
        `/manifests/${catalog.manifests[0].id}`
      ]) {
        expect((await request('annotations', path)).status).toBe(404)
      }
      const organization = await request(
        'annotations',
        `/organizations/${catalog.organizations[0].slug}`
      )
      expect(organization.status).toBe(200)
      expect(
        parseAnnotation(await organization.json()).every(
          (result) => result.resource.id !== image.uri
        )
      ).toBe(true)
      expect(organization.headers.get('Cache-Control')).toBe(
        'public, max-age=60, s-maxage=300'
      )
      const historicalAfter = await Promise.all(
        historicalPaths.map(async (path) => {
          const response = await request('annotations', path)
          expect(response.status).toBe(200)
          return response.json()
        })
      )
      expect(historicalAfter).toEqual(historical)
      for (const path of [
        `/maps/${map.id}`,
        `/maps/${map.id}.geojson`,
        `/maps/${map.id}/versions`,
        `/images/${map.imageId}`,
        `/images/${map.imageId}/maps`,
        `/images/${map.imageId}/versions`
      ]) {
        expect((await request('rest', path)).status).toBe(200)
      }
    }
  )

  it('filters list annotations including pinned versions, without removing list memberships', async () => {
    const catalog = context.seedCatalog!
    const map = catalog.maps[0]
    const list = catalog.lists.find(
      (list) => list.key === 'amsterdam-research'
    )!
    const owner = catalog.users.find((user) => user.id === list.userId)!
    const before = await context.db.select().from(schema.listItems)
    await archive('maps', map.id)
    await archive('images', catalog.maps[1].imageId)
    for (const suffix of ['', '/georeference-annotations']) {
      const response = await request(
        'annotations',
        `/@${owner.slug}/lists/${list.id}${suffix}`,
        { headers: adminHeaders }
      )
      expect(response.status).toBe(200)
      expect((await response.json()).items).toEqual([])
    }
    expect(await context.db.select().from(schema.listItems)).toEqual(before)
  })

  it('checks the parent image and excludes archived resources from random annotations', async () => {
    // Even an unarchived map must not escape an archived image's publication flag.
    await context.db.update(schema.images).set({ archived: true })
    expect(
      (await context.db.select().from(schema.maps)).every(
        (map) => !map.archived
      )
    ).toBe(true)
    expect(await (await request('rest', '/maps')).json()).toEqual([])
    expect(
      (await (await request('annotations', '/maps')).json()).items
    ).toEqual([])
    expect((await request('annotations', '/maps/random')).status).toBe(404)
    const map = context.seedCatalog!.maps[0]
    const version = (
      await context.db
        .select()
        .from(schema.maps)
        .where(eq(schema.maps.id, map.id))
    )[0]
    expect(
      (await request('annotations', `/maps/${map.id}@${version.checksum}`))
        .status
    ).toBe(200)
  })

  it('unarchives the entire image, its siblings and all versions on the next save', async () => {
    const catalog = context.seedCatalog!
    const map = catalog.maps[0]
    const image = catalog.images.find((image) => image.id === map.imageId)!
    const siblingId = '1234567890abcdef'
    const sibling = {
      ...fixtureMap,
      resource: { ...fixtureMap.resource, id: image.uri }
    }
    await context.shareDb.updateMap(siblingId, sibling)
    await context.shareDb.flushPendingSnapshots()
    const before = await context.db
      .select()
      .from(schema.maps)
      .where(eq(schema.maps.imageId, image.id))
    await archive('images', image.id)
    await archive('images', catalog.maps[1].imageId)
    expect(
      (
        await context.db
          .select()
          .from(schema.maps)
          .where(eq(schema.maps.imageId, image.id))
      ).every((row) => row.archived)
    ).toBe(true)
    await context.shareDb.updateMap(siblingId, {
      ...sibling,
      resourceMask: [
        [10, 10],
        [990, 10],
        [990, 990],
        [10, 990]
      ]
    })
    await context.shareDb.flushPendingSnapshots()
    expect(context.shareDb.persistErrors).toBe(0)
    const after = await context.db
      .select()
      .from(schema.maps)
      .where(eq(schema.maps.imageId, image.id))
    expect(after.length).toBeGreaterThan(before.length)
    expect(after.every((row) => !row.archived)).toBe(true)
    expect(
      (
        await context.db
          .select()
          .from(schema.images)
          .where(eq(schema.images.id, image.id))
      )[0].archived
    ).toBe(false)
    expect(
      (
        await context.db
          .select()
          .from(schema.images)
          .where(eq(schema.images.id, catalog.maps[1].imageId))
      )[0].archived
    ).toBe(true)
    expect((await request('annotations', `/maps/${map.id}`)).status).toBe(200)
    expect((await request('annotations', `/maps/${siblingId}`)).status).toBe(
      200
    )
  })

  it('unarchives an empty saved document without leaving old maps current', async () => {
    const map = context.seedCatalog!.maps[0]
    const versions = await context.db
      .select()
      .from(schema.maps)
      .where(eq(schema.maps.imageId, map.imageId))
    await archive('images', map.imageId)
    const document = context.shareDb.connection.get('images', map.imageId)
    await new Promise<void>((resolve, reject) =>
      document.fetch((error) => (error ? reject(error) : resolve()))
    )
    for (const mapId of Object.keys(document.data)) {
      await new Promise<void>((resolve, reject) =>
        document.submitOp([mapId, { r: true }], {}, (error) =>
          error ? reject(error) : resolve()
        )
      )
    }
    await context.shareDb.flushPendingSnapshots()
    expect(context.shareDb.persistErrors).toBe(0)
    const rows = await context.db
      .select()
      .from(schema.maps)
      .where(eq(schema.maps.imageId, map.imageId))
    expect(rows).toHaveLength(versions.length)
    expect(rows.every((row) => !row.latest && !row.archived)).toBe(true)
    expect(
      (
        await context.db
          .select()
          .from(schema.images)
          .where(eq(schema.images.id, map.imageId))
      )[0].archived
    ).toBe(false)
    expect((await request('annotations', `/maps/${map.id}`)).status).toBe(404)
    expect(
      (await request('annotations', `/maps/${map.id}@${versions[0].checksum}`))
        .status
    ).toBe(200)
    document.destroy()
  })

  it('documents both DELETE operations as admin-only archival', async () => {
    const response = await request('rest', '/openapi.json')
    const specification = await response.json()
    for (const path of ['/maps/{mapId}', '/images/{imageId}']) {
      const operation = specification.paths[path].delete
      expect(operation.security).toEqual([{ sessionCookie: [] }])
      expect(operation.description).toContain('without deleting')
      expect(operation.description).toContain('unarchives')
    }
  })
})
