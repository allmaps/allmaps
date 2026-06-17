import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

import { parseAnnotation } from '@allmaps/annotation'
import { IIIF, Manifest } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import sharp from 'sharp'

import {
  loadImageDefinitions,
  type ImageFixtureDefinition
} from './fixtures.ts'
import {
  getBaseUrl,
  getImageServiceId,
  cloneJsonObject,
  localizeFixtureUrls,
  parseCorsMode,
  parseImageComplianceLevel,
  parseIiifVersion,
  parseJsonFilename,
  parsePath,
  parseVariantJsonFilename
} from './paths.ts'
import {
  imageResponse,
  jsonResponse,
  redirectResponse,
  textResponse,
  withCors
} from './responses.ts'
import type {
  Bbox,
  CorsMode,
  IiifVersion,
  ImageComplianceLevel,
  JsonObject,
  Point,
  Region,
  Ring,
  Size
} from './types.ts'

type ImageFixture = ImageFixtureDefinition
type Link = {
  label: string
  href: string
  version?: IiifVersion
  versionLabel?: string
  complianceLevel?: ImageComplianceLevel
  complianceLabel?: string
  group?: string
}

type ImageApiService = {
  version: IiifVersion
  complianceLevel: ImageComplianceLevel
}

type ImageServiceBehavior = 'image-500' | 'slow'

type ImageApiServiceReference = ImageApiService & {
  behavior?: ImageServiceBehavior
}

const navPlaceContext = 'http://iiif.io/api/extension/navplace/context.json'
const presentation3Context = 'http://iiif.io/api/presentation/3/context.json'

const imageDefinitions = loadImageDefinitions()
const slowResourceDelayMs = 4_000

const images = new Map(imageDefinitions.map((image) => [image.id, image]))
const originalManifests = new Map(
  imageDefinitions.flatMap((image) => {
    if (!image.originalManifestPath) {
      return []
    }

    const originalManifest = JSON.parse(
      readFileSync(image.originalManifestPath, 'utf8')
    )
    const parsedManifest = IIIF.parse(originalManifest, {
      keepSource: true
    })

    if (!(parsedManifest instanceof Manifest)) {
      throw new Error(`${image.originalManifestPath} is not a IIIF manifest`)
    }

    return [
      [
        image.id,
        {
          parsedManifest,
          source: originalManifest
        }
      ] as const
    ]
  })
)

const catalogImageComplianceLevels = ['level0', 'level2'] as const
const catalogImageApiServices = (['2', '3'] as const).flatMap((version) =>
  catalogImageComplianceLevels.map((complianceLevel) => ({
    version,
    complianceLevel
  }))
)

function getImageApiVersionLabel(version: IiifVersion) {
  return version === '2' ? '2.1' : '3.0'
}

function getImageApiLabel(version: IiifVersion) {
  return `IIIF Image API ${getImageApiVersionLabel(version)}`
}

function createImageApiLink(
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  label: string,
  href: string
) {
  return {
    label,
    href,
    version,
    versionLabel: getImageApiLabel(version),
    complianceLevel,
    complianceLabel: complianceLevel
  }
}

function isImageComplianceLevel(value: string): value is ImageComplianceLevel {
  return value === 'level0' || value === 'level1' || value === 'level2'
}

function getIiif2Profile(complianceLevel: ImageComplianceLevel) {
  return `http://iiif.io/api/image/2/${complianceLevel}.json`
}

function getImageServiceProfile(
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel
) {
  return version === '2' ? getIiif2Profile(complianceLevel) : complianceLevel
}

function getImageServiceType(version: IiifVersion) {
  return version === '2' ? 'ImageService2' : 'ImageService3'
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getImage(imageId: string) {
  const image = images.get(imageId)

  if (!image) {
    throw new Error(`Unknown image fixture: ${imageId}`)
  }

  return image
}

function getOriginalManifest(image: ImageFixture) {
  return originalManifests.get(image.id)
}

function getGeoreferencedMap(image: ImageFixture) {
  const annotation = JSON.parse(readFileSync(image.annotationPath, 'utf8'))
  const maps = parseAnnotation(annotation)
  const map = maps[0]

  if (!map) {
    throw new Error(`No georeferenced map found for ${image.id}`)
  }

  return map
}

function hasMultipleMapAnnotations(image: ImageFixture) {
  const annotation = JSON.parse(readFileSync(image.annotationPath, 'utf8'))

  return Array.isArray(annotation.items) && annotation.items.length > 1
}

function getFirstCanvas(sourceManifest: JsonObject) {
  return cloneJsonObject(sourceManifest.sequences?.[0]?.canvases?.[0])
}

function getFirstImageAnnotation(sourceManifest: JsonObject) {
  return cloneJsonObject(
    sourceManifest.sequences?.[0]?.canvases?.[0]?.images?.[0]
  )
}

function getFirstImageResource(sourceManifest: JsonObject) {
  return cloneJsonObject(
    sourceManifest.sequences?.[0]?.canvases?.[0]?.images?.[0]?.resource
  )
}

function computeBbox(points: Ring): Bbox {
  return [
    Math.min(...points.map((point) => point[0])),
    Math.min(...points.map((point) => point[1])),
    Math.max(...points.map((point) => point[0])),
    Math.max(...points.map((point) => point[1]))
  ]
}

function bboxToCenter(bbox: Bbox): Point {
  return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
}

function bboxToRing(bbox: Bbox): Ring {
  return [
    [bbox[0], bbox[1]],
    [bbox[2], bbox[1]],
    [bbox[2], bbox[3]],
    [bbox[0], bbox[3]],
    [bbox[0], bbox[1]]
  ]
}

function getGeoMask(image: ImageFixture): Ring {
  const georeferencedMap = getGeoreferencedMap(image)
  const transformer = GcpTransformer.fromGeoreferencedMap(georeferencedMap)
  const resourceMask = georeferencedMap.resourceMask as unknown as Ring

  return transformer.transformToGeo([resourceMask])[0] as unknown as Ring
}

function createGeoJsonFeatureCollection(
  manifestId: string,
  geometry:
    | {
        type: 'Point'
        coordinates: Point
      }
    | {
        type: 'Polygon'
        coordinates: Ring[]
      },
  label: string
) {
  return {
    id: `${manifestId}/navplace`,
    type: 'FeatureCollection',
    features: [
      {
        id: `${manifestId}/navplace/feature/1`,
        type: 'Feature',
        properties: {
          label: {
            none: [label]
          }
        },
        geometry
      }
    ]
  }
}

function addNavPlaceContext(manifest: JsonObject) {
  const context = manifest['@context']

  return {
    ...manifest,
    '@context': Array.isArray(context)
      ? [navPlaceContext, ...context.filter((item) => item !== navPlaceContext)]
      : [navPlaceContext, context ?? presentation3Context]
  }
}

function createNavPlace(
  manifestId: string,
  image: ImageFixture,
  variant: string
) {
  const geoMask = getGeoMask(image)
  const geoMaskBbox = computeBbox(geoMask)

  if (variant === 'navplace-midpoint') {
    return createGeoJsonFeatureCollection(
      manifestId,
      {
        type: 'Point',
        coordinates: bboxToCenter(geoMaskBbox)
      },
      `${image.label} midpoint`
    )
  }

  if (variant === 'navplace-bbox') {
    return createGeoJsonFeatureCollection(
      manifestId,
      {
        type: 'Polygon',
        coordinates: [bboxToRing(geoMaskBbox)]
      },
      `${image.label} bounding box`
    )
  }

  throw new Error(`Unknown navPlace variant: ${variant}`)
}

function createEmbeddedAnnotation(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  manifestId: string,
  manifestLabel: JsonObject,
  canvasId: string,
  errorVariant?: string
) {
  const sourceAnnotation = JSON.parse(
    readFileSync(image.annotationPath, 'utf8')
  )
  const baseUrl = getBaseUrl(request, corsMode)
  const annotation = cloneJsonObject(
    localizeFixtureUrls(sourceAnnotation, baseUrl)
  )

  return {
    ...annotation,
    items: Array.isArray(annotation.items)
      ? annotation.items.map((item, index) => {
          const errorVariantForMap =
            errorVariant === 'mixed-errors'
              ? index % 2 === 0
                ? undefined
                : getCombinedAnnotationErrorVariant(index)
              : errorVariant
          const mapAnnotation = errorVariantForMap
            ? createBrokenAnnotationMap(
                cloneJsonObject(item),
                image,
                errorVariantForMap
              )
            : cloneJsonObject(item)

          if (errorVariantForMap === 'missing-target') {
            return mapAnnotation
          }

          const target = cloneJsonObject(mapAnnotation.target)

          mapAnnotation.target = {
            type: 'SpecificResource',
            source: {
              id: canvasId,
              type: 'Canvas',
              partOf: {
                id: manifestId,
                type: 'Manifest',
                label: manifestLabel
              }
            },
            ...(target.selector ? { selector: target.selector } : {})
          }

          return mapAnnotation
        })
      : []
  }
}

function getEmbeddedAnnotationErrorVariant(variant: string) {
  if (variant === 'embedded-annotation-missing-target') {
    return 'missing-target'
  }

  if (variant === 'embedded-annotation-one-gcp') {
    return 'one-gcp'
  }

  if (variant === 'embedded-annotation-mixed-errors') {
    return 'mixed-errors'
  }

  return undefined
}

function getLinkedAnnotationErrorVariant(variant: string) {
  if (variant === 'linked-annotation-missing-target') {
    return 'missing-target'
  }

  if (variant === 'linked-annotation-one-gcp') {
    return 'one-gcp'
  }

  if (variant === 'linked-annotation-mixed-errors') {
    return 'mixed-errors'
  }

  return undefined
}

function isEmbeddedAnnotationVariant(variant: string) {
  return (
    variant === 'embedded-annotation' ||
    getEmbeddedAnnotationErrorVariant(variant) !== undefined
  )
}

function isLinkedAnnotationVariant(variant: string) {
  return (
    variant === 'linked-annotation' ||
    getLinkedAnnotationErrorVariant(variant) !== undefined
  )
}

function isIiif3ManifestVariant(variant: string) {
  return (
    variant === 'default' ||
    variant === 'bad-service-type' ||
    isEmbeddedAnnotationVariant(variant) ||
    isLinkedAnnotationVariant(variant) ||
    variant === 'navplace-midpoint' ||
    variant === 'navplace-bbox'
  )
}

function getCombinedImages() {
  return [...images.values()]
}

function createCombinedImageServiceLink(
  label: string,
  href: string,
  versionLabel: string,
  complianceLabel: string
) {
  return {
    label,
    href,
    group: 'image-services',
    versionLabel,
    complianceLabel
  }
}

function getImageApiServiceVariant({
  version,
  complianceLevel
}: ImageApiService) {
  return `iiif${version}-${complianceLevel}`
}

function getCombinedImageServiceManifestVariant(
  service: ImageApiService,
  annotationMode: 'embedded' | 'linked'
) {
  return `image-services-${getImageApiServiceVariant(service)}-${annotationMode}-annotations`
}

function parseImageApiServiceVariant(
  variant: string
): ImageApiService | undefined {
  const match = variant.match(/^iiif([23])-(level[012])$/)

  if (!match) {
    return undefined
  }

  return {
    version: match[1] as IiifVersion,
    complianceLevel: match[2] as ImageComplianceLevel
  }
}

function parseCombinedImageServiceManifestVariant(variant: string):
  | (ImageApiService & {
      annotationMode: 'embedded' | 'linked'
    })
  | undefined {
  const match = variant.match(
    /^image-services-iiif([23])-(level[012])-(embedded|linked)-annotations$/
  )

  if (!match) {
    return undefined
  }

  return {
    version: match[1] as IiifVersion,
    complianceLevel: match[2] as ImageComplianceLevel,
    annotationMode: match[3] as 'embedded' | 'linked'
  }
}

function parseImageServiceBehavior(
  behavior: string | undefined
): ImageServiceBehavior | undefined {
  if (!behavior) {
    return undefined
  }

  if (behavior === 'image-500' || behavior === 'slow') {
    return behavior
  }

  throw new Error(`Unknown image service behavior: ${behavior}`)
}

function getCombinedImageServiceBehavior(
  variant: string
): ImageServiceBehavior | undefined {
  if (variant === 'image-500-iiif3-level2') {
    return 'image-500'
  }

  if (variant === 'slow-iiif3-level2') {
    return 'slow'
  }

  return undefined
}

function isSlowCombinedVariant(variant: string) {
  return getCombinedImageServiceBehavior(variant) === 'slow'
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function delaySlowResource(variantOrBehavior: string | undefined) {
  if (variantOrBehavior === 'slow') {
    await delay(slowResourceDelayMs)
  }
}

function getCombinedAnnotationVariants(baseUrl: string) {
  return [
    ...catalogImageApiServices.map((service) =>
      createImageApiLink(
        service.version,
        service.complianceLevel,
        'All annotations',
        `${baseUrl}/annotations/combined/${getImageApiServiceVariant(service)}.json`
      )
    ),
    createImageApiLink(
      '3',
      'level2',
      'All annotations, mixed image CORS modes',
      `${baseUrl}/annotations/combined/mixed-cors-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Mixed correct and incorrect annotations',
      `${baseUrl}/annotations/combined/mixed-errors-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Mixed CORS modes, correct and incorrect annotations',
      `${baseUrl}/annotations/combined/mixed-cors-errors-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'All info.jsons load, image requests return 500',
      `${baseUrl}/annotations/combined/image-500-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Slow annotation page and image services',
      `${baseUrl}/annotations/combined/slow-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Some slow, some fast images',
      `${baseUrl}/annotations/combined/mixed-slow-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'All annotations, mixed partOf hierarchy',
      `${baseUrl}/annotations/combined/mixed-partof-hierarchy-iiif3-level2.json`
    ),
    createCombinedImageServiceLink(
      'Annotation page',
      `${baseUrl}/annotations/combined/mixed-iiif2-level0-level2.json`,
      'IIIF Image API 2.1',
      'level0 + level2'
    ),
    createCombinedImageServiceLink(
      'Annotation page',
      `${baseUrl}/annotations/combined/mixed-iiif3-level0-level2.json`,
      'IIIF Image API 3.0',
      'level0 + level2'
    ),
    createCombinedImageServiceLink(
      'Annotation page',
      `${baseUrl}/annotations/combined/mixed-iiif2-level0-iiif3-level2.json`,
      'IIIF Image API 2.1 + 3.0',
      '2.1 level0 + 3.0 level2'
    ),
    createCombinedImageServiceLink(
      'Annotation page',
      `${baseUrl}/annotations/combined/mixed-iiif2-level2-iiif3-level0.json`,
      'IIIF Image API 2.1 + 3.0',
      '2.1 level2 + 3.0 level0'
    )
  ]
}

function getCombinedManifestVariants(baseUrl: string) {
  return [
    ...catalogImageApiServices.flatMap((service) => [
      createImageApiLink(
        service.version,
        service.complianceLevel,
        'All embedded annotations',
        `${baseUrl}/manifests/3/combined/${getCombinedImageServiceManifestVariant(service, 'embedded')}.json`
      ),
      createImageApiLink(
        service.version,
        service.complianceLevel,
        'All linked annotations',
        `${baseUrl}/manifests/3/combined/${getCombinedImageServiceManifestVariant(service, 'linked')}.json`
      )
    ]),
    createImageApiLink(
      '3',
      'level2',
      'Some embedded, some linked annotations',
      `${baseUrl}/manifests/3/combined/partial-embedded-annotations.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Some linked annotations',
      `${baseUrl}/manifests/3/combined/partial-linked-annotations.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Manifest-level annotation page',
      `${baseUrl}/manifests/3/combined/manifest-embedded-annotations.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Some manifest-level, some canvas-level annotations',
      `${baseUrl}/manifests/3/combined/partial-manifest-embedded-annotations.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Mixed correct/incorrect embedded annotations',
      `${baseUrl}/manifests/3/combined/mixed-embedded-annotation-errors.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Mixed correct/incorrect linked annotations',
      `${baseUrl}/manifests/3/combined/mixed-linked-annotation-errors.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Image requests return 500',
      `${baseUrl}/manifests/3/combined/image-500-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Slow manifest and resources',
      `${baseUrl}/manifests/3/combined/slow-iiif3-level2.json`
    ),
    createCombinedImageServiceLink(
      'IIIF Presentation 3.0 manifest',
      `${baseUrl}/manifests/3/combined/image-services-iiif2-level0-level2.json`,
      'IIIF Image API 2.1',
      'level0 + level2'
    ),
    createCombinedImageServiceLink(
      'IIIF Presentation 3.0 manifest',
      `${baseUrl}/manifests/3/combined/image-services-iiif3-level0-level2.json`,
      'IIIF Image API 3.0',
      'level0 + level2'
    ),
    createCombinedImageServiceLink(
      'IIIF Presentation 3.0 manifest',
      `${baseUrl}/manifests/3/combined/image-services-iiif2-level0-iiif3-level2.json`,
      'IIIF Image API 2.1 + 3.0',
      '2.1 level0 + 3.0 level2'
    ),
    createCombinedImageServiceLink(
      'IIIF Presentation 3.0 manifest',
      `${baseUrl}/manifests/3/combined/image-services-iiif2-level2-iiif3-level0.json`,
      'IIIF Image API 2.1 + 3.0',
      '2.1 level2 + 3.0 level0'
    )
  ]
}

function isCombinedIiif3ManifestVariant(variant: string) {
  return (
    parseCombinedImageServiceManifestVariant(variant) !== undefined ||
    [
      'embedded-annotations',
      'linked-annotations',
      'manifest-embedded-annotations',
      'partial-manifest-embedded-annotations',
      'partial-embedded-annotations',
      'partial-linked-annotations',
      'mixed-embedded-annotation-errors',
      'mixed-linked-annotation-errors',
      'image-500-iiif3-level2',
      'slow-iiif3-level2',
      'image-services-iiif2-level0-level1',
      'image-services-iiif3-level0-level1',
      'image-services-iiif2-level0-iiif3-level1',
      'image-services-iiif2-level1-iiif3-level0',
      'image-services-iiif2-level0-level2',
      'image-services-iiif3-level0-level2',
      'image-services-iiif2-level0-iiif3-level2',
      'image-services-iiif2-level2-iiif3-level0'
    ].includes(variant)
  )
}

function getCombinedManifestLabel(variant: string) {
  const imageServiceVariant = parseCombinedImageServiceManifestVariant(variant)

  if (imageServiceVariant) {
    return `Combined fixture images with IIIF ${getImageApiVersionLabel(
      imageServiceVariant.version
    )} ${imageServiceVariant.complianceLevel} images and ${
      imageServiceVariant.annotationMode
    } annotations`
  }

  if (variant === 'linked-annotations') {
    return 'Combined fixture images with linked annotations'
  }

  if (variant === 'manifest-embedded-annotations') {
    return 'Combined fixture images with annotations on the manifest'
  }

  if (variant === 'partial-manifest-embedded-annotations') {
    return 'Combined fixture images with annotations on the manifest and on canvases'
  }

  if (variant === 'partial-embedded-annotations') {
    return 'Combined fixture images with some embedded and some linked annotations'
  }

  if (variant === 'partial-linked-annotations') {
    return 'Combined fixture images with some linked annotations'
  }

  if (variant === 'mixed-embedded-annotation-errors') {
    return 'Combined fixture images with mixed correct/incorrect embedded annotations'
  }

  if (variant === 'mixed-linked-annotation-errors') {
    return 'Combined fixture images with mixed correct/incorrect linked annotations'
  }

  if (variant === 'image-500-iiif3-level2') {
    return 'Combined fixture images whose info.json files load but image requests return 500'
  }

  if (variant === 'slow-iiif3-level2') {
    return 'Combined fixture images whose resources load slowly'
  }

  if (variant === 'image-services-iiif2-level0-level1') {
    return 'Combined fixture images with IIIF 2.1 level 0 and level 1 images'
  }

  if (variant === 'image-services-iiif2-level0-level2') {
    return 'Combined fixture images with IIIF 2.1 level 0 and level 2 images'
  }

  if (variant === 'image-services-iiif3-level0-level1') {
    return 'Combined fixture images with IIIF 3.0 level 0 and level 1 images'
  }

  if (variant === 'image-services-iiif3-level0-level2') {
    return 'Combined fixture images with IIIF 3.0 level 0 and level 2 images'
  }

  if (variant === 'image-services-iiif2-level0-iiif3-level1') {
    return 'Combined fixture images with IIIF 2.1 level 0 and IIIF 3.0 level 1 images'
  }

  if (variant === 'image-services-iiif2-level0-iiif3-level2') {
    return 'Combined fixture images with IIIF 2.1 level 0 and IIIF 3.0 level 2 images'
  }

  if (variant === 'image-services-iiif2-level1-iiif3-level0') {
    return 'Combined fixture images with IIIF 2.1 level 1 and IIIF 3.0 level 0 images'
  }

  if (variant === 'image-services-iiif2-level2-iiif3-level0') {
    return 'Combined fixture images with IIIF 2.1 level 2 and IIIF 3.0 level 0 images'
  }

  return 'Combined fixture images with embedded annotations'
}

function getCombinedCanvasManifestVariant(variant: string, index: number) {
  const imageServiceVariant = parseCombinedImageServiceManifestVariant(variant)

  if (imageServiceVariant) {
    return imageServiceVariant.annotationMode === 'linked'
      ? 'linked-annotation'
      : 'embedded-annotation'
  }

  if (variant === 'linked-annotations') {
    return 'linked-annotation'
  }

  if (variant === 'manifest-embedded-annotations') {
    return 'default'
  }

  if (variant === 'partial-manifest-embedded-annotations') {
    return index % 2 === 0 ? 'default' : 'embedded-annotation'
  }

  if (variant === 'image-500-iiif3-level2' || variant === 'slow-iiif3-level2') {
    return 'linked-annotation'
  }

  if (variant === 'partial-embedded-annotations') {
    return index % 2 === 0 ? 'embedded-annotation' : 'linked-annotation'
  }

  if (variant === 'partial-linked-annotations') {
    return index % 2 === 0 ? 'linked-annotation' : 'default'
  }

  if (variant === 'mixed-embedded-annotation-errors') {
    return index % 2 === 0
      ? 'embedded-annotation'
      : index % 4 === 1
        ? 'embedded-annotation-one-gcp'
        : 'embedded-annotation-missing-target'
  }

  if (variant === 'mixed-linked-annotation-errors') {
    return index % 2 === 0
      ? 'linked-annotation'
      : index % 4 === 1
        ? 'linked-annotation-one-gcp'
        : 'linked-annotation-missing-target'
  }

  return 'embedded-annotation'
}

function getCombinedCanvasImageService(
  variant: string,
  index: number
): { version: IiifVersion; complianceLevel: ImageComplianceLevel } {
  const imageServiceVariant = parseCombinedImageServiceManifestVariant(variant)

  if (imageServiceVariant) {
    return {
      version: imageServiceVariant.version,
      complianceLevel: imageServiceVariant.complianceLevel
    }
  }

  if (variant === 'image-services-iiif2-level0-level1') {
    return {
      version: '2',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level1'
    }
  }

  if (variant === 'image-services-iiif2-level0-level2') {
    return {
      version: '2',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level2'
    }
  }

  if (variant === 'image-services-iiif3-level0-level1') {
    return {
      version: '3',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level1'
    }
  }

  if (variant === 'image-services-iiif3-level0-level2') {
    return {
      version: '3',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level2'
    }
  }

  if (variant === 'image-services-iiif2-level0-iiif3-level1') {
    return index % 2 === 0
      ? { version: '2', complianceLevel: 'level0' }
      : { version: '3', complianceLevel: 'level1' }
  }

  if (variant === 'image-services-iiif2-level0-iiif3-level2') {
    return index % 2 === 0
      ? { version: '2', complianceLevel: 'level0' }
      : { version: '3', complianceLevel: 'level2' }
  }

  if (variant === 'image-services-iiif2-level1-iiif3-level0') {
    return index % 2 === 0
      ? { version: '2', complianceLevel: 'level1' }
      : { version: '3', complianceLevel: 'level0' }
  }

  if (variant === 'image-services-iiif2-level2-iiif3-level0') {
    return index % 2 === 0
      ? { version: '2', complianceLevel: 'level2' }
      : { version: '3', complianceLevel: 'level0' }
  }

  return {
    version: '3',
    complianceLevel: 'level2'
  }
}

function getCombinedTargetCorsMode(
  responseCorsMode: CorsMode,
  variant: string,
  index: number
): CorsMode {
  if (
    variant === 'mixed-cors' ||
    variant === 'mixed-cors-errors' ||
    variant === 'mixed-cors-iiif3-level2' ||
    variant === 'mixed-cors-errors-iiif3-level2'
  ) {
    return index % 2 === 0 ? 'cors' : 'no-cors'
  }

  return responseCorsMode
}

function getCombinedAnnotationImageService(
  variant: string,
  index: number
): ImageApiServiceReference | undefined {
  const imageServiceVariant = parseImageApiServiceVariant(variant)

  if (imageServiceVariant) {
    return imageServiceVariant
  }

  if (variant === 'mixed-iiif2-level0-level1') {
    return {
      version: '2',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level1'
    }
  }

  if (variant === 'mixed-iiif2-level0-level2') {
    return {
      version: '2',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level2'
    }
  }

  if (variant === 'mixed-iiif3-level0-level1') {
    return {
      version: '3',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level1'
    }
  }

  if (variant === 'mixed-iiif3-level0-level2') {
    return {
      version: '3',
      complianceLevel: index % 2 === 0 ? 'level0' : 'level2'
    }
  }

  if (variant === 'mixed-iiif2-level0-iiif3-level1') {
    return index % 2 === 0
      ? { version: '2' as const, complianceLevel: 'level0' as const }
      : { version: '3' as const, complianceLevel: 'level1' as const }
  }

  if (variant === 'mixed-iiif2-level0-iiif3-level2') {
    return index % 2 === 0
      ? { version: '2' as const, complianceLevel: 'level0' as const }
      : { version: '3' as const, complianceLevel: 'level2' as const }
  }

  if (variant === 'mixed-iiif2-level1-iiif3-level0') {
    return index % 2 === 0
      ? { version: '2' as const, complianceLevel: 'level1' as const }
      : { version: '3' as const, complianceLevel: 'level0' as const }
  }

  if (variant === 'mixed-iiif2-level2-iiif3-level0') {
    return index % 2 === 0
      ? { version: '2' as const, complianceLevel: 'level2' as const }
      : { version: '3' as const, complianceLevel: 'level0' as const }
  }

  if (
    variant === 'mixed-cors-iiif3-level2' ||
    variant === 'mixed-errors-iiif3-level2' ||
    variant === 'mixed-cors-errors-iiif3-level2' ||
    variant === 'mixed-partof-hierarchy-iiif3-level2' ||
    variant === 'image-500-iiif3-level2' ||
    variant === 'slow-iiif3-level2'
  ) {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: getCombinedImageServiceBehavior(variant)
    }
  }

  if (variant === 'mixed-slow-iiif3-level2') {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: index % 2 === 0 ? undefined : 'slow'
    }
  }

  return undefined
}

function applyAnnotationImageService(
  annotationPage: JsonObject,
  baseUrl: string,
  image: ImageFixture,
  service: ImageApiServiceReference | undefined
) {
  if (!service || !Array.isArray(annotationPage.items)) {
    return annotationPage
  }

  for (const item of annotationPage.items) {
    if (!isJsonObject(item.target) || !isJsonObject(item.target.source)) {
      continue
    }

    item.target.source.id = getImageServiceBaseUrl(
      baseUrl,
      service.version,
      service.complianceLevel,
      image.id,
      service.behavior
    )
    item.target.source.type = getImageServiceType(service.version)
  }

  return annotationPage
}

function getImageAnnotationId(
  baseUrl: string,
  image: ImageFixture,
  service?: ImageApiService
) {
  if (!service) {
    return `${baseUrl}/annotations/images/${image.id}.json`
  }

  return `${baseUrl}/annotations/images/${service.version}/${service.complianceLevel}/${image.id}.json`
}

function createImageAnnotation(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  service?: ImageApiService
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const annotation = cloneJsonObject(
    localizeFixtureUrls(
      JSON.parse(readFileSync(image.annotationPath, 'utf8')),
      baseUrl
    )
  )

  applyAnnotationImageService(annotation, baseUrl, image, service)

  return {
    ...annotation,
    id: getImageAnnotationId(baseUrl, image, service)
  }
}

function getCombinedAnnotationErrorVariant(index: number) {
  return ['one-gcp', 'bad-resource-size', 'missing-target'][index % 3] as string
}

function shouldBreakCombinedAnnotation(variant: string, index: number) {
  return (
    (variant === 'mixed-errors' ||
      variant === 'mixed-cors-errors' ||
      variant === 'mixed-errors-iiif3-level2' ||
      variant === 'mixed-cors-errors-iiif3-level2') &&
    index % 2 === 1
  )
}

function removeManifestPartOf(resource: JsonObject) {
  if (!Array.isArray(resource.partOf)) {
    return
  }

  const partOf = resource.partOf
    .filter(
      (parent) =>
        typeof parent !== 'object' ||
        parent === null ||
        parent.type !== 'Manifest'
    )
    .map((parent) => {
      if (typeof parent !== 'object' || parent === null) {
        return parent
      }

      const parentResource = cloneJsonObject(parent)
      removeManifestPartOf(parentResource)

      return parentResource
    })

  if (partOf.length > 0) {
    resource.partOf = partOf
  } else {
    delete resource.partOf
  }
}

function removeCanvasPartOf(resource: JsonObject) {
  if (!Array.isArray(resource.partOf)) {
    return
  }

  const partOf = resource.partOf.filter(
    (parent) =>
      typeof parent !== 'object' || parent === null || parent.type !== 'Canvas'
  )

  if (partOf.length > 0) {
    resource.partOf = partOf
  } else {
    delete resource.partOf
  }
}

function applyMixedPartOfHierarchy(map: JsonObject, index: number) {
  if (index % 3 === 0) {
    return map
  }

  const target = map.target

  if (
    typeof target !== 'object' ||
    target === null ||
    typeof target.source !== 'object' ||
    target.source === null
  ) {
    return map
  }

  const outputMap = cloneJsonObject(map)
  const source = outputMap.target.source

  if (index % 3 === 1) {
    removeManifestPartOf(source)
  } else {
    removeCanvasPartOf(source)
  }

  return outputMap
}

function createCombinedAnnotation(
  request: Request,
  corsMode: CorsMode,
  variant: string,
  includeImage: (image: ImageFixture, index: number) => boolean = () => true
) {
  if (
    parseImageApiServiceVariant(variant) === undefined &&
    ![
      'all-correct',
      'mixed-cors',
      'mixed-errors',
      'mixed-cors-errors',
      'mixed-cors-iiif3-level2',
      'mixed-errors-iiif3-level2',
      'mixed-cors-errors-iiif3-level2',
      'image-500-iiif3-level2',
      'slow-iiif3-level2',
      'mixed-slow-iiif3-level2',
      'mixed-partof-hierarchy-iiif3-level2',
      'mixed-iiif2-level0-level1',
      'mixed-iiif3-level0-level1',
      'mixed-iiif2-level0-iiif3-level1',
      'mixed-iiif2-level1-iiif3-level0',
      'mixed-iiif2-level0-level2',
      'mixed-iiif3-level0-level2',
      'mixed-iiif2-level0-iiif3-level2',
      'mixed-iiif2-level2-iiif3-level0'
    ].includes(variant)
  ) {
    throw new Error(`Unknown combined annotation variant: ${variant}`)
  }

  const url = new URL(request.url)
  const baseUrl = getBaseUrl(request, corsMode)
  let annotationIndex = 0

  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id: `${baseUrl}/annotations/combined/${variant}.json`,
    type: 'AnnotationPage',
    items: getCombinedImages().flatMap((image, index) => {
      if (!includeImage(image, index)) {
        return []
      }

      const targetCorsMode = getCombinedTargetCorsMode(corsMode, variant, index)
      const targetBaseUrl = `${url.origin}/${targetCorsMode}`
      const annotation = JSON.parse(readFileSync(image.annotationPath, 'utf8'))
      const annotationPage = cloneJsonObject(
        localizeFixtureUrls(annotation, targetBaseUrl)
      )
      applyAnnotationImageService(
        annotationPage,
        targetBaseUrl,
        image,
        getCombinedAnnotationImageService(variant, index)
      )

      return Array.isArray(annotationPage.items)
        ? annotationPage.items
            .map((item) => cloneJsonObject(item))
            .flatMap((map) => {
              const currentAnnotationIndex = annotationIndex
              annotationIndex += 1
              const outputMap = shouldBreakCombinedAnnotation(
                variant,
                currentAnnotationIndex
              )
                ? createBrokenAnnotationMap(
                    map,
                    image,
                    getCombinedAnnotationErrorVariant(currentAnnotationIndex)
                  )
                : map
              const hierarchyMap =
                variant === 'mixed-partof-hierarchy-iiif3-level2'
                  ? applyMixedPartOfHierarchy(outputMap, currentAnnotationIndex)
                  : outputMap

              return hierarchyMap.id ? [hierarchyMap] : []
            })
        : []
    })
  }
}

function createManifestLevelCombinedAnnotationPage(
  request: Request,
  corsMode: CorsMode,
  manifestId: string,
  includeImage?: (image: ImageFixture, index: number) => boolean
) {
  return {
    ...createCombinedAnnotation(
      request,
      corsMode,
      'iiif3-level2',
      includeImage
    ),
    id: `${manifestId}/annotation-page/1`
  }
}

function getLinkedAnnotationPageId(
  baseUrl: string,
  imageId: string,
  variant: string,
  service?: ImageApiService
) {
  if (service) {
    return `${baseUrl}/annotations/manifests/3/${service.version}/${service.complianceLevel}/${imageId}/${variant}.json`
  }

  return `${baseUrl}/annotations/manifests/3/${imageId}/${variant}.json`
}

function getCombinedLinkedAnnotationPageId(
  baseUrl: string,
  variant: string,
  index: number
) {
  return `${baseUrl}/annotations/manifests/3/combined/${variant}/canvas/${
    index + 1
  }.json`
}

function getManifestImageRequest(
  imageServiceId: string,
  imageApiVersion: IiifVersion
) {
  const imagePathSize = imageApiVersion === '2' ? 'full' : 'max'

  return `${imageServiceId}/full/${imagePathSize}/0/default.jpg`
}

function getManifestImageBodyDimensions(image: ImageFixture) {
  return {
    width: image.width,
    height: image.height
  }
}

function createIiif3Canvas(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  manifestId: string,
  manifestLabel: JsonObject,
  variant = 'default',
  index = 1,
  linkedAnnotationPageId?: string,
  imageApiVersion: IiifVersion = '3',
  imageComplianceLevel: ImageComplianceLevel = 'level1',
  imageServiceBehavior?: ImageServiceBehavior
) {
  const canvasId = `${manifestId}/canvas/${index}`
  const annotationPageId = `${canvasId}/annotation-page/1`
  const annotationId = `${annotationPageId}/annotation/1`
  const imageServiceId = getImageServiceId(
    request,
    corsMode,
    imageApiVersion,
    imageComplianceLevel,
    image.id,
    imageServiceBehavior
  )
  const canvasLabel = image.imageLabel ?? image.label
  const imageBodyDimensions = getManifestImageBodyDimensions(image)
  const serviceType =
    variant === 'bad-service-type'
      ? 'ImageService2'
      : getImageServiceType(imageApiVersion)
  const canvas: JsonObject = {
    id: canvasId,
    type: 'Canvas',
    label: {
      none: [canvasLabel]
    },
    width: image.width,
    height: image.height,
    items: [
      {
        id: annotationPageId,
        type: 'AnnotationPage',
        items: [
          {
            id: annotationId,
            type: 'Annotation',
            motivation: 'painting',
            body: {
              id: getManifestImageRequest(imageServiceId, imageApiVersion),
              type: 'Image',
              format: 'image/jpeg',
              width: imageBodyDimensions.width,
              height: imageBodyDimensions.height,
              service: [
                {
                  id: imageServiceId,
                  type: serviceType,
                  profile: getImageServiceProfile(
                    imageApiVersion,
                    imageComplianceLevel
                  )
                }
              ]
            },
            target: canvasId
          }
        ]
      }
    ]
  }

  if (isEmbeddedAnnotationVariant(variant)) {
    canvas.annotations = [
      createEmbeddedAnnotation(
        request,
        corsMode,
        image,
        manifestId,
        manifestLabel,
        canvasId,
        getEmbeddedAnnotationErrorVariant(variant)
      )
    ]
  } else if (isLinkedAnnotationVariant(variant)) {
    canvas.annotations = [
      {
        id:
          linkedAnnotationPageId ??
          getLinkedAnnotationPageId(
            getBaseUrl(request, corsMode),
            image.id,
            variant
          ),
        type: 'AnnotationPage'
      }
    ]
  }

  return canvas
}

function createCombinedIiif3Manifest(
  request: Request,
  corsMode: CorsMode,
  variant: string
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const manifestId = `${baseUrl}/manifests/3/combined/${variant}.json`
  const label = {
    none: [getCombinedManifestLabel(variant)]
  }

  const manifest: JsonObject = {
    '@context': presentation3Context,
    id: manifestId,
    type: 'Manifest',
    label,
    items: getCombinedImages().map((image, index) => {
      const imageService = getCombinedCanvasImageService(variant, index)

      return createIiif3Canvas(
        request,
        corsMode,
        image,
        manifestId,
        label,
        getCombinedCanvasManifestVariant(variant, index),
        index + 1,
        getCombinedLinkedAnnotationPageId(baseUrl, variant, index),
        imageService.version,
        imageService.complianceLevel,
        getCombinedImageServiceBehavior(variant)
      )
    })
  }

  if (variant === 'manifest-embedded-annotations') {
    manifest.annotations = [
      createManifestLevelCombinedAnnotationPage(request, corsMode, manifestId)
    ]
  } else if (variant === 'partial-manifest-embedded-annotations') {
    manifest.annotations = [
      createManifestLevelCombinedAnnotationPage(
        request,
        corsMode,
        manifestId,
        (_image, index) => index % 2 === 0
      )
    ]
  }

  return manifest
}

function createCombinedIiif3CanvasResource(
  request: Request,
  corsMode: CorsMode,
  variant: string,
  canvasIndex: number
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const imageIndex = canvasIndex - 1
  const image = getCombinedImages()[imageIndex]

  if (!image) {
    throw new Error(`Unknown combined manifest canvas: ${canvasIndex}`)
  }

  const manifestId = `${baseUrl}/manifests/3/combined/${variant}.json`
  const label = {
    none: [getCombinedManifestLabel(variant)]
  }
  const imageService = getCombinedCanvasImageService(variant, imageIndex)

  return createIiif3Canvas(
    request,
    corsMode,
    image,
    manifestId,
    label,
    getCombinedCanvasManifestVariant(variant, imageIndex),
    canvasIndex,
    getCombinedLinkedAnnotationPageId(baseUrl, variant, imageIndex),
    imageService.version,
    imageService.complianceLevel,
    getCombinedImageServiceBehavior(variant)
  )
}

function createLinkedAnnotationPage(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  manifestId: string,
  manifestLabel: JsonObject,
  canvasId: string,
  annotationPageId: string,
  variant: string
) {
  return {
    ...createEmbeddedAnnotation(
      request,
      corsMode,
      image,
      manifestId,
      manifestLabel,
      canvasId,
      getLinkedAnnotationErrorVariant(variant)
    ),
    id: annotationPageId
  }
}

function createIiif3LinkedAnnotationPage(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  variant: string,
  imageApiVersion: IiifVersion = '3',
  imageComplianceLevel: ImageComplianceLevel = 'level1',
  useImageApiRoute = false
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const parsedOriginalManifest = getOriginalManifest(image)?.parsedManifest
  const manifestId = `${baseUrl}/manifests/3/${
    useImageApiRoute ? `${imageApiVersion}/${imageComplianceLevel}/` : ''
  }${image.id}/${variant}.json`
  const manifestLabel = image.manifestLabel ?? image.label
  const label = parsedOriginalManifest?.label ?? {
    none: [manifestLabel]
  }
  const canvasId = `${manifestId}/canvas/1`

  return createLinkedAnnotationPage(
    request,
    corsMode,
    image,
    manifestId,
    label,
    canvasId,
    getLinkedAnnotationPageId(
      baseUrl,
      image.id,
      variant,
      useImageApiRoute
        ? {
            version: imageApiVersion,
            complianceLevel: imageComplianceLevel
          }
        : undefined
    ),
    variant
  )
}

function createCombinedIiif3LinkedAnnotationPage(
  request: Request,
  corsMode: CorsMode,
  variant: string,
  canvasIndex: number
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const imageIndex = canvasIndex - 1
  const image = getCombinedImages()[imageIndex]

  if (!image) {
    throw new Error(`Unknown combined manifest canvas: ${canvasIndex}`)
  }

  const canvasVariant = getCombinedCanvasManifestVariant(variant, imageIndex)

  if (!isLinkedAnnotationVariant(canvasVariant)) {
    throw new Error(`Canvas ${canvasIndex} does not have a linked annotation`)
  }

  const manifestId = `${baseUrl}/manifests/3/combined/${variant}.json`
  const label = {
    none: [getCombinedManifestLabel(variant)]
  }
  const canvasId = `${manifestId}/canvas/${canvasIndex}`

  return createLinkedAnnotationPage(
    request,
    corsMode,
    image,
    manifestId,
    label,
    canvasId,
    getCombinedLinkedAnnotationPageId(baseUrl, variant, imageIndex),
    canvasVariant
  )
}

function parseNumber(value: string, name: string) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${name}: ${value}`)
  }

  return number
}

function parsePositiveNumber(value: string, name: string) {
  const number = parseNumber(value, name)

  if (number <= 0) {
    throw new Error(`Invalid ${name}: ${value}`)
  }

  return number
}

function parseRegion(regionParameter: string, image: ImageFixture): Region {
  if (regionParameter === 'full') {
    return {
      left: 0,
      top: 0,
      width: image.width,
      height: image.height
    }
  }

  const isPercent = regionParameter.startsWith('pct:')
  const values = (isPercent ? regionParameter.slice(4) : regionParameter)
    .split(',')
    .map((value) => parseNumber(value, 'region value'))

  if (values.length !== 4) {
    throw new Error(`Invalid region: ${regionParameter}`)
  }

  const [x, y, width, height] = values
  const region = isPercent
    ? {
        left: Math.round((x / 100) * image.width),
        top: Math.round((y / 100) * image.height),
        width: Math.round((width / 100) * image.width),
        height: Math.round((height / 100) * image.height)
      }
    : {
        left: Math.round(x),
        top: Math.round(y),
        width: Math.round(width),
        height: Math.round(height)
      }

  if (
    region.left < 0 ||
    region.top < 0 ||
    region.width <= 0 ||
    region.height <= 0 ||
    region.left + region.width > image.width ||
    region.top + region.height > image.height
  ) {
    throw new Error(`Region outside image bounds: ${regionParameter}`)
  }

  return region
}

function parseSize(sizeParameter: string, region: Region): Size | undefined {
  if (sizeParameter === 'full' || sizeParameter === 'max') {
    return undefined
  }

  if (sizeParameter.startsWith('pct:')) {
    const percentage = parsePositiveNumber(sizeParameter.slice(4), 'percentage')

    return {
      width: Math.round((percentage / 100) * region.width)
    }
  }

  const fit = sizeParameter.startsWith('!') ? 'inside' : 'fill'
  const size = fit === 'inside' ? sizeParameter.slice(1) : sizeParameter
  const [width, height] = size.split(',')

  if (width && height) {
    return {
      width: Math.round(parsePositiveNumber(width, 'width')),
      height: Math.round(parsePositiveNumber(height, 'height')),
      fit
    }
  }

  if (width) {
    return {
      width: Math.round(parsePositiveNumber(width, 'width'))
    }
  }

  if (height) {
    return {
      height: Math.round(parsePositiveNumber(height, 'height'))
    }
  }

  throw new Error(`Invalid size: ${sizeParameter}`)
}

function parseOutputFormat(format: string) {
  if (format === 'jpg' || format === 'jpeg') {
    return {
      contentType: 'image/jpeg',
      sharpFormat: 'jpeg' as const
    }
  }

  if (format === 'png' || format === 'webp') {
    return {
      contentType: `image/${format}`,
      sharpFormat: format as 'png' | 'webp'
    }
  }

  throw new Error(`Unsupported format: ${format}`)
}

function getOutputDimensions(region: Region, size: Size | undefined) {
  if (!size) {
    return {
      width: region.width,
      height: region.height
    }
  }

  if (size.width && size.height) {
    if (size.fit === 'inside') {
      const scale = Math.min(
        size.width / region.width,
        size.height / region.height
      )

      return {
        width: Math.round(region.width * scale),
        height: Math.round(region.height * scale)
      }
    }

    return {
      width: size.width,
      height: size.height
    }
  }

  if (size.width) {
    return {
      width: size.width,
      height: Math.round((region.height / region.width) * size.width)
    }
  }

  if (size.height) {
    return {
      width: Math.round((region.width / region.height) * size.height),
      height: size.height
    }
  }

  return {
    width: region.width,
    height: region.height
  }
}

function assertLevel0TileRequest(
  image: ImageFixture,
  region: Region,
  size: Size | undefined,
  rotation: string,
  quality: string,
  format: string
) {
  if (rotation !== '0' || quality !== 'default' || format !== 'jpg') {
    throw new Error('Level 0 only serves default JPEG requests')
  }

  const isFullRegion =
    region.left === 0 &&
    region.top === 0 &&
    region.width === image.width &&
    region.height === image.height
  if (isFullRegion && !size) {
    return
  }

  if (isFullRegion) {
    throw new Error(
      'Level 0 only serves full/max full-image requests and tiles declared in info.json'
    )
  }

  if (!size?.width || size.fit === 'inside') {
    throw new Error(
      'Level 0 requests must use full/max full-image syntax, width-only tile size syntax, or exact tile size syntax'
    )
  }

  const tile = getTiles(image)[0]
  const scaleFactor = Math.round(region.width / size.width)
  const expectedOutputWidth = Math.ceil(region.width / scaleFactor)
  const expectedOutputHeight = Math.ceil(region.height / scaleFactor)
  const requestedOutputHeight = size.height ?? expectedOutputHeight

  if (
    !tile.scaleFactors.includes(scaleFactor) ||
    size.width !== expectedOutputWidth ||
    requestedOutputHeight !== expectedOutputHeight ||
    expectedOutputWidth > tile.width ||
    expectedOutputHeight > tile.height ||
    region.left % (tile.width * scaleFactor) !== 0 ||
    region.top % (tile.height * scaleFactor) !== 0 ||
    region.width > tile.width * scaleFactor ||
    region.height > tile.height * scaleFactor ||
    region.left + region.width > image.width ||
    region.top + region.height > image.height
  ) {
    throw new Error(
      'Level 0 only serves full/max full-image requests and tiles declared in info.json'
    )
  }
}

function createWatermark(output: { width: number; height: number }) {
  const label =
    output.width < 240 ? 'SCALED-DOWN COPY' : 'SCALED-DOWN COPY OF ORIGINAL'
  const pixelSize = Math.max(1, Math.min(3, Math.floor(output.width / 260)))
  const paddingX = Math.max(6, pixelSize * 5)
  const paddingY = Math.max(5, pixelSize * 4)
  const letterGap = pixelSize
  const spaceWidth = pixelSize * 3
  const glyphHeight = pixelSize * 7
  const logoSize = Math.max(10, pixelSize * 9)
  const contentHeight = Math.max(glyphHeight, logoSize)
  const logoX = paddingX
  const logoY = paddingY + Math.round((contentHeight - logoSize) / 2)
  const glyphY = paddingY + Math.round((contentHeight - glyphHeight) / 2)
  let cursorX = paddingX + logoSize + pixelSize * 4
  const rects: string[] = []

  for (const character of label) {
    if (character === ' ') {
      cursorX += spaceWidth
      continue
    }

    const glyph = watermarkGlyphs[character]

    if (!glyph) {
      continue
    }

    for (const [rowIndex, row] of glyph.entries()) {
      for (const [columnIndex, value] of [...row].entries()) {
        if (value === '1') {
          rects.push(
            `<rect x="${cursorX + columnIndex * pixelSize}" y="${
              glyphY + rowIndex * pixelSize
            }" width="${pixelSize}" height="${pixelSize}"/>`
          )
        }
      }
    }

    cursorX += glyph[0].length * pixelSize + letterGap
  }

  const width = Math.min(output.width, cursorX + paddingX - letterGap)
  const height = contentHeight + paddingY * 2

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="black" fill-opacity="0.58"/>
      <g fill="white" fill-opacity="0.92">
        ${createWatermarkLogo(logoX, logoY, logoSize)}
        ${rects.join('')}
      </g>
    </svg>
  `)
}

function createWatermarkLogo(x: number, y: number, size: number) {
  return `
    <svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 1440 1440">
      <polygon points="1275.2,1031.6 720,1359.5 164.9,1031.7 230.3,993 720,1282.2 1209.8,993"/>
      <polygon points="1275.2,875.8 720,1203.7 164.8,875.8 230.2,837.2 720,1126.4 1209.8,837.2"/>
      <polygon points="1275.2,720 720,1047.9 164.8,720 230.2,681.4 720,970.5 1209.8,681.4"/>
      <polygon points="1275.1,564.2 1209.7,602.8 1143.2,642.1 720,892 296.7,642.1 230.2,602.8 164.8,564.2 230.2,525.5 720,814.7 1209.7,525.5"/>
      <path d="M720,80.5L164.8,408.4L720,736.2l555.1-327.9L720,80.5z M676.6,639.9l-93.5-54l68.6-71.1L513.6,435l-122.7,39.8l-93.5-54l608-178.7l80.6,46.5L676.6,639.9z"/>
      <polygon points="827.2,334.1 705.9,459.1 610.5,404"/>
    </svg>
  `
}

const watermarkGlyphs: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000']
}

function getScaleFactors(image: ImageFixture) {
  const scaleFactors = [1]
  const largestDimension = Math.max(image.width, image.height)

  while (512 * scaleFactors.at(-1)! < largestDimension) {
    scaleFactors.push(scaleFactors.at(-1)! * 2)
  }

  return scaleFactors
}

function getSizes(image: ImageFixture) {
  const sizes = [...getScaleFactors(image)].reverse().map((scaleFactor) => ({
    width: Math.ceil(image.width / scaleFactor),
    height: Math.ceil(image.height / scaleFactor)
  }))
  const hasFullSize = sizes.some(
    (size) => size.width === image.width && size.height === image.height
  )

  return hasFullSize
    ? sizes
    : [
        ...sizes,
        {
          width: image.width,
          height: image.height
        }
      ]
}

function getTiles(image: ImageFixture) {
  return [
    {
      width: 512,
      height: 512,
      scaleFactors: getScaleFactors(image)
    }
  ]
}

function createInfoJson(
  request: Request,
  corsMode: CorsMode,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  image: ImageFixture,
  behavior?: ImageServiceBehavior
) {
  const id = getImageServiceId(
    request,
    corsMode,
    version,
    complianceLevel,
    image.id,
    behavior
  )
  const tiles = getTiles(image)

  if (version === '2') {
    const profile: (JsonObject | string)[] =
      complianceLevel === 'level0'
        ? [`http://iiif.io/api/image/2/${complianceLevel}.json`]
        : [
            `http://iiif.io/api/image/2/${complianceLevel}.json`,
            {
              formats:
                complianceLevel === 'level2'
                  ? ['jpg', 'png', 'webp']
                  : ['jpg', 'webp'],
              qualities:
                complianceLevel === 'level2'
                  ? ['default', 'color']
                  : ['default'],
              supports:
                complianceLevel === 'level2'
                  ? [
                      'regionByPx',
                      'regionByPct',
                      'sizeByW',
                      'sizeByH',
                      'sizeByWh',
                      'sizeByPct',
                      'sizeByConfinedWh',
                      'cors'
                    ]
                  : ['regionByPx', 'sizeByW', 'sizeByH', 'sizeByPct', 'cors']
            }
          ]

    return {
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': id,
      protocol: 'http://iiif.io/api/image',
      width: image.width,
      height: image.height,
      tiles,
      ...(complianceLevel === 'level0' ? {} : { sizes: getSizes(image) }),
      profile
    }
  }

  const level3Extras =
    complianceLevel === 'level0'
      ? {}
      : complianceLevel === 'level1'
        ? {
            extraFormats: ['webp'],
            extraFeatures: ['regionByPx', 'sizeByW', 'sizeByH', 'cors']
          }
        : {
            extraFormats: ['png', 'webp'],
            extraQualities: ['color'],
            extraFeatures: [
              'regionByPx',
              'regionByPct',
              'sizeByW',
              'sizeByH',
              'sizeByWh',
              'sizeByPct',
              'sizeByConfinedWh',
              'cors'
            ]
          }

  return {
    '@context': 'http://iiif.io/api/image/3/context.json',
    id,
    type: 'ImageService3',
    protocol: 'http://iiif.io/api/image',
    width: image.width,
    height: image.height,
    tiles,
    ...(complianceLevel === 'level0' ? {} : { sizes: getSizes(image) }),
    profile: complianceLevel,
    ...level3Extras
  }
}

function createBrokenInfoJson(
  request: Request,
  corsMode: CorsMode,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  image: ImageFixture,
  variant: string
) {
  const infoJson = cloneJsonObject(
    createInfoJson(request, corsMode, version, complianceLevel, image)
  )

  if (variant === 'missing-dimensions') {
    delete infoJson.width
    delete infoJson.height

    return infoJson
  }

  if (variant === 'bad-tiles') {
    return {
      ...infoJson,
      tiles: [
        {
          width: '512',
          height: 0,
          scaleFactors: ['one', 2, -4]
        }
      ]
    }
  }

  throw new Error(`Unknown info.json error variant: ${variant}`)
}

function createBrokenAnnotation(
  annotation: unknown,
  baseUrl: string,
  image: ImageFixture,
  variant: string
) {
  const localizedAnnotation = localizeFixtureUrls(annotation, baseUrl)
  const brokenAnnotation = cloneJsonObject(localizedAnnotation)
  const maps = Array.isArray(brokenAnnotation.items)
    ? brokenAnnotation.items.map((item) => cloneJsonObject(item))
    : []

  if (variant === 'mixed-errors') {
    return {
      ...brokenAnnotation,
      items: maps.map((map, index) =>
        index % 2 === 0
          ? map
          : createBrokenAnnotationMap(
              map,
              image,
              getCombinedAnnotationErrorVariant(index)
            )
      )
    }
  }

  const firstMap = maps[0] ?? {}

  return {
    ...brokenAnnotation,
    items: [createBrokenAnnotationMap(firstMap, image, variant)]
  }
}

function createBrokenAnnotationMap(
  map: JsonObject,
  image: ImageFixture,
  variant: string
) {
  const brokenMap = cloneJsonObject(map)

  if (variant === 'missing-target') {
    delete brokenMap.target
  } else if (variant === 'bad-resource-size') {
    const target = cloneJsonObject(brokenMap.target)
    const source = cloneJsonObject(target.source)

    brokenMap.target = {
      ...target,
      source: {
        ...source,
        width: image.width * -1,
        height: 'unknown'
      }
    }
  } else if (variant === 'one-gcp') {
    const body = cloneJsonObject(brokenMap.body)

    brokenMap.body = {
      ...body,
      features: Array.isArray(body.features) ? body.features.slice(0, 1) : []
    }
  } else {
    throw new Error(`Unknown annotation error variant: ${variant}`)
  }

  return brokenMap
}

function createIiif2Manifest(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  variant = 'default',
  imageComplianceLevel: ImageComplianceLevel = 'level1',
  useImageApiRoute = false
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const sourceManifest = cloneJsonObject(getOriginalManifest(image)?.source)
  const sourceCanvas = getFirstCanvas(sourceManifest)
  const sourceAnnotation = getFirstImageAnnotation(sourceManifest)
  const sourceResource = getFirstImageResource(sourceManifest)
  const manifestId = `${baseUrl}/manifests/2/${
    useImageApiRoute ? `${imageComplianceLevel}/` : ''
  }${image.id}${variant === 'default' ? '' : `/${variant}`}.json`
  const manifestLabel = image.manifestLabel ?? image.label
  const canvasLabel = image.imageLabel ?? image.label
  const canvasId = `${manifestId}/canvas/1`
  const imageServiceId = getImageServiceId(
    request,
    corsMode,
    '2',
    imageComplianceLevel,
    image.id
  )
  const imageUrl = getManifestImageRequest(imageServiceId, '2')
  const imageBodyDimensions = getManifestImageBodyDimensions(image)
  const imageServiceProfile = getIiif2Profile(imageComplianceLevel)
  const thumbnailService = {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': imageServiceId,
    profile: imageServiceProfile
  }

  const service =
    variant === 'missing-service'
      ? undefined
      : {
          '@context': 'http://iiif.io/api/image/2/context.json',
          '@id': imageServiceId,
          profile: imageServiceProfile
        }

  return {
    ...sourceManifest,
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@id': manifestId,
    '@type': 'sc:Manifest',
    label: sourceManifest.label ?? manifestLabel,
    sequences: [
      {
        ...cloneJsonObject(sourceManifest.sequences?.[0]),
        '@id': `${manifestId}/sequence/1`,
        '@type': 'sc:Sequence',
        label: sourceManifest.sequences?.[0]?.label ?? manifestLabel,
        canvases: [
          {
            ...sourceCanvas,
            '@id': canvasId,
            '@type': 'sc:Canvas',
            label: sourceCanvas.label ?? canvasLabel,
            width: image.width,
            height: image.height,
            thumbnail: {
              ...cloneJsonObject(sourceCanvas.thumbnail),
              '@id':
                imageComplianceLevel === 'level0'
                  ? getLevel0TileExample(image, imageServiceId)
                  : `${imageServiceId}/full/250,/0/default.jpg`,
              service: thumbnailService
            },
            images: [
              {
                ...sourceAnnotation,
                '@id': `${canvasId}/annotation/1`,
                '@type': 'oa:Annotation',
                motivation: sourceAnnotation.motivation ?? 'sc:painting',
                resource: {
                  ...sourceResource,
                  '@id': imageUrl,
                  '@type': 'dctypes:Image',
                  format: 'image/jpeg',
                  width: imageBodyDimensions.width,
                  height: imageBodyDimensions.height,
                  ...(service ? { service } : { service: undefined })
                },
                on: canvasId
              }
            ]
          }
        ]
      }
    ]
  }
}

function createIiif3Manifest(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  variant = 'default',
  imageApiVersion: IiifVersion = '3',
  imageComplianceLevel: ImageComplianceLevel = 'level1',
  useImageApiRoute = false
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const parsedOriginalManifest = getOriginalManifest(image)?.parsedManifest
  const manifestId = `${baseUrl}/manifests/3/${
    useImageApiRoute ? `${imageApiVersion}/${imageComplianceLevel}/` : ''
  }${image.id}${variant === 'default' ? '' : `/${variant}`}.json`
  const manifestLabel = image.manifestLabel ?? image.label
  const label = parsedOriginalManifest?.label ?? {
    none: [manifestLabel]
  }
  const linkedAnnotationPageId =
    useImageApiRoute && isLinkedAnnotationVariant(variant)
      ? getLinkedAnnotationPageId(baseUrl, image.id, variant, {
          version: imageApiVersion,
          complianceLevel: imageComplianceLevel
        })
      : undefined
  const canvas = createIiif3Canvas(
    request,
    corsMode,
    image,
    manifestId,
    label,
    variant,
    1,
    linkedAnnotationPageId,
    imageApiVersion,
    imageComplianceLevel
  )

  const manifest: JsonObject = {
    '@context': presentation3Context,
    id: manifestId,
    type: 'Manifest',
    label,
    metadata: parsedOriginalManifest?.metadata,
    summary: parsedOriginalManifest?.summary,
    requiredStatement: parsedOriginalManifest?.requiredStatement,
    rights: parsedOriginalManifest?.rights,
    homepage: parsedOriginalManifest?.homepage,
    rendering: parsedOriginalManifest?.rendering,
    seeAlso: parsedOriginalManifest?.seeAlso,
    thumbnail: parsedOriginalManifest?.thumbnail,
    items: [canvas]
  }

  if (variant === 'navplace-midpoint' || variant === 'navplace-bbox') {
    return {
      ...addNavPlaceContext(manifest),
      navPlace: createNavPlace(manifestId, image, variant)
    }
  }

  return manifest
}

async function createImageRequestResponse(
  corsMode: CorsMode,
  complianceLevel: ImageComplianceLevel,
  image: ImageFixture,
  regionParameter: string,
  sizeParameter: string,
  rotation: string,
  quality: string,
  file: string
) {
  if (rotation !== '0') {
    throw new Error('Only rotation 0 is supported')
  }

  if (quality !== 'default' && quality !== 'color') {
    throw new Error('Only default and color quality are supported')
  }

  const fileMatch = file.match(/^(.+)\.(jpg|jpeg|png|webp)$/)

  if (!fileMatch) {
    throw new Error(`Invalid image request file: ${file}`)
  }

  const [, fileQuality, format] = fileMatch

  if (fileQuality !== quality) {
    throw new Error('Path quality and file quality do not match')
  }

  const region = parseRegion(regionParameter, image)
  const size = parseSize(sizeParameter, region)
  const outputFormat = parseOutputFormat(format)

  if (complianceLevel === 'level0') {
    assertLevel0TileRequest(image, region, size, rotation, quality, format)
  }

  const outputDimensions = getOutputDimensions(region, size)
  let transformer = sharp(image.imagePath).extract(region)

  if (size) {
    transformer = transformer.resize(size)
  }

  const buffer = await transformer
    .composite([
      {
        input: createWatermark(outputDimensions),
        gravity: 'southeast'
      }
    ])
    .toFormat(outputFormat.sharpFormat)
    .toBuffer()

  return imageResponse(buffer, corsMode, outputFormat.contentType)
}

function getImageServiceBaseUrl(
  baseUrl: string,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  imageId: string,
  behavior?: ImageServiceBehavior
) {
  return `${baseUrl}/iiif/${version}/${complianceLevel}/${imageId}${behavior ? `/${behavior}` : ''}`
}

function getLevel0TileExample(image: ImageFixture, imageServiceUrl: string) {
  const tile = getTiles(image)[0]
  const width = Math.min(tile.width, image.width)
  const height = Math.min(tile.height, image.height)

  return `${imageServiceUrl}/0,0,${width},${height}/${width},/0/default.jpg`
}

function getImageRequestExamples(
  image: ImageFixture,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  imageServiceUrl: string
): Link[] {
  if (complianceLevel === 'level0') {
    return [
      createImageApiLink(
        version,
        complianceLevel,
        'Declared tile',
        getLevel0TileExample(image, imageServiceUrl)
      )
    ]
  }

  const examples = [
    createImageApiLink(
      version,
      complianceLevel,
      'Full image, 600px wide',
      `${imageServiceUrl}/full/600,/0/default.jpg`
    ),
    createImageApiLink(
      version,
      complianceLevel,
      'Pixel region',
      `${imageServiceUrl}/0,0,512,512/256,/0/default.jpg`
    )
  ]

  if (complianceLevel === 'level2') {
    examples.push(
      createImageApiLink(
        version,
        complianceLevel,
        'Percentage region',
        `${imageServiceUrl}/pct:10,10,50,50/400,/0/default.jpg`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'Confined WebP thumbnail',
        `${imageServiceUrl}/full/!300,300/0/default.webp`
      )
    )
  }

  return examples
}

function getImageAnnotationLinks(baseUrl: string, image: ImageFixture) {
  return catalogImageApiServices.map(({ version, complianceLevel }) =>
    createImageApiLink(
      version,
      complianceLevel,
      'Georeference Annotation',
      `${baseUrl}/annotations/images/${version}/${complianceLevel}/${image.id}.json`
    )
  )
}

function getImageAnnotationErrorLinks(baseUrl: string, image: ImageFixture) {
  const variants = [
    ['Missing target', 'missing-target'],
    ['Invalid resource size', 'bad-resource-size'],
    ['Only 1 GCP', 'one-gcp'],
    ['Mixed correct/incorrect maps', 'mixed-errors']
  ] as const

  return catalogImageApiServices.flatMap(({ version, complianceLevel }) =>
    variants.map(([label, variant]) =>
      createImageApiLink(
        version,
        complianceLevel,
        label,
        `${baseUrl}/errors/annotations/images/${version}/${complianceLevel}/${image.id}/${variant}.json`
      )
    )
  )
}

function getManifestResourceLinks(baseUrl: string, image: ImageFixture) {
  if (!image.hasManifest) {
    return []
  }

  return [
    ...catalogImageComplianceLevels.map((complianceLevel) =>
      createImageApiLink(
        '2',
        complianceLevel,
        'IIIF Presentation 2.0',
        `${baseUrl}/manifests/2/${complianceLevel}/${image.id}.json`
      )
    ),
    ...catalogImageApiServices.flatMap(({ version, complianceLevel }) => [
      createImageApiLink(
        version,
        complianceLevel,
        'IIIF Presentation 3.0',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'Embedded annotation',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/embedded-annotation.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'Linked annotation',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/linked-annotation.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'navPlace midpoint',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/navplace-midpoint.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'navPlace bbox',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/navplace-bbox.json`
      )
    ])
  ]
}

function getManifestErrorLinks(baseUrl: string, image: ImageFixture) {
  if (!image.hasManifest) {
    return []
  }

  return [
    ...catalogImageComplianceLevels.map((complianceLevel) =>
      createImageApiLink(
        '2',
        complianceLevel,
        'Presentation 2.0 missing image service',
        `${baseUrl}/manifests/2/${complianceLevel}/${image.id}/missing-service.json`
      )
    ),
    ...catalogImageApiServices.flatMap(({ version, complianceLevel }) => [
      createImageApiLink(
        version,
        complianceLevel,
        'Presentation 3.0 bad service type',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/bad-service-type.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'Embedded annotation missing target',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/embedded-annotation-missing-target.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'Linked annotation missing target',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/linked-annotation-missing-target.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'Embedded annotation with only 1 GCP',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/embedded-annotation-one-gcp.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        'Linked annotation with only 1 GCP',
        `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/linked-annotation-one-gcp.json`
      ),
      ...(hasMultipleMapAnnotations(image)
        ? [
            createImageApiLink(
              version,
              complianceLevel,
              'Mixed correct/incorrect embedded annotations',
              `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/embedded-annotation-mixed-errors.json`
            ),
            createImageApiLink(
              version,
              complianceLevel,
              'Mixed correct/incorrect linked annotations',
              `${baseUrl}/manifests/3/${version}/${complianceLevel}/${image.id}/linked-annotation-mixed-errors.json`
            )
          ]
        : [])
    ])
  ]
}

export function createCatalog(request: Request, corsMode: CorsMode) {
  const baseUrl = getBaseUrl(request, corsMode)

  return {
    combinedImages: {
      annotations: getCombinedAnnotationVariants(baseUrl),
      manifests: getCombinedManifestVariants(baseUrl)
    },
    images: [...images.values()].map((image) => ({
      id: image.id,
      label: image.label,
      imageLabel: image.imageLabel,
      manifestLabel: image.manifestLabel,
      originalImageAnnotation: `https://annotations.allmaps.org/images/${image.id}`,
      width: image.width,
      height: image.height,
      annotation: `${baseUrl}/annotations/images/3/level2/${image.id}.json`,
      imageService2: `${baseUrl}/iiif/2/level2/${image.id}`,
      imageService3: `${baseUrl}/iiif/3/level2/${image.id}`,
      annotations: getImageAnnotationLinks(baseUrl, image),
      imageServices: catalogImageApiServices.map(
        ({ version, complianceLevel }) =>
          createImageApiLink(
            version,
            complianceLevel,
            'info.json',
            getImageServiceBaseUrl(baseUrl, version, complianceLevel, image.id)
          )
      ),
      imageExamples: catalogImageApiServices.flatMap(
        ({ version, complianceLevel }) =>
          getImageRequestExamples(
            image,
            version,
            complianceLevel,
            getImageServiceBaseUrl(baseUrl, version, complianceLevel, image.id)
          )
      ),
      errors: {
        infoJsons: catalogImageApiServices.flatMap(
          ({ version, complianceLevel }) => [
            createImageApiLink(
              version,
              complianceLevel,
              'Missing dimensions',
              `${baseUrl}/errors/iiif/${version}/${complianceLevel}/${image.id}/missing-dimensions/info.json`
            ),
            createImageApiLink(
              version,
              complianceLevel,
              'Invalid tiles',
              `${baseUrl}/errors/iiif/${version}/${complianceLevel}/${image.id}/bad-tiles/info.json`
            )
          ]
        ),
        annotations: getImageAnnotationErrorLinks(baseUrl, image),
        manifests: getManifestErrorLinks(baseUrl, image)
      },
      manifestResources: getManifestResourceLinks(baseUrl, image),
      manifests: image.hasManifest
        ? {
            iiif2: `${baseUrl}/manifests/2/level2/${image.id}.json`,
            iiif3: `${baseUrl}/manifests/3/3/level2/${image.id}.json`,
            variants: [
              {
                label: 'IIIF 3.0 with embedded annotation',
                href: `${baseUrl}/manifests/3/3/level2/${image.id}/embedded-annotation.json`
              },
              {
                label: 'IIIF 3.0 with linked annotation',
                href: `${baseUrl}/manifests/3/3/level2/${image.id}/linked-annotation.json`
              },
              {
                label: 'IIIF 3.0 with navPlace midpoint',
                href: `${baseUrl}/manifests/3/3/level2/${image.id}/navplace-midpoint.json`
              },
              {
                label: 'IIIF 3.0 with navPlace bbox',
                href: `${baseUrl}/manifests/3/3/level2/${image.id}/navplace-bbox.json`
              }
            ]
          }
        : undefined
    }))
  }
}

async function routeFixtureRequest(
  request: Request,
  corsMode: CorsMode,
  path: string
) {
  if (!path) {
    return jsonResponse(createCatalog(request, corsMode), corsMode)
  }

  const segments = parsePath(path)

  if (
    segments[0] === 'errors' &&
    segments[1] === 'iiif' &&
    (segments[5] === 'info.json' || segments[6] === 'info.json')
  ) {
    const version = parseIiifVersion(segments[2])
    const hasComplianceLevel = segments.length === 7
    const complianceLevel = hasComplianceLevel
      ? parseImageComplianceLevel(segments[3])
      : 'level1'
    const image = getImage(hasComplianceLevel ? segments[4] : segments[3])
    const variant = hasComplianceLevel ? segments[5] : segments[4]

    return jsonResponse(
      createBrokenInfoJson(
        request,
        corsMode,
        version,
        complianceLevel,
        image,
        variant
      ),
      corsMode
    )
  }

  if (
    segments[0] === 'iiif' &&
    (segments.length === 3 || segments.length === 4 || segments.length === 5) &&
    segments.at(-1) !== 'info.json'
  ) {
    parseIiifVersion(segments[1])

    if (segments.length >= 4) {
      parseImageComplianceLevel(segments[2])
      getImage(segments[3])
    } else {
      getImage(segments[2])
    }

    if (segments.length === 5) {
      parseImageServiceBehavior(segments[4])
    }

    const url = new URL(request.url)
    url.pathname = `${url.pathname.replace(/\/$/, '')}/info.json`

    return redirectResponse(url, corsMode)
  }

  if (
    segments[0] === 'iiif' &&
    (segments.length === 4 || segments.length === 5 || segments.length === 6) &&
    segments.at(-1) === 'info.json'
  ) {
    const version = parseIiifVersion(segments[1])
    const hasBehavior = segments.length === 6
    const hasComplianceLevel = segments.length >= 5
    const complianceLevel = hasComplianceLevel
      ? parseImageComplianceLevel(segments[2])
      : 'level1'
    const image = getImage(hasComplianceLevel ? segments[3] : segments[2])
    const behavior = hasBehavior
      ? parseImageServiceBehavior(segments[4])
      : undefined

    await delaySlowResource(behavior)

    return jsonResponse(
      createInfoJson(
        request,
        corsMode,
        version,
        complianceLevel,
        image,
        behavior
      ),
      corsMode
    )
  }

  if (
    segments[0] === 'iiif' &&
    (segments.length === 7 || segments.length === 8 || segments.length === 9)
  ) {
    parseIiifVersion(segments[1])
    const hasBehavior = segments.length === 9
    const hasComplianceLevel = segments.length >= 8
    const complianceLevel = hasComplianceLevel
      ? parseImageComplianceLevel(segments[2])
      : 'level1'
    const offset = hasComplianceLevel ? 1 : 0
    const requestOffset = offset + (hasBehavior ? 1 : 0)
    const behavior = hasBehavior
      ? parseImageServiceBehavior(segments[4])
      : undefined
    const image = getImage(segments[2 + offset])

    await delaySlowResource(behavior)

    if (behavior === 'image-500') {
      return textResponse('Image request failed intentionally', corsMode, 500)
    }

    return createImageRequestResponse(
      corsMode,
      complianceLevel,
      image,
      segments[3 + requestOffset],
      segments[4 + requestOffset],
      segments[5 + requestOffset],
      segments[6 + requestOffset].replace(/\.(jpg|jpeg|png|webp)$/, ''),
      segments[6 + requestOffset]
    )
  }

  if (
    segments[0] === 'errors' &&
    segments[1] === 'annotations' &&
    segments[2] === 'images'
  ) {
    const hasImageApiService =
      segments.length === 7 &&
      (segments[3] === '2' || segments[3] === '3') &&
      isImageComplianceLevel(segments[4])
    const service = hasImageApiService
      ? {
          version: parseIiifVersion(segments[3]),
          complianceLevel: parseImageComplianceLevel(segments[4])
        }
      : undefined
    const image = hasImageApiService
      ? getImage(segments[5])
      : getImage(parseVariantJsonFilename(segments.slice(3).join('/')).imageId)
    const variant = hasImageApiService
      ? parseJsonFilename(segments[6])
      : parseVariantJsonFilename(segments.slice(3).join('/')).variant
    const annotation = hasImageApiService
      ? createImageAnnotation(request, corsMode, image, service)
      : JSON.parse(await readFile(image.annotationPath, 'utf8'))

    return jsonResponse(
      createBrokenAnnotation(
        annotation,
        getBaseUrl(request, corsMode),
        image,
        variant
      ),
      corsMode
    )
  }

  if (segments[0] === 'annotations' && segments[1] === 'combined') {
    const variant = parseJsonFilename(segments[2])

    if (isSlowCombinedVariant(variant)) {
      await delay(slowResourceDelayMs)
    }

    return jsonResponse(
      createCombinedAnnotation(request, corsMode, variant),
      corsMode
    )
  }

  if (
    segments[0] === 'annotations' &&
    segments[1] === 'manifests' &&
    segments[2] === '3'
  ) {
    if (
      segments[3] === 'combined' &&
      segments[5] === 'canvas' &&
      segments.length === 7
    ) {
      const variant = segments[4]
      const canvasIndex = parsePositiveNumber(
        parseJsonFilename(segments[6]),
        'canvas index'
      )
      const canvasVariant = getCombinedCanvasManifestVariant(
        variant,
        canvasIndex - 1
      )

      if (
        !isCombinedIiif3ManifestVariant(variant) ||
        !isLinkedAnnotationVariant(canvasVariant)
      ) {
        return textResponse('No linked annotation for canvas', corsMode, 404)
      }

      if (isSlowCombinedVariant(variant)) {
        await delay(slowResourceDelayMs)
      }

      return jsonResponse(
        createCombinedIiif3LinkedAnnotationPage(
          request,
          corsMode,
          variant,
          canvasIndex
        ),
        corsMode
      )
    }

    if (
      segments.length === 7 &&
      (segments[3] === '2' || segments[3] === '3') &&
      isImageComplianceLevel(segments[4])
    ) {
      const version = parseIiifVersion(segments[3])
      const complianceLevel = parseImageComplianceLevel(segments[4])
      const image = getImage(segments[5])
      const variant = parseJsonFilename(segments[6])

      if (!image.hasManifest) {
        return textResponse('No manifest for image', corsMode, 404)
      }

      if (!isLinkedAnnotationVariant(variant)) {
        return textResponse('Unknown linked annotation variant', corsMode, 404)
      }

      return jsonResponse(
        createIiif3LinkedAnnotationPage(
          request,
          corsMode,
          image,
          variant,
          version,
          complianceLevel,
          true
        ),
        corsMode
      )
    }

    if (segments.length === 5) {
      const image = getImage(segments[3])
      const variant = parseJsonFilename(segments[4])

      if (!image.hasManifest) {
        return textResponse('No manifest for image', corsMode, 404)
      }

      if (!isLinkedAnnotationVariant(variant)) {
        return textResponse('Unknown linked annotation variant', corsMode, 404)
      }

      return jsonResponse(
        createIiif3LinkedAnnotationPage(request, corsMode, image, variant),
        corsMode
      )
    }
  }

  if (segments[0] === 'annotations' && segments[1] === 'images') {
    if (
      segments.length === 5 &&
      (segments[2] === '2' || segments[2] === '3') &&
      isImageComplianceLevel(segments[3])
    ) {
      const version = parseIiifVersion(segments[2])
      const complianceLevel = parseImageComplianceLevel(segments[3])
      const image = getImage(parseJsonFilename(segments[4]))

      return jsonResponse(
        createImageAnnotation(request, corsMode, image, {
          version,
          complianceLevel
        }),
        corsMode
      )
    }

    const image = getImage(parseJsonFilename(segments[2]))

    return jsonResponse(
      createImageAnnotation(request, corsMode, image),
      corsMode
    )
  }

  if (segments[0] === 'manifests' && segments[1] === '2') {
    const hasImageApiRoute =
      segments.length >= 4 && isImageComplianceLevel(segments[2])
    const imageComplianceLevel = hasImageApiRoute
      ? parseImageComplianceLevel(segments[2])
      : 'level1'
    const isCanvasRoute =
      segments.length >= 5 && segments[segments.length - 2] === 'canvas'

    if (
      isCanvasRoute &&
      parsePositiveNumber(segments[segments.length - 1], 'canvas index') !== 1
    ) {
      return textResponse('Unknown manifest canvas', corsMode, 404)
    }

    const path = segments
      .slice(hasImageApiRoute ? 3 : 2, isCanvasRoute ? -2 : undefined)
      .join('/')
    const { imageId, variant } = path.includes('/')
      ? parseVariantJsonFilename(path)
      : { imageId: parseJsonFilename(path), variant: 'default' }
    const image = getImage(imageId)

    if (!image.hasManifest) {
      return textResponse('No manifest for image', corsMode, 404)
    }

    if (variant !== 'default' && variant !== 'missing-service') {
      return textResponse('Unknown manifest variant', corsMode, 404)
    }

    const manifest = createIiif2Manifest(
      request,
      corsMode,
      image,
      variant,
      imageComplianceLevel,
      hasImageApiRoute
    )

    return jsonResponse(
      isCanvasRoute ? manifest.sequences[0].canvases[0] : manifest,
      corsMode
    )
  }

  if (segments[0] === 'manifests' && segments[1] === '3') {
    if (
      segments[2] === 'combined' &&
      segments.length === 6 &&
      segments[4] === 'canvas'
    ) {
      const variant = parseJsonFilename(segments[3])
      const canvasIndex = parsePositiveNumber(segments[5], 'canvas index')

      if (!isCombinedIiif3ManifestVariant(variant)) {
        return textResponse('Unknown manifest variant', corsMode, 404)
      }

      if (!getCombinedImages()[canvasIndex - 1]) {
        return textResponse('Unknown manifest canvas', corsMode, 404)
      }

      if (isSlowCombinedVariant(variant)) {
        await delay(slowResourceDelayMs)
      }

      return jsonResponse(
        createCombinedIiif3CanvasResource(
          request,
          corsMode,
          variant,
          canvasIndex
        ),
        corsMode
      )
    }

    if (segments[2] === 'combined' && segments.length === 4) {
      const variant = parseJsonFilename(segments[3])

      if (!isCombinedIiif3ManifestVariant(variant)) {
        return textResponse('Unknown manifest variant', corsMode, 404)
      }

      if (isSlowCombinedVariant(variant)) {
        await delay(slowResourceDelayMs)
      }

      return jsonResponse(
        createCombinedIiif3Manifest(request, corsMode, variant),
        corsMode
      )
    }

    const hasImageApiRoute =
      segments.length >= 5 &&
      (segments[2] === '2' || segments[2] === '3') &&
      isImageComplianceLevel(segments[3])
    const imageApiVersion = hasImageApiRoute
      ? parseIiifVersion(segments[2])
      : '3'
    const imageComplianceLevel = hasImageApiRoute
      ? parseImageComplianceLevel(segments[3])
      : 'level1'
    const isCanvasRoute =
      segments.length >= 5 && segments[segments.length - 2] === 'canvas'

    if (
      isCanvasRoute &&
      parsePositiveNumber(segments[segments.length - 1], 'canvas index') !== 1
    ) {
      return textResponse('Unknown manifest canvas', corsMode, 404)
    }

    const imagePath = segments
      .slice(hasImageApiRoute ? 4 : 2, isCanvasRoute ? -2 : undefined)
      .join('/')
    const { imageId, variant } = imagePath.includes('/')
      ? parseVariantJsonFilename(imagePath)
      : { imageId: parseJsonFilename(imagePath), variant: 'default' }
    const image = getImage(imageId)

    if (!image.hasManifest) {
      return textResponse('No manifest for image', corsMode, 404)
    }

    if (!isIiif3ManifestVariant(variant)) {
      return textResponse('Unknown manifest variant', corsMode, 404)
    }

    const manifest = createIiif3Manifest(
      request,
      corsMode,
      image,
      variant,
      imageApiVersion,
      imageComplianceLevel,
      hasImageApiRoute
    )

    return jsonResponse(isCanvasRoute ? manifest.items[0] : manifest, corsMode)
  }

  return textResponse('Not found', corsMode, 404)
}

export function handleFixtureOptions(corsModeParameter: string) {
  const corsMode = parseCorsMode(corsModeParameter)

  return withCors(new Response(null, { status: 204 }), corsMode)
}

export async function handleFixtureRequest(
  request: Request,
  corsModeParameter: string,
  path = ''
) {
  let corsMode: CorsMode = 'no-cors'

  try {
    corsMode = parseCorsMode(corsModeParameter)

    return await routeFixtureRequest(request, corsMode, path)
  } catch (error) {
    return textResponse(
      error instanceof Error ? error.message : String(error),
      corsMode,
      400
    )
  }
}
