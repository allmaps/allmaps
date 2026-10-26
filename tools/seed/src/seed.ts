import { eq } from 'drizzle-orm'
import { generateChecksum } from '@allmaps/id'
import { Image, Manifest } from '@allmaps/iiif-parser'
import { schema } from '@allmaps/db/schema'
import type { PgliteDb } from '@allmaps/db'
import type { PGlite } from '@electric-sql/pglite'
import type { AllmapsShareDB } from '@allmaps/api-live'

import {
  createSeedFixtures,
  createSeedCatalog,
  seedCreatedAt,
  seedVersion,
  type SeedCatalog,
  type SeedFixtures
} from './seed-fixtures.ts'

type SeedContext = { client: PGlite; db: PgliteDb; shareDb: AllmapsShareDB }

async function seedRecords(db: PgliteDb, fixtures: SeedFixtures) {
  // Insert the connected relational data atomically. Stable IDs and conflict
  // handling also make recovery from interrupted first-time seeding safe.
  await db.transaction(async (transaction) => {
    await transaction
      .insert(schema.users)
      .values(
        fixtures.users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          slug: user.slug,
          role: user.role,
          emailVerified: true,
          isAnonymous: false,
          createdAt: seedCreatedAt,
          updatedAt: seedCreatedAt
        }))
      )
      .onConflictDoNothing()
    await transaction
      .insert(schema.organizations)
      .values(
        fixtures.organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          homepage: `http://${organization.domain}:5506/`,
          plan: organization.plan,
          displayCollections: true,
          createdAt: seedCreatedAt,
          location: {
            type: 'Point' as const,
            coordinates: organization.coordinates
          }
        }))
      )
      .onConflictDoNothing()
    await transaction
      .insert(schema.organizationUrls)
      .values(
        fixtures.organizations.map((organization) => ({
          organizationId: organization.id,
          url: organization.domain,
          type: 'domain' as const
        }))
      )
      .onConflictDoNothing()
    await transaction
      .insert(schema.members)
      .values(
        fixtures.memberships.map((membership) => ({
          id: membership.id,
          userId: membership.user.id,
          organizationId: membership.organization.id,
          role: membership.role,
          createdAt: seedCreatedAt
        }))
      )
      .onConflictDoNothing()
    await transaction
      .insert(schema.lists)
      .values(
        fixtures.lists.map((list) => ({
          id: list.id,
          userId: list.user.id,
          name: list.name,
          deletable: list.deletable,
          createdAt: seedCreatedAt,
          updatedAt: seedCreatedAt
        }))
      )
      .onConflictDoNothing()

    for (const resource of fixtures.resources) {
      const image = Image.parse(resource.imageData)
      await transaction
        .insert(schema.images)
        .values({
          id: resource.id,
          uri: image.uri,
          width: image.width,
          height: image.height,
          data: resource.imageData,
          checksum: await generateChecksum(resource.imageData),
          embedded: false,
          createdAt: seedCreatedAt,
          updatedAt: seedCreatedAt
        })
        .onConflictDoNothing()
      await transaction
        .insert(schema.canvases)
        .values({
          id: resource.canvasId,
          uri: resource.canvasUri,
          label: resource.canvas.label,
          width: resource.canvas.width,
          height: resource.canvas.height,
          createdAt: seedCreatedAt,
          updatedAt: seedCreatedAt
        })
        .onConflictDoNothing()
      await transaction
        .insert(schema.canvasesToImages)
        .values({
          canvasId: resource.canvasId,
          imageId: resource.id
        })
        .onConflictDoNothing()
    }
    for (const manifest of fixtures.manifests) {
      const parsed = Manifest.parse(manifest.data)
      await transaction
        .insert(schema.manifests)
        .values({
          id: manifest.id,
          uri: parsed.uri,
          label: parsed.label,
          data: manifest.data,
          checksum: await generateChecksum(manifest.data),
          createdAt: seedCreatedAt,
          updatedAt: seedCreatedAt
        })
        .onConflictDoNothing()
      await transaction
        .insert(schema.manifestsToCanvases)
        .values({
          manifestId: manifest.id,
          canvasId: manifest.canvasId
        })
        .onConflictDoNothing()
    }
  })
}

async function seedMapHistory(context: SeedContext, fixtures: SeedFixtures) {
  for (const map of fixtures.maps) {
    const snapshot = await context.client.query<{ version: number }>(
      "SELECT version FROM snapshots WHERE collection = 'images' AND doc_id = $1",
      [map.resource.id]
    )
    let version = snapshot.rows[0]?.version ?? 0
    if (version === 0) {
      await context.shareDb.saveMaps([map.stages[0]])
      await context.shareDb.flushPendingSnapshots()
      version = 1
    }
    // Continue an interrupted seed, flushing every edit so the normal debounce
    // cannot collapse the seed history into a single map version.
    for (let stage = version; stage < map.stages.length; stage++) {
      await context.shareDb.updateMap(map.id, map.stages[stage])
      await context.shareDb.flushPendingSnapshots()
    }
    if (context.shareDb.persistErrors) {
      throw new Error(`Failed to persist seed map history: ${map.resource.key}`)
    }
  }
}

async function seedListItems(db: PgliteDb, fixtures: SeedFixtures) {
  const amsterdamList = fixtures.lists.find(
    (list) => list.key === 'amsterdam-research'
  )!
  const europeList = fixtures.lists.find(
    (list) => list.key === 'europe-survey'
  )!
  const [firstVersion] = await db
    .select()
    .from(schema.maps)
    .where(eq(schema.maps.id, fixtures.maps[0].id))
    .orderBy(schema.maps.version)
    .limit(1)
  if (!firstVersion) throw new Error('Missing seeded Amsterdam map')
  await db
    .insert(schema.listItems)
    .values([
      {
        listId: amsterdamList.id,
        mapId: firstVersion.id,
        mapImageId: firstVersion.imageId,
        mapChecksum: firstVersion.checksum,
        mapVersion: firstVersion.version
      },
      { listId: amsterdamList.id, imageId: fixtures.resources[1].id },
      { listId: amsterdamList.id, canvasId: fixtures.resources[0].canvasId },
      { listId: amsterdamList.id, manifestId: fixtures.manifests[0].id },
      { listId: europeList.id, imageId: fixtures.resources[3].id },
      { listId: europeList.id, manifestId: fixtures.manifests[2].id }
    ])
    .onConflictDoNothing()
}

export async function seedDemoData(
  context: SeedContext,
  fixturePort?: number
): Promise<SeedCatalog> {
  const fixtures = await createSeedFixtures(fixturePort)
  const catalog = createSeedCatalog(fixtures)
  await context.client.exec(`
    CREATE TABLE IF NOT EXISTS drizzle.__allmaps_seeds (
      name text PRIMARY KEY,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `)
  const applied = await context.client.query<{ name: string }>(
    "SELECT name FROM drizzle.__allmaps_seeds WHERE name LIKE 'allmaps-demo-%'"
  )
  if (applied.rows.some((seed) => seed.name !== seedVersion)) {
    throw new Error(
      'This database contains an older demo seed. Choose a fresh PGLITE_DATA_DIR ' +
        'to use the tools/iiif-server fixtures while preserving the existing database.'
    )
  }
  if (applied.rows.length) return catalog

  await seedRecords(context.db, fixtures)
  await seedMapHistory(context, fixtures)
  await seedListItems(context.db, fixtures)
  await context.client.query(
    'INSERT INTO drizzle.__allmaps_seeds (name) VALUES ($1) ON CONFLICT DO NOTHING',
    [seedVersion]
  )
  return catalog
}

export async function getSeedSummary(client: PGlite, catalog: SeedCatalog) {
  const result = await client.query<{
    maps: number
    map_versions: number
    snapshots: number
    operations: number
  }>(
    `SELECT
    (SELECT count(*)::int FROM maps WHERE latest AND image_id = ANY($1::text[])) AS maps,
    (SELECT count(*)::int FROM maps WHERE image_id = ANY($1::text[])) AS map_versions,
    (SELECT count(*)::int FROM snapshots WHERE collection = 'images' AND doc_id = ANY($1::text[])) AS snapshots,
    (SELECT count(*)::int FROM ops WHERE collection = 'images' AND doc_id = ANY($1::text[])) AS operations`,
    [catalog.images.map((image) => image.id)]
  )
  return {
    version: catalog.version,
    users: catalog.users.length,
    organizations: catalog.organizations.length,
    manifests: catalog.manifests.length,
    canvases: catalog.images.length,
    images: catalog.images.length,
    lists: catalog.lists.length,
    ...result.rows[0]
  }
}
