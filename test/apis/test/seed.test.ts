import { rm } from 'node:fs/promises'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { parseAnnotation } from '@allmaps/annotation'
import { toDbMap3 } from '@allmaps/api-shared'
import { schema } from '@allmaps/db/schema'
import { Image, Manifest } from '@allmaps/iiif-parser'

import {
  createTestContext,
  temporaryDirectory,
  type TestContext
} from './helpers/context.ts'
import {
  createSeedFixtures,
  type SeedCatalog,
  getSeedSummary,
  seedDemoData
} from '@allmaps/tools-seed'
import {
  getIiifFixtureJson,
  getIiifFixtureResponse
} from '@allmaps/tools-iiif-server'

describe('Connected demo seed data', () => {
  let context: TestContext
  let catalog: SeedCatalog

  beforeAll(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('Seeding and reading fixtures must not use the network')
      })
    )
    context = await createTestContext({ seed: 'demo' })
    catalog = context.seedCatalog!
  })

  afterAll(async () => {
    try {
      await context?.close()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  const rest = (path: string, init?: RequestInit) =>
    context.rest.handle(
      new Request(`${context.env.PUBLIC_REST_BASE_URL}${path}`, init)
    )
  async function login(slug: string) {
    const response = await rest(`/__dev/login/${slug}`, { method: 'POST' })
    expect(response.status).toBe(200)
    return {
      Cookie: response.headers
        .getSetCookie()
        .map((cookie) => cookie.split(';')[0])
        .join('; ')
    }
  }

  it('provides real, connected resources and map history', async () => {
    expect(await getSeedSummary(context.client, catalog)).toMatchObject({
      users: 4,
      organizations: 2,
      manifests: 4,
      canvases: 4,
      images: 4,
      maps: 3,
      map_versions: 6,
      snapshots: 3,
      operations: 6,
      lists: 6
    })
    const relationships = await context.client.query<{ count: number }>(
      `SELECT count(*)::int FROM iiif.manifests_canvases mc
       JOIN iiif.canvases_images ci ON ci.canvas_id = mc.canvas_id
       JOIN iiif.images i ON i.id = ci.image_id
       JOIN organization_urls ou ON ou.url = i.domain
       WHERE ou.organization_id = ANY($1::text[])`,
      [catalog.organizations.map((organization) => organization.id)]
    )
    expect(relationships.rows[0].count).toBe(4)
    const members = await context.db.select().from(schema.members)
    expect(members).toHaveLength(4)
  })

  it.each([0, 1, 2, 3])(
    'reads the complete IIIF tree for manifest %i',
    async (index) => {
      const manifest = catalog.manifests[index]
      const response = await rest(`/manifests/${manifest.id}`)
      expect(response.status).toBe(200)
      const result = await response.json()
      expect(result.uri).toBe(manifest.uri)
      expect(result.organization.id).toBe(
        `${context.env.PUBLIC_REST_BASE_URL}/organizations/${manifest.organizationId}`
      )
      expect(result.canvases).toHaveLength(1)
      for (const canvas of result.canvases) {
        expect(canvas.images).toHaveLength(1)
        const imageId = canvas.images[0].id.split('/').at(-1)
        const image = await rest(`/images/${imageId}`)
        expect(image.status).toBe(200)
        const data = await image.json()
        expect(data.fetched).toBe(true)
        expect(data.canvases[0].manifests[0].uri).toBe(manifest.uri)
      }
    }
  )

  it.each([0, 1, 2, 3])(
    'serves real IIIF metadata and image bytes for seeded image %i',
    async (index) => {
      const resource = catalog.images[index]
      const image = Image.parse(
        await getIiifFixtureJson(`${resource.uri}/info.json`)
      )
      const manifest = Manifest.parse(
        await getIiifFixtureJson(catalog.manifests[index].uri)
      )
      expect(image.width).toBe(2500)
      expect(manifest.canvases[0].image.uri).toBe(resource.uri)
      expect(manifest.canvases[0].width).toBe(image.width)
      expect(manifest.canvases[0].height).toBe(image.height)
      const [storedImage] = await context.db
        .select()
        .from(schema.images)
        .where(eq(schema.images.id, resource.id))
      const [storedCanvas] = await context.db
        .select()
        .from(schema.canvases)
        .where(eq(schema.canvases.id, resource.canvasId))
      expect(storedImage.width).toBe(image.width)
      expect(storedImage.height).toBe(image.height)
      expect(storedCanvas.width).toBe(image.width)
      expect(storedCanvas.height).toBe(image.height)

      const response = await getIiifFixtureResponse(
        `${resource.uri}/full/256,/0/default.jpg`
      )
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('image/jpeg')
      const bytes = new Uint8Array(await response.arrayBuffer())
      expect(Array.from(bytes.slice(0, 3))).toEqual([0xff, 0xd8, 0xff])
      expect(bytes.length).toBeGreaterThan(1000)
    }
  )

  it('includes an unmapped image for georeferenced filters', async () => {
    const response = await rest('/images?georeferenced=false')
    expect(response.status).toBe(200)
    const images = await response.json()
    expect(images).toHaveLength(1)
    expect(images[0].uri).toBe(catalog.images[3].uri)
    expect(images[0].maps).toEqual([])
    const mapped = await rest('/images?georeferenced=true')
    expect(mapped.status).toBe(200)
    expect(await mapped.json()).toHaveLength(3)
  })

  it('finds organization and manifest maps through their IIIF relationships', async () => {
    const organization = catalog.organizations[0]
    const resources = await rest(`/organizations/${organization.id}/images`)
    expect(resources.status).toBe(200)
    expect(await resources.json()).toHaveLength(2)
    const maps = await rest(`/manifests/${catalog.manifests[0].id}/maps`)
    expect(maps.status).toBe(200)
    expect(await maps.json()).toHaveLength(1)
    const annotations = await context.annotations.handle(
      new Request(
        `${context.env.PUBLIC_ANNOTATIONS_BASE_URL}/manifests/${catalog.manifests[0].id}`
      )
    )
    expect(annotations.status).toBe(200)
    expect(parseAnnotation(await annotations.json())).toHaveLength(1)
  })

  it('authenticates the administrator with a real Better Auth session', async () => {
    const headers = await login('local-admin')
    const response = await rest('/users', { headers })
    expect(response.status).toBe(200)
    const users = await response.json()
    expect(users.map((user: { slug: string }) => user.slug).sort()).toEqual(
      catalog.users.map((user) => user.slug).sort()
    )
    expect(await context.db.select().from(schema.sessions)).toHaveLength(1)
  })

  it('denies the editor access to administrator-only user APIs', async () => {
    const headers = await login('local-editor')
    expect((await rest('/users', { headers })).status).toBe(401)
    expect((await rest('/users')).status).toBe(401)
    expect(
      (await rest('/__dev/login/unknown', { method: 'POST' })).status
    ).toBe(404)
  })

  it('exposes memberships to the member while keeping public organization details public', async () => {
    const user = catalog.users.find((user) => user.slug === 'local-member')!
    const headers = await login(user.slug)
    const response = await rest(`/users/${user.id}`, { headers })
    expect(response.status).toBe(200)
    const result = await response.json()
    expect(result.organizations).toHaveLength(2)
    expect(
      result.organizations
        .map((membership: { userRole: string }) => membership.userRole)
        .sort()
    ).toEqual(['member', 'owner'])

    const publicOrganization = await rest(
      `/organizations/${catalog.organizations[0].id}`
    )
    expect(publicOrganization.status).toBe(200)
    expect(await publicOrganization.json()).not.toHaveProperty('users')
    const memberOrganization = await rest(
      `/organizations/${catalog.organizations[0].id}`,
      { headers }
    )
    expect(memberOrganization.status).toBe(200)
    expect((await memberOrganization.json()).users).toHaveLength(3)
  })

  it('seeds lists containing historical maps, images, canvases, and manifests', async () => {
    const headers = await login('local-editor')
    const list = catalog.lists.find(
      (list) => list.key === 'amsterdam-research'
    )!
    const response = await rest(`/lists/${list.id}`, { headers })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.items).toHaveLength(4)
    expect(data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mapId: catalog.maps[0].id, mapVersion: 1 }),
        expect.objectContaining({ imageId: catalog.images[1].id }),
        expect.objectContaining({ canvasId: catalog.images[0].canvasId }),
        expect.objectContaining({ manifestId: catalog.manifests[0].id })
      ])
    )
    const annotations = await context.annotations.handle(
      new Request(
        `${context.env.PUBLIC_ANNOTATIONS_BASE_URL}/@local-editor/lists/${list.id}`,
        { headers }
      )
    )
    expect(annotations.status).toBe(200)
    // The pinned original and current Amsterdam map, plus Diependorst.
    expect(parseAnnotation(await annotations.json())).toHaveLength(3)
  })

  it('enforces list ownership between seeded users', async () => {
    const headers = await login('local-visitor')
    const list = catalog.lists.find(
      (list) => list.key === 'amsterdam-research'
    )!
    const response = await rest(`/lists/${list.id}`, { headers })
    expect(response.status, JSON.stringify(await response.json())).toBe(404)
    const annotations = await context.annotations.handle(
      new Request(
        `${context.env.PUBLIC_ANNOTATIONS_BASE_URL}/@local-editor/lists/${list.id}`,
        { headers }
      )
    )
    expect(annotations.status).toBe(403)
  })

  it('replays ShareDB operations to recover every historical snapshot', async () => {
    const fixtures = await createSeedFixtures()
    const map = fixtures.maps[0]
    for (let version = 1; version <= map.stages.length; version++) {
      const snapshot = await new Promise<{ v: number; data: unknown }>(
        (resolve, reject) => {
          context.shareDb.connection.fetchSnapshot(
            'images',
            map.resource.id,
            version,
            (error, snapshot) => {
              if (error) reject(error)
              else resolve({ v: snapshot.v, data: snapshot.data })
            }
          )
        }
      )
      expect(snapshot.v).toBe(version)
      const expectedMap = await toDbMap3({
        ...map.stages[version - 1],
        id: map.id
      })
      expect(snapshot.data).toEqual(
        JSON.parse(JSON.stringify({ [map.id]: expectedMap }))
      )
    }
    const response = await rest(`/maps/${map.id}/versions`)
    expect(response.status).toBe(200)
    const versions = await response.json()
    expect(versions).toHaveLength(3)
    for (const version of versions) {
      const historical = await context.annotations.handle(
        new Request(version.version)
      )
      expect(historical.status).toBe(200)
      expect(parseAnnotation(await historical.json())).toHaveLength(1)
    }
  })

  it('preserves an older seed database and asks for a fresh directory', async () => {
    const before = await getSeedSummary(context.client, catalog)
    await context.client.query(
      'INSERT INTO drizzle.__allmaps_seeds (name) VALUES ($1)',
      ['allmaps-demo-v1']
    )
    try {
      await expect(seedDemoData(context)).rejects.toThrow('PGLITE_DATA_DIR')
      expect(await getSeedSummary(context.client, catalog)).toEqual(before)
    } finally {
      await context.client.query(
        'DELETE FROM drizzle.__allmaps_seeds WHERE name = $1',
        ['allmaps-demo-v1']
      )
    }
  })

  it('does not add duplicate data or history when seeding twice', async () => {
    const before = await getSeedSummary(context.client, catalog)
    expect(await seedDemoData(context)).toEqual(catalog)
    expect(await getSeedSummary(context.client, catalog)).toEqual(before)
    expect(await context.db.select().from(schema.members)).toHaveLength(4)
    expect(await context.db.select().from(schema.listItems)).toHaveLength(6)
  })
})

it('preserves local map and user edits when a seeded database reopens', async () => {
  const dataDir = await temporaryDirectory('seed-')
  let context: TestContext | undefined
  try {
    context = await createTestContext({ dataDir, seed: 'demo' })
    const catalog = context.seedCatalog!
    const fixtures = await createSeedFixtures()
    const editedMap = structuredClone(fixtures.maps[0].stages.at(-1)!)
    editedMap.resourceMask = [
      [40, 40],
      [960, 40],
      [960, 960],
      [40, 960]
    ]
    await context.shareDb.updateMap(catalog.maps[0].id, editedMap)
    await context.shareDb.flushPendingSnapshots()
    await context.db
      .update(schema.users)
      .set({ fullName: 'Locally edited user' })
      .where(eq(schema.users.id, catalog.users[0].id))
    const before = await getSeedSummary(context.client, catalog)
    expect(before).toMatchObject({ maps: 3, map_versions: 7, operations: 7 })
    await context.close()
    context = undefined

    context = await createTestContext({ dataDir, seed: 'demo' })
    expect(await getSeedSummary(context.client, catalog)).toEqual(before)
    const [user] = await context.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, catalog.users[0].id))
    expect(user.fullName).toBe('Locally edited user')
    const response = await context.rest.handle(
      new Request(
        `${context.env.PUBLIC_REST_BASE_URL}/maps/${catalog.maps[0].id}`
      )
    )
    expect(response.status).toBe(200)
    expect((await response.json()).resourceMask).toEqual(editedMap.resourceMask)

    // Simulate a missing completion marker after interrupted seeding. Existing
    // records and newer ShareDB versions must still be preserved.
    await context.client.query('DELETE FROM drizzle.__allmaps_seeds')
    await seedDemoData(context)
    expect(await getSeedSummary(context.client, catalog)).toEqual(before)
    expect(await context.db.select().from(schema.listItems)).toHaveLength(6)
  } finally {
    await context?.close()
    await rm(dataDir, { recursive: true, force: true })
  }
})
