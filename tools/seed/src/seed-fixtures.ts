import { parseAnnotation, type GeoreferencedMap } from '@allmaps/annotation'
import { toDbMap3 } from '@allmaps/api-shared'
import { generateId } from '@allmaps/id'
import { Image, Manifest } from '@allmaps/iiif-parser'
import ports from '../../../ports.json' with { type: 'json' }
import { getIiifFixtureJson } from '@allmaps/tools-iiif-server'

export const seedVersion = 'allmaps-demo-v2'
export const seedCreatedAt = new Date('2025-01-15T12:00:00Z')

const seedId = (kind: string, key: string) =>
  generateId(`${seedVersion}/${kind}/${key}`)

function cropMap(map: GeoreferencedMap, fraction: number): GeoreferencedMap {
  const center = map.resourceMask
    .reduce(([x, y], point) => [x + point[0], y + point[1]], [0, 0])
    .map((coordinate) => coordinate / map.resourceMask.length)
  return {
    ...structuredClone(map),
    resourceMask: map.resourceMask.map(([x, y]) => [
      Math.round(x + (center[0] - x) * fraction),
      Math.round(y + (center[1] - y) * fraction)
    ])
  }
}

export async function createSeedFixtures(fixturePort = ports.iiif) {
  const organizations = await Promise.all(
    [
      {
        key: 'amsterdam',
        name: 'Demo Amsterdam Archive',
        slug: 'demo-amsterdam',
        domain: 'localhost',
        plan: 'innovator',
        coordinates: [4.895, 52.375] as [number, number]
      },
      {
        key: 'europe',
        name: 'Demo European Map Library',
        slug: 'demo-europe',
        domain: '127.0.0.1',
        plan: null,
        coordinates: [-0.12, 51.5] as [number, number]
      }
    ].map(async (organization) => ({
      ...organization,
      id: await seedId('organization', organization.key)
    }))
  )

  const users = await Promise.all(
    [
      { slug: 'local-admin', fullName: 'Demo Administrator', role: 'admin' },
      { slug: 'local-editor', fullName: 'Demo Map Editor', role: 'user' },
      { slug: 'local-member', fullName: 'Demo Archive Member', role: 'user' },
      { slug: 'local-visitor', fullName: 'Demo Visitor', role: 'user' }
    ].map(async (user) => ({
      ...user,
      id: await seedId('user', user.slug),
      email: `${user.slug}@fixtures.allmaps.test`
    }))
  )

  const resources = await Promise.all(
    [
      {
        key: 'amsterdam-city',
        fixtureId: '4f4a289db37a73f2',
        organization: organizations[0],
        title: 'Amsterdam: N.39 Buurt Z, 1ste blad'
      },
      {
        key: 'diependorst',
        fixtureId: '5005dbd7e344f975',
        organization: organizations[0],
        title: 'Diependorst, 1701'
      },
      {
        key: 'britain',
        fixtureId: 'e861bd9af6573765',
        organization: organizations[1],
        title: 'England, Scotland and Ireland'
      },
      {
        key: 'europe-unmapped',
        fixtureId: 'f6033bee94f7763e',
        organization: organizations[1],
        title: 'Europe geology (awaiting georeferencing)'
      }
    ].map(async (resource) => {
      const baseUrl = `http://${resource.organization.domain}:${fixturePort}/cors`
      const uri = `${baseUrl}/iiif/3/level2/${resource.fixtureId}`
      const manifestUri = `${baseUrl}/manifests/3/3/level2/${resource.fixtureId}.json`
      const annotationUri = `${baseUrl}/annotations/images/3/level2/${resource.fixtureId}.json`
      const [imageData, manifestData] = await Promise.all([
        getIiifFixtureJson(`${uri}/info.json`),
        getIiifFixtureJson(manifestUri)
      ])
      const image = Image.parse(imageData)
      const manifest = Manifest.parse(manifestData)
      const canvas = manifest.canvases[0]
      if (!canvas || canvas.image.uri !== image.uri) {
        throw new Error(
          `Missing matching fixture canvas: ${resource.fixtureId}`
        )
      }
      return {
        ...resource,
        uri: image.uri,
        canvasUri: canvas.uri,
        imageData,
        canvas,
        manifestUri,
        manifestData,
        annotationUri,
        id: await generateId(image.uri),
        canvasId: await generateId(canvas.uri)
      }
    })
  )

  const manifests = await Promise.all(
    resources.map(async (resource) => ({
      id: await generateId(resource.manifestUri),
      uri: resource.manifestUri,
      organizationId: resource.organization.id,
      canvasId: resource.canvasId,
      data: resource.manifestData
    }))
  )

  const maps = await Promise.all(
    resources.slice(0, 3).map(async (resource, index) => {
      const [original] = parseAnnotation(
        await getIiifFixtureJson(resource.annotationUri)
      )
      if (!original || original.resource.id !== resource.uri) {
        throw new Error(`Missing matching fixture map: ${resource.fixtureId}`)
      }
      const stages = [original]
      if (index === 0) {
        stages.push(cropMap(original, 0.02), cropMap(original, 0.04))
      } else if (index === 2) {
        stages.push(cropMap(original, 0.03))
      }
      return {
        resource,
        stages,
        id: (await toDbMap3({ ...original, id: undefined })).id
      }
    })
  )

  const memberships = await Promise.all(
    [
      { user: users[0], organization: organizations[0], role: 'owner' },
      { user: users[1], organization: organizations[0], role: 'admin' },
      { user: users[2], organization: organizations[0], role: 'member' },
      { user: users[2], organization: organizations[1], role: 'owner' }
    ].map(async (membership) => ({
      ...membership,
      id: await seedId(
        'member',
        `${membership.organization.id}/${membership.user.id}`
      )
    }))
  )

  const lists = await Promise.all(
    [
      ...users.map((user) => ({
        key: `${user.slug}-starred`,
        user,
        name: 'Starred',
        deletable: false
      })),
      {
        key: 'amsterdam-research',
        user: users[1],
        name: 'Amsterdam research',
        deletable: true
      },
      {
        key: 'europe-survey',
        user: users[2],
        name: 'European survey',
        deletable: true
      }
    ].map(async (list) => ({ ...list, id: await seedId('list', list.key) }))
  )

  return {
    organizations,
    users,
    resources,
    manifests,
    maps,
    memberships,
    lists
  }
}

export type SeedFixtures = Awaited<ReturnType<typeof createSeedFixtures>>

export function createSeedCatalog(fixtures: SeedFixtures) {
  return {
    version: seedVersion,
    users: fixtures.users,
    organizations: fixtures.organizations,
    images: fixtures.resources.map(
      ({
        id,
        key,
        fixtureId,
        uri,
        title,
        canvasId,
        canvasUri,
        annotationUri
      }) => ({
        id,
        key,
        fixtureId,
        uri,
        title,
        canvasId,
        canvasUri,
        annotationUri
      })
    ),
    manifests: fixtures.manifests.map(({ id, uri, organizationId }) => ({
      id,
      uri,
      organizationId
    })),
    maps: fixtures.maps.map(({ id, resource, stages }) => ({
      id,
      imageId: resource.id,
      key: resource.key,
      initialVersions: stages.length
    })),
    lists: fixtures.lists.map(({ id, name, key, user }) => ({
      id,
      name,
      key,
      userId: user.id
    }))
  }
}

export type SeedCatalog = ReturnType<typeof createSeedCatalog>
