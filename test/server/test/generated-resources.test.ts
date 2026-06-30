import { parseAnnotation } from '@allmaps/annotation'
import { IIIF } from '@allmaps/iiif-parser'
import { describe, expect, test } from 'vitest'

import { createCatalog, handleFixtureRequest } from '../src/lib/server.ts'

type JsonObject = Record<string, unknown>

type InfoExpectation = 'valid' | 'missing-dimensions' | 'bad-tiles'
type ManifestExpectation = 'valid' | 'missing-image-service'

type Resource<T extends string> = {
  name: string
  href: string
  expectation: T
}

type AnnotationResource =
  | {
      name: string
      href: string
      data?: undefined
    }
  | {
      name: string
      href?: undefined
      data: unknown
    }

const baseUrl = 'http://localhost:5506/cors'
const catalog = createCatalog(new Request(`${baseUrl}/`), 'cors')
const combinedAnnotationHttpErrorStatuses = [401, 403, 404, 429, 500, 503]

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getFixturePath(href: string) {
  const url = new URL(href)
  const [, corsMode, ...pathSegments] = url.pathname.split('/')

  return {
    corsMode,
    path: pathSegments.join('/')
  }
}

async function getFixtureResponse(href: string) {
  const { corsMode, path } = getFixturePath(href)

  return handleFixtureRequest(new Request(href), corsMode, path)
}

async function getJsonResource(href: string) {
  const response = await getFixtureResponse(href)
  const text = await response.text()

  expect(response.status, href).toBe(200)

  return JSON.parse(text) as unknown
}

function getParseError(parse: () => unknown) {
  try {
    parse()
  } catch (error) {
    return error
  }
}

function getIssuePaths(error: unknown) {
  if (
    isJsonObject(error) &&
    Array.isArray(error.issues) &&
    error.issues.every(isJsonObject)
  ) {
    return error.issues.map((issue) =>
      Array.isArray(issue.path) ? issue.path.join('.') : ''
    )
  }

  return []
}

function getInfoResources(): Resource<InfoExpectation>[] {
  return catalog.images.flatMap((image) => [
    ...image.imageServices.map((link) => ({
      name: `${image.id} ${link.label} ${link.versionLabel} ${link.complianceLabel}`,
      href: `${link.href}/info.json`,
      expectation: 'valid' as const
    })),
    ...image.errors.imageServices
      .filter((link) => link.href.endsWith('/info.json'))
      .map((link) => ({
        name: `${image.id} ${link.label} ${link.versionLabel} ${link.complianceLabel}`,
        href: link.href,
        expectation: 'valid' as const
      })),
    ...image.errors.infoJsons.map((link) => ({
      name: `${image.id} ${link.label} ${link.versionLabel} ${link.complianceLabel}`,
      href: link.href,
      expectation: link.href.includes('/missing-dimensions/')
        ? ('missing-dimensions' as const)
        : ('bad-tiles' as const)
    }))
  ])
}

function getManifestResources(): Resource<ManifestExpectation>[] {
  return [
    ...catalog.combinedImages.manifests.map((link) => ({
      name: `combined ${link.label}`,
      href: link.href,
      expectation: 'valid' as const
    })),
    ...catalog.images.flatMap((image) => [
      ...image.manifestResources.map((link) => ({
        name: `${image.id} ${link.label} ${link.versionLabel} ${link.complianceLabel}`,
        href: link.href,
        expectation: 'valid' as const
      })),
      ...image.errors.manifests.map((link) => ({
        name: `${image.id} ${link.label} ${link.versionLabel} ${link.complianceLabel}`,
        href: link.href,
        expectation: link.href.includes('/manifests/2/')
          ? ('missing-image-service' as const)
          : ('valid' as const)
      }))
    ])
  ]
}

function getAnnotationRouteResources(): AnnotationResource[] {
  const links = [
    ...catalog.combinedImages.annotations,
    ...catalog.images.flatMap((image) => [
      ...image.annotations,
      ...image.errors.annotations
    ])
  ].filter((link) => !isCombinedAnnotationHttpErrorResource(link.href))

  return links.map((link) => ({
    name: link.label,
    href: link.href
  }))
}

function isCombinedAnnotationHttpErrorResource(href: string) {
  return combinedAnnotationHttpErrorStatuses.some((status) =>
    href.includes(`/annotations/combined/http-${status}.json`)
  )
}

function isSlowResource(href: string) {
  return href.includes('/slow-iiif3-level2')
}

function getAnnotationItems(annotation: unknown) {
  if (isJsonObject(annotation) && Array.isArray(annotation.items)) {
    return annotation.items
  }

  return [annotation]
}

function getAnnotationShape(annotation: unknown) {
  const items = getAnnotationItems(annotation)
  let hasMissingTarget = false
  let hasBadResourceSize = false
  let hasOneGcp = false

  for (const item of items) {
    if (!isJsonObject(item)) {
      continue
    }

    const target = item.target

    if (!isJsonObject(target)) {
      hasMissingTarget = true
      continue
    }

    if (isJsonObject(target.source)) {
      if (
        ('width' in target.source &&
          (typeof target.source.width !== 'number' ||
            target.source.width <= 0)) ||
        ('height' in target.source &&
          (typeof target.source.height !== 'number' ||
            target.source.height <= 0))
      ) {
        hasBadResourceSize = true
      }
    }

    if (
      isJsonObject(item.body) &&
      Array.isArray(item.body.features) &&
      item.body.features.length === 1
    ) {
      hasOneGcp = true
    }
  }

  return {
    hasMissingTarget,
    hasBadResourceSize,
    hasOneGcp
  }
}

function getFirstAnnotationImageServiceId(annotation: unknown) {
  const firstItem = getAnnotationItems(annotation)[0]

  if (!isJsonObject(firstItem) || !isJsonObject(firstItem.target)) {
    throw new Error('Annotation has no target')
  }

  const { source } = firstItem.target

  if (!isJsonObject(source) || typeof source.id !== 'string') {
    throw new Error('Annotation target has no image service id')
  }

  return source.id
}

function getAnnotationImageServiceIds(annotation: unknown) {
  return [
    ...new Set(
      getAnnotationItems(annotation).flatMap((item) => {
        if (!isJsonObject(item) || !isJsonObject(item.target)) {
          return []
        }

        const { source } = item.target

        return isJsonObject(source) && typeof source.id === 'string'
          ? [source.id]
          : []
      })
    )
  ]
}

function collectAnnotationPagesFromManifest(
  manifest: unknown,
  name: string
): AnnotationResource[] {
  if (!isJsonObject(manifest)) {
    return []
  }

  const resources: AnnotationResource[] = []

  function collectAnnotationPages(value: unknown, source: string) {
    if (!Array.isArray(value)) {
      return
    }

    for (const annotationPage of value) {
      if (!isJsonObject(annotationPage)) {
        continue
      }

      if (
        annotationPage.type === 'AnnotationPage' &&
        Array.isArray(annotationPage.items)
      ) {
        resources.push({
          name: source,
          data: annotationPage
        })
      } else if (
        annotationPage.type === 'AnnotationPage' &&
        typeof annotationPage.id === 'string'
      ) {
        resources.push({
          name: source,
          href: annotationPage.id
        })
      }
    }
  }

  collectAnnotationPages(manifest.annotations, `${name} manifest annotations`)

  if (Array.isArray(manifest.items)) {
    for (const [index, canvas] of manifest.items.entries()) {
      if (isJsonObject(canvas)) {
        collectAnnotationPages(
          canvas.annotations,
          `${name} canvas ${index + 1} annotations`
        )
      }
    }
  }

  return resources
}

async function getGeneratedAnnotationResources() {
  const resources = getAnnotationRouteResources()
  const seenHrefs = new Set(
    resources.flatMap((resource) => resource.href ?? [])
  )

  for (const resource of getManifestResources()) {
    if (isSlowResource(resource.href)) {
      continue
    }

    const manifest = await getJsonResource(resource.href)

    for (const annotationResource of collectAnnotationPagesFromManifest(
      manifest,
      resource.name
    )) {
      if (annotationResource.href) {
        if (isSlowResource(annotationResource.href)) {
          continue
        }

        if (seenHrefs.has(annotationResource.href)) {
          continue
        }

        seenHrefs.add(annotationResource.href)
      }

      resources.push(annotationResource)
    }
  }

  return resources
}

describe('generated IIIF info.json resources', () => {
  test.each(getInfoResources())('$name', async ({ href, expectation }) => {
    const data = await getJsonResource(href)
    const error = getParseError(() => IIIF.parse(data))

    if (expectation === 'valid') {
      expect(error).toBeUndefined()
    } else if (expectation === 'missing-dimensions') {
      expect(getIssuePaths(error)).toEqual(
        expect.arrayContaining(['width', 'height'])
      )
    } else {
      expect(getIssuePaths(error)).toEqual(
        expect.arrayContaining(['tiles.0.width', 'tiles.0.scaleFactors.0'])
      )
    }
  })
})

describe('generated IIIF manifests', () => {
  test.each(getManifestResources())(
    '$name',
    async ({ href, expectation }) => {
      const data = await getJsonResource(href)
      const error = getParseError(() => IIIF.parse(data))

      if (expectation === 'valid') {
        expect(error).toBeUndefined()
      } else {
        expect(getIssuePaths(error)).toContain(
          'sequences.0.canvases.0.images.0.resource.service'
        )
      }
    },
    20_000
  )
})

describe('generated georeference annotations', () => {
  test.each(combinedAnnotationHttpErrorStatuses)(
    'combined annotation page returns HTTP %s',
    async (status) => {
      const response = await getFixtureResponse(
        `${baseUrl}/annotations/combined/http-${status}.json`
      )

      expect(response.status).toBe(status)
    }
  )

  test('service failure variant returns valid annotation page and failing image service resources', async () => {
    const annotation = await getJsonResource(
      `${baseUrl}/annotations/combined/service-500-iiif3-level2.json`
    )
    const serviceId = getFirstAnnotationImageServiceId(annotation)
    const infoResponse = await getFixtureResponse(`${serviceId}/info.json`)
    const imageResponse = await getFixtureResponse(
      `${serviceId}/full/256,/0/default.jpg`
    )

    expect(() => parseAnnotation(annotation)).not.toThrow()
    expect(infoResponse.status).toBe(500)
    expect(imageResponse.status).toBe(500)
  })

  test('mixed image request failure variant contains working and failing image requests', async () => {
    const annotation = await getJsonResource(
      `${baseUrl}/annotations/combined/mixed-image-500-iiif3-level2.json`
    )
    const serviceIds = getAnnotationImageServiceIds(annotation)
    const workingServiceId = serviceIds.find(
      (serviceId) => !serviceId.includes('/image-500')
    )
    const failingServiceId = serviceIds.find((serviceId) =>
      serviceId.includes('/image-500')
    )

    expect(workingServiceId).toBeDefined()
    expect(failingServiceId).toBeDefined()
    expect(
      (await getFixtureResponse(`${workingServiceId}/info.json`)).status
    ).toBe(200)
    expect(
      (await getFixtureResponse(`${workingServiceId}/full/64,/0/default.jpg`))
        .status
    ).toBe(200)
    expect(
      (await getFixtureResponse(`${failingServiceId}/info.json`)).status
    ).toBe(200)
    expect(
      (await getFixtureResponse(`${failingServiceId}/full/64,/0/default.jpg`))
        .status
    ).toBe(500)
  })

  test('mixed image service failure variant contains working and failing image services', async () => {
    const annotation = await getJsonResource(
      `${baseUrl}/annotations/combined/mixed-service-500-iiif3-level2.json`
    )
    const serviceIds = getAnnotationImageServiceIds(annotation)
    const workingServiceId = serviceIds.find(
      (serviceId) => !serviceId.includes('/service-500')
    )
    const failingServiceId = serviceIds.find((serviceId) =>
      serviceId.includes('/service-500')
    )

    expect(workingServiceId).toBeDefined()
    expect(failingServiceId).toBeDefined()
    expect(
      (await getFixtureResponse(`${workingServiceId}/info.json`)).status
    ).toBe(200)
    expect(
      (await getFixtureResponse(`${workingServiceId}/full/64,/0/default.jpg`))
        .status
    ).toBe(200)
    expect(
      (await getFixtureResponse(`${failingServiceId}/info.json`)).status
    ).toBe(500)
    expect(
      (await getFixtureResponse(`${failingServiceId}/full/64,/0/default.jpg`))
        .status
    ).toBe(500)
  })

  test('parse or fail with expected annotation errors', async () => {
    const resources = await getGeneratedAnnotationResources()

    expect(resources.length).toBeGreaterThan(0)

    for (const resource of resources) {
      const data = resource.href
        ? await getJsonResource(resource.href)
        : resource.data
      const shape = getAnnotationShape(data)
      const error = getParseError(() => parseAnnotation(data))

      if (shape.hasMissingTarget) {
        expect(
          getIssuePaths(error).some((path) => path.endsWith('.target')),
          `${resource.name} should fail on missing target`
        ).toBe(true)
      } else if (shape.hasBadResourceSize) {
        expect(
          getIssuePaths(error).some((path) => path.endsWith('.target.source')),
          `${resource.name} should fail on invalid resource size`
        ).toBe(true)
      } else {
        expect(error, resource.name).toBeUndefined()

        const maps = parseAnnotation(data)

        if (shape.hasOneGcp) {
          expect(
            maps.some((map) => map.gcps.length === 1),
            `${resource.name} should include a one-GCP map`
          ).toBe(true)
        } else {
          expect(
            maps.every((map) => map.gcps.length > 1),
            `${resource.name} should include georeferenceable maps`
          ).toBe(true)
        }
      }
    }
  }, 20_000)
})
