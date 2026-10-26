import { rm } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { parseAnnotation } from '@allmaps/annotation'

import {
  createTestContext,
  temporaryDirectory,
  type TestContext
} from './helpers/context.ts'
import { fixtureMap } from './fixtures/map.ts'
import { initializePglite, migrations } from '@allmaps/tools-apis'

describe('APIs with embedded PostgreSQL and PostGIS', () => {
  let context: TestContext
  let mapId: string

  beforeAll(async () => {
    // Unexpected network access fails the suite. Database calls and handler
    // requests below use the real embedded database, not mocked responses.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('API tests must not make network requests')
      })
    )
    context = await createTestContext({ seed: 'map' })
    const maps = await context.client.query<{ id: string }>(
      'SELECT id FROM maps WHERE latest'
    )
    mapId = maps.rows[0].id
  })

  afterAll(async () => {
    try {
      await context?.close()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  async function rest(path: string, init?: RequestInit) {
    return context.rest.handle(
      new Request(`${context.env.PUBLIC_REST_BASE_URL}${path}`, init)
    )
  }

  it('initializes from every migration and accepts the resulting schema on reuse', async () => {
    await initializePglite(context.client)
    const result = await context.client.query<{ count: number }>(
      'SELECT count(*)::int FROM drizzle.__drizzle_migrations'
    )
    expect(result.rows[0].count).toBe(migrations.length)
  })

  it('computes the real PostGIS geography area and generated scale', async () => {
    const result = await context.client.query<{
      area: number
      scale: number
      expected_area: number
      expected_scale: number
      srid: number
    }>(`SELECT area, scale, ST_SRID(geo_mask) AS srid,
      ST_Area(geo_mask::geography) AS expected_area,
      sqrt(ST_Area(resource_mask) / ST_Area(geo_mask::geography)) AS expected_scale
      FROM maps WHERE latest`)
    const map = result.rows[0]
    expect(map.srid).toBe(4326)
    expect(map.area).toBeGreaterThan(700000)
    expect(map.area).toBeLessThan(800000)
    expect(map.area).toBeCloseTo(map.expected_area, 5)
    expect(map.scale).toBeCloseTo(map.expected_scale, 8)
  })

  it('returns the seeded map and its GeoJSON polygon', async () => {
    const response = await rest('/maps')
    expect(response.status).toBe(200)
    const maps = await response.json()
    expect(maps).toHaveLength(1)
    expect(maps[0].resource.id).toBe(fixtureMap.resource.id)

    const geojson = await rest('/maps.geojson')
    expect(geojson.status).toBe(200)
    expect(await geojson.json()).toMatchObject({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: { type: 'Polygon' } }]
    })
  })

  it.each([
    ['intersects', [52.375, 4.895], 1],
    ['intersects', [40, -74], 0],
    ['intersects', [52.374, 4.894, 52.376, 4.896], 1],
    ['intersects', [40, -74, 41, -73], 0],
    ['containedBy', [52.36, 4.88, 52.39, 4.91], 1],
    ['containedBy', [52.374, 4.894, 52.376, 4.896], 0]
  ])('filters %s=%j with PostGIS', async (parameter, coordinates, count) => {
    const query = new URLSearchParams()
    for (const coordinate of coordinates) {
      query.append(parameter, String(coordinate))
    }
    const response = await rest(`/maps?${query}`)
    expect(response.status).toBe(200)
    expect(await response.json()).toHaveLength(count)
  })

  it('returns a single map and 404 for a missing map', async () => {
    const response = await rest(`/maps/${mapId}`)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      type: 'GeoreferencedMap',
      resource: { id: fixtureMap.resource.id }
    })
    expect((await rest('/maps/0000000000000000')).status).toBe(404)
  })

  it('serves valid Georeference Annotations from the same database', async () => {
    const response = await context.annotations.handle(
      new Request(`${context.env.PUBLIC_ANNOTATIONS_BASE_URL}/maps/${mapId}`)
    )
    expect(response.status).toBe(200)
    const maps = parseAnnotation(await response.json())
    expect(maps).toHaveLength(1)
    expect(maps[0].resource.id).toBe(fixtureMap.resource.id)
  })

  it('rejects an unauthenticated list request', async () => {
    expect((await rest('/lists')).status).toBe(401)
  })

  it('creates an anonymous session and persists its user lists', async () => {
    const response = await rest('/auth/sign-in/anonymous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
    expect(response.status).toBe(200)
    const cookies = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0])
      .join('; ')
    expect(cookies).toContain(
      `${context.env.BETTER_AUTH_COOKIE_PREFIX}.session_token=`
    )
    const headers = { Cookie: cookies, 'Content-Type': 'application/json' }
    const lists = await rest('/lists', { headers })
    expect(lists.status).toBe(200)
    expect(await lists.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Starred' })])
    )
    const created = await rest('/lists', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Local test maps' })
    })
    expect(created.status).toBe(200)
    expect(await created.json()).toMatchObject({ name: 'Local test maps' })
  })

  it('rolls back a failed transaction and remains usable', async () => {
    await expect(
      context.client.transaction(async (transaction) => {
        await transaction.query(
          "INSERT INTO iiif.images (id, uri, width, height) VALUES ('rollback', 'https://fixtures.allmaps.test/rollback', 1, 1)"
        )
        throw new Error('Roll back fixture')
      })
    ).rejects.toThrow('Roll back fixture')
    const result = await context.client.query<{ count: number }>(
      "SELECT count(*)::int FROM iiif.images WHERE id = 'rollback'"
    )
    expect(result.rows[0].count).toBe(0)
  })

  it('handles concurrent API reads through the native database driver', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => rest('/maps.geojson'))
    )
    for (const response of responses) {
      expect(response.status).toBe(200)
      expect((await response.json()).features).toHaveLength(1)
    }
  })
})

it('keeps Live snapshots, operations, and maps when a local database reopens', async () => {
  const dataDir = await temporaryDirectory('persistence-')
  let context: TestContext | undefined
  try {
    context = await createTestContext({ dataDir, seed: 'map' })
    const original = await context.client.query<{
      id: string
      image_id: string
      version: number
    }>('SELECT id, image_id, version FROM maps WHERE latest')
    const originalMap = original.rows[0]
    await context.close()
    context = undefined

    context = await createTestContext({ dataDir })
    const maps = await context.client.query('SELECT id FROM maps WHERE latest')
    expect(maps.rows).toEqual([{ id: originalMap.id }])
    const snapshots = await context.client.query<{ version: number }>(
      'SELECT version FROM snapshots WHERE doc_id = $1',
      [originalMap.image_id]
    )
    expect(snapshots.rows[0].version).toBe(originalMap.version)
    const operations = await context.client.query<{ count: number }>(
      'SELECT count(*)::int FROM ops WHERE doc_id = $1',
      [originalMap.image_id]
    )
    expect(operations.rows[0].count).toBe(originalMap.version)

    // Reuse the stored ShareDB document after reopening, then create a new map
    // version through the same persistence path used by the Live API.
    const updatedMap = structuredClone(fixtureMap)
    updatedMap.resourceMask = [
      [10, 10],
      [990, 10],
      [990, 990],
      [10, 990]
    ]
    await context.shareDb.updateMap(originalMap.id, updatedMap)
    await context.shareDb.flushPendingSnapshots()
    expect(context.shareDb.persistErrors).toBe(0)
    const versions = await context.client.query<{
      version: number
      latest: boolean
    }>('SELECT version, latest FROM maps WHERE id = $1 ORDER BY version', [
      originalMap.id
    ])
    expect(versions.rows).toEqual([
      { version: originalMap.version, latest: false },
      { version: originalMap.version + 1, latest: true }
    ])
  } finally {
    await context?.close()
    await rm(dataDir, { recursive: true, force: true })
  }
})
