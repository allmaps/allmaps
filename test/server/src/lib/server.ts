import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

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
  jsonResponse,
  redirectResponse,
  textResponse,
  withCors
} from './responses.ts'
import {
  delay,
  delaySlowResource,
  getCombinedImageServiceBehavior,
  isSlowCombinedVariant,
  parseImageServiceBehavior,
  shouldReturnTooManyRequests,
  slowResourceDelayMs,
  tooManyRequestsResponse
} from './server/behaviors.ts'
import {
  createBrokenAnnotation,
  createBrokenAnnotationMap,
  getCombinedAnnotationErrorVariant,
  getEmbeddedAnnotationErrorVariant,
  getLinkedAnnotationErrorVariant,
  isEmbeddedAnnotationVariant,
  isLinkedAnnotationVariant,
  shouldBreakCombinedAnnotation
} from './server/annotations.ts'
import {
  catalogImageApiServices,
  catalogImageComplianceLevels,
  createBrokenInfoJson,
  createImageApiLink,
  createImageRequestResponse,
  createInfoJson,
  getIiif2Profile,
  getImageApiVersionLabel,
  getImageRequestExamples,
  getImageServiceBaseUrl,
  getImageServiceProfile,
  getImageServiceType,
  getLevel0TileExample,
  getManifestImageBodyDimensions,
  getManifestImageRequest,
  getWrongImageServiceType,
  isImageComplianceLevel,
  parsePositiveNumber,
  type ImageApiService,
  type ImageApiServiceReference,
  type ImageServiceBehavior
} from './server/image-api.ts'
import {
  getFirstCanvas,
  getFirstImageAnnotation,
  getFirstImageResource,
  getImage,
  getImages,
  getOriginalManifest,
  hasMultipleMapAnnotations,
  type ImageFixture
} from './server/fixture-data.ts'
import {
  getIiif2Label,
  getIiif2Rendering,
  getIiif2Thumbnail
} from './server/iiif2.ts'
import { addNavPlaceContext, createNavPlace } from './server/navplace.ts'
import type {
  CorsMode,
  IiifVersion,
  ImageComplianceLevel,
  JsonObject
} from './types.ts'

const presentation3Context = 'http://iiif.io/api/presentation/3/context.json'

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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
  return getImages()
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

function getCombinedAnnotationHttpErrorStatus(variant: string) {
  if (variant === 'http-401') {
    return 401
  }

  if (variant === 'http-403') {
    return 403
  }

  if (variant === 'http-404') {
    return 404
  }

  if (variant === 'http-429') {
    return 429
  }

  if (variant === 'http-500') {
    return 500
  }

  if (variant === 'http-503') {
    return 503
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
      'Some image requests return 500',
      `${baseUrl}/annotations/combined/mixed-image-500-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Annotation page loads, image services return 500',
      `${baseUrl}/annotations/combined/service-500-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Some image services return 500',
      `${baseUrl}/annotations/combined/mixed-service-500-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Annotation page returns 401',
      `${baseUrl}/annotations/combined/http-401.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Annotation page returns 403',
      `${baseUrl}/annotations/combined/http-403.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Annotation page returns 404',
      `${baseUrl}/annotations/combined/http-404.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Annotation page returns 429',
      `${baseUrl}/annotations/combined/http-429.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Annotation page returns 500',
      `${baseUrl}/annotations/combined/http-500.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Annotation page returns 503',
      `${baseUrl}/annotations/combined/http-503.json`
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
      'Image services return 429 after 20 seconds',
      `${baseUrl}/annotations/combined/too-many-requests-after-20s-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Some image services return 429 after 20 seconds',
      `${baseUrl}/annotations/combined/mixed-too-many-requests-after-20s-iiif3-level2.json`
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
      'All embedded annotations, some incorrect',
      `${baseUrl}/manifests/3/combined/all-embedded-annotations-mixed-errors.json`
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
    createImageApiLink(
      '3',
      'level2',
      'Image services return 429 after 20 seconds',
      `${baseUrl}/manifests/3/combined/too-many-requests-after-20s-iiif3-level2.json`
    ),
    createImageApiLink(
      '3',
      'level2',
      'Some image services return 429 after 20 seconds',
      `${baseUrl}/manifests/3/combined/mixed-too-many-requests-after-20s-iiif3-level2.json`
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
      'all-embedded-annotations-mixed-errors',
      'mixed-embedded-annotation-errors',
      'mixed-linked-annotation-errors',
      'image-500-iiif3-level2',
      'slow-iiif3-level2',
      'too-many-requests-after-20s-iiif3-level2',
      'mixed-too-many-requests-after-20s-iiif3-level2',
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

  if (variant === 'all-embedded-annotations-mixed-errors') {
    return 'Combined fixture images with all annotations embedded and some incorrect maps'
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

  if (variant === 'too-many-requests-after-20s-iiif3-level2') {
    return 'Combined fixture images whose image services return 429 after 20 seconds'
  }

  if (variant === 'mixed-too-many-requests-after-20s-iiif3-level2') {
    return 'Combined fixture images with some image services that return 429 after 20 seconds'
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

  if (
    variant === 'image-500-iiif3-level2' ||
    variant === 'slow-iiif3-level2' ||
    variant === 'too-many-requests-after-20s-iiif3-level2' ||
    variant === 'mixed-too-many-requests-after-20s-iiif3-level2'
  ) {
    return 'linked-annotation'
  }

  if (variant === 'partial-embedded-annotations') {
    return index % 2 === 0 ? 'embedded-annotation' : 'linked-annotation'
  }

  if (variant === 'partial-linked-annotations') {
    return index % 2 === 0 ? 'linked-annotation' : 'default'
  }

  if (variant === 'all-embedded-annotations-mixed-errors') {
    return 'embedded-annotation'
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
): ImageApiServiceReference {
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

  if (variant === 'too-many-requests-after-20s-iiif3-level2') {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: 'too-many-requests-after-20s'
    }
  }

  if (variant === 'mixed-too-many-requests-after-20s-iiif3-level2') {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: index % 2 === 0 ? undefined : 'too-many-requests-after-20s'
    }
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
    variant === 'service-500-iiif3-level2' ||
    variant === 'slow-iiif3-level2' ||
    variant === 'too-many-requests-after-20s-iiif3-level2'
  ) {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: getCombinedImageServiceBehavior(variant)
    }
  }

  if (variant === 'mixed-image-500-iiif3-level2') {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: index % 2 === 0 ? undefined : 'image-500'
    }
  }

  if (variant === 'mixed-service-500-iiif3-level2') {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: index % 2 === 0 ? undefined : 'service-500'
    }
  }

  if (variant === 'mixed-slow-iiif3-level2') {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: index % 2 === 0 ? undefined : 'slow'
    }
  }

  if (variant === 'mixed-too-many-requests-after-20s-iiif3-level2') {
    return {
      version: '3',
      complianceLevel: 'level2',
      behavior: index % 2 === 0 ? undefined : 'too-many-requests-after-20s'
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
      'mixed-image-500-iiif3-level2',
      'service-500-iiif3-level2',
      'mixed-service-500-iiif3-level2',
      'slow-iiif3-level2',
      'mixed-slow-iiif3-level2',
      'too-many-requests-after-20s-iiif3-level2',
      'mixed-too-many-requests-after-20s-iiif3-level2',
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
      ? getWrongImageServiceType(imageApiVersion)
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

function getMapAnnotationCount(image: ImageFixture) {
  const annotation = JSON.parse(readFileSync(image.annotationPath, 'utf8'))

  return Array.isArray(annotation.items) ? annotation.items.length : 0
}

function getCombinedMapAnnotationOffset(imageIndex: number) {
  return getCombinedImages()
    .slice(0, imageIndex)
    .reduce((total, image) => total + getMapAnnotationCount(image), 0)
}

function applyMixedEmbeddedAnnotationErrors(
  canvas: JsonObject,
  image: ImageFixture,
  startIndex: number
) {
  const annotationPage = canvas.annotations?.[0]

  if (!Array.isArray(annotationPage?.items)) {
    return
  }

  annotationPage.items = annotationPage.items.map(
    (annotation: JsonObject, index: number) => {
      const annotationIndex = startIndex + index

      return annotationIndex % 2 === 0
        ? annotation
        : createBrokenAnnotationMap(
            cloneJsonObject(annotation),
            image,
            getCombinedAnnotationErrorVariant(annotationIndex)
          )
    }
  )
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
      const canvas = createIiif3Canvas(
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
        imageService.behavior ?? getCombinedImageServiceBehavior(variant)
      )

      if (variant === 'all-embedded-annotations-mixed-errors') {
        applyMixedEmbeddedAnnotationErrors(
          canvas,
          image,
          getCombinedMapAnnotationOffset(index)
        )
      }

      return canvas
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

  const canvas = createIiif3Canvas(
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
    imageService.behavior ?? getCombinedImageServiceBehavior(variant)
  )

  if (variant === 'all-embedded-annotations-mixed-errors') {
    applyMixedEmbeddedAnnotationErrors(
      canvas,
      image,
      getCombinedMapAnnotationOffset(imageIndex)
    )
  }

  return canvas
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
    label: getIiif2Label(sourceManifest.label, manifestLabel),
    rendering: getIiif2Rendering(sourceManifest.rendering),
    thumbnail: getIiif2Thumbnail(sourceManifest.thumbnail),
    sequences: [
      {
        ...cloneJsonObject(sourceManifest.sequences?.[0]),
        '@id': `${manifestId}/sequence/1`,
        '@type': 'sc:Sequence',
        label: getIiif2Label(
          sourceManifest.sequences?.[0]?.label,
          manifestLabel
        ),
        canvases: [
          {
            ...sourceCanvas,
            '@id': canvasId,
            '@type': 'sc:Canvas',
            label: getIiif2Label(sourceCanvas.label, canvasLabel),
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

function normalizeLabeledContentResources(
  resources: JsonObject | JsonObject[] | undefined,
  fallbackLabel: string
) {
  if (!resources) {
    return undefined
  }

  const resourceItems = Array.isArray(resources) ? resources : [resources]

  return resourceItems.map((resource) => ({
    ...cloneJsonObject(resource),
    label: resource.label ?? {
      none: [fallbackLabel]
    }
  }))
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
    homepage: normalizeLabeledContentResources(
      parsedOriginalManifest?.homepage,
      'Homepage'
    ),
    rendering: normalizeLabeledContentResources(
      parsedOriginalManifest?.rendering,
      'Rendering'
    ),
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
    ...(hasMultipleMapAnnotations(image)
      ? [['Mixed correct/incorrect maps', 'mixed-errors']]
      : [])
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

function getRateLimitedImageServiceLinks(baseUrl: string, image: ImageFixture) {
  return catalogImageApiServices.flatMap(({ version, complianceLevel }) => {
    const imageServiceUrl = getImageServiceBaseUrl(
      baseUrl,
      version,
      complianceLevel,
      image.id,
      'too-many-requests-after-20s'
    )

    return [
      createImageApiLink(
        version,
        complianceLevel,
        '429 after 20s info.json',
        `${imageServiceUrl}/info.json`
      ),
      createImageApiLink(
        version,
        complianceLevel,
        '429 after 20s tile',
        getLevel0TileExample(image, imageServiceUrl)
      )
    ]
  })
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
    images: getImages().map((image) => ({
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
        imageServices: getRateLimitedImageServiceLinks(baseUrl, image),
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

    if (
      shouldReturnTooManyRequests(
        corsMode,
        version,
        complianceLevel,
        image.id,
        behavior
      )
    ) {
      return tooManyRequestsResponse(corsMode)
    }

    if (behavior === 'service-500') {
      return textResponse('Image service failed intentionally', corsMode, 500)
    }

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
    const version = parseIiifVersion(segments[1])
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

    if (
      shouldReturnTooManyRequests(
        corsMode,
        version,
        complianceLevel,
        image.id,
        behavior
      )
    ) {
      return tooManyRequestsResponse(corsMode)
    }

    if (behavior === 'image-500' || behavior === 'service-500') {
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
    const errorStatus = getCombinedAnnotationHttpErrorStatus(variant)

    if (errorStatus) {
      return textResponse(
        `Combined annotation page returned ${errorStatus} intentionally`,
        corsMode,
        errorStatus
      )
    }

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
