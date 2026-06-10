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
  parseIiifVersion,
  parseJsonFilename,
  parsePath,
  parseVariantJsonFilename
} from './paths.ts'
import {
  imageResponse,
  jsonResponse,
  textResponse,
  withCors
} from './responses.ts'
import type {
  Bbox,
  CorsMode,
  IiifVersion,
  JsonObject,
  Point,
  Region,
  Ring,
  Size
} from './types.ts'

type ImageFixture = ImageFixtureDefinition

const navPlaceContext = 'http://iiif.io/api/extension/navplace/context.json'
const presentation3Context = 'http://iiif.io/api/presentation/3/context.json'

const imageDefinitions = loadImageDefinitions()

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

function isEmbeddedAnnotationVariant(variant: string) {
  return (
    variant === 'embedded-annotation' ||
    getEmbeddedAnnotationErrorVariant(variant) !== undefined
  )
}

function isIiif3ManifestVariant(variant: string) {
  return (
    variant === 'default' ||
    variant === 'bad-service-type' ||
    isEmbeddedAnnotationVariant(variant) ||
    variant === 'navplace-midpoint' ||
    variant === 'navplace-bbox'
  )
}

function getCombinedImages() {
  return [...images.values()]
}

function getCombinedAnnotationVariants(baseUrl: string) {
  return [
    {
      label: 'All annotations, current image CORS mode',
      href: `${baseUrl}/annotations/combined/all-correct.json`
    },
    {
      label: 'All annotations, mixed image CORS modes',
      href: `${baseUrl}/annotations/combined/mixed-cors.json`
    },
    {
      label: 'Mixed correct and incorrect annotations',
      href: `${baseUrl}/annotations/combined/mixed-errors.json`
    },
    {
      label: 'Mixed CORS modes, correct and incorrect annotations',
      href: `${baseUrl}/annotations/combined/mixed-cors-errors.json`
    }
  ]
}

function getCombinedManifestVariants(baseUrl: string) {
  return [
    {
      label: 'IIIF 3 manifest with all embedded annotations',
      href: `${baseUrl}/manifests/3/combined/embedded-annotations.json`
    }
  ]
}

function getCombinedTargetCorsMode(
  responseCorsMode: CorsMode,
  variant: string,
  index: number
): CorsMode {
  if (variant === 'mixed-cors' || variant === 'mixed-cors-errors') {
    return index % 2 === 0 ? 'cors' : 'no-cors'
  }

  return responseCorsMode
}

function getCombinedAnnotationErrorVariant(index: number) {
  return ['one-gcp', 'bad-resource-size', 'missing-target'][index % 3] as string
}

function shouldBreakCombinedAnnotation(variant: string, index: number) {
  return (
    (variant === 'mixed-errors' || variant === 'mixed-cors-errors') &&
    index % 2 === 1
  )
}

function createCombinedAnnotation(
  request: Request,
  corsMode: CorsMode,
  variant: string
) {
  if (
    ![
      'all-correct',
      'mixed-cors',
      'mixed-errors',
      'mixed-cors-errors'
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
      const targetCorsMode = getCombinedTargetCorsMode(corsMode, variant, index)
      const targetBaseUrl = `${url.origin}/${targetCorsMode}`
      const annotation = JSON.parse(readFileSync(image.annotationPath, 'utf8'))
      const annotationPage = cloneJsonObject(
        localizeFixtureUrls(annotation, targetBaseUrl)
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

              return outputMap.id ? [outputMap] : []
            })
        : []
    })
  }
}

function createIiif3Canvas(
  request: Request,
  corsMode: CorsMode,
  image: ImageFixture,
  manifestId: string,
  manifestLabel: JsonObject,
  variant = 'default',
  index = 1
) {
  const canvasId = `${manifestId}/canvas/${index}`
  const annotationPageId = `${canvasId}/annotation-page/1`
  const annotationId = `${annotationPageId}/annotation/1`
  const imageServiceId = getImageServiceId(request, corsMode, '3', image.id)
  const canvasLabel = image.imageLabel ?? image.label
  const serviceType =
    variant === 'bad-service-type' ? 'ImageService2' : 'ImageService3'
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
              id: `${imageServiceId}/full/max/0/default.jpg`,
              type: 'Image',
              format: 'image/jpeg',
              width: image.width,
              height: image.height,
              service: [
                {
                  id: imageServiceId,
                  type: serviceType,
                  profile: 'level1'
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
  }

  return canvas
}

function createCombinedIiif3Manifest(request: Request, corsMode: CorsMode) {
  const baseUrl = getBaseUrl(request, corsMode)
  const manifestId = `${baseUrl}/manifests/3/combined/embedded-annotations.json`
  const label = {
    none: ['Combined fixture images with embedded annotations']
  }

  return {
    '@context': presentation3Context,
    id: manifestId,
    type: 'Manifest',
    label,
    items: getCombinedImages().map((image, index) =>
      createIiif3Canvas(
        request,
        corsMode,
        image,
        manifestId,
        label,
        'embedded-annotation',
        index + 1
      )
    )
  }
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
  return [...getScaleFactors(image)].reverse().map((scaleFactor) => ({
    width: Math.ceil(image.width / scaleFactor),
    height: Math.ceil(image.height / scaleFactor)
  }))
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
  image: ImageFixture
) {
  const id = getImageServiceId(request, corsMode, version, image.id)
  const sizes = getSizes(image)
  const tiles = getTiles(image)

  if (version === '2') {
    return {
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': id,
      protocol: 'http://iiif.io/api/image',
      width: image.width,
      height: image.height,
      sizes,
      tiles,
      profile: [
        'http://iiif.io/api/image/2/level1.json',
        {
          formats: ['jpg', 'png', 'webp'],
          qualities: ['default', 'color'],
          supports: [
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
      ]
    }
  }

  return {
    '@context': 'http://iiif.io/api/image/3/context.json',
    id,
    type: 'ImageService3',
    protocol: 'http://iiif.io/api/image',
    width: image.width,
    height: image.height,
    sizes,
    tiles,
    profile: 'level1',
    extraFormats: ['jpg', 'png', 'webp'],
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
}

function createBrokenInfoJson(
  request: Request,
  corsMode: CorsMode,
  version: IiifVersion,
  image: ImageFixture,
  variant: string
) {
  const infoJson = cloneJsonObject(
    createInfoJson(request, corsMode, version, image)
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
  variant = 'default'
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const sourceManifest = cloneJsonObject(getOriginalManifest(image)?.source)
  const sourceCanvas = getFirstCanvas(sourceManifest)
  const sourceAnnotation = getFirstImageAnnotation(sourceManifest)
  const sourceResource = getFirstImageResource(sourceManifest)
  const manifestId = `${baseUrl}/manifests/2/${image.id}${
    variant === 'default' ? '' : `/${variant}`
  }.json`
  const manifestLabel = image.manifestLabel ?? image.label
  const canvasLabel = image.imageLabel ?? image.label
  const canvasId = `${manifestId}/canvas/1`
  const imageServiceId = getImageServiceId(request, corsMode, '2', image.id)
  const imageUrl = `${imageServiceId}/full/full/0/default.jpg`
  const thumbnailService = {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': imageServiceId,
    profile: 'http://iiif.io/api/image/2/level1.json'
  }

  const service =
    variant === 'missing-service'
      ? undefined
      : {
          '@context': 'http://iiif.io/api/image/2/context.json',
          '@id': imageServiceId,
          profile: 'http://iiif.io/api/image/2/level1.json'
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
              '@id': `${imageServiceId}/full/250,/0/default.jpg`,
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
                  width: image.width,
                  height: image.height,
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
  variant = 'default'
) {
  const baseUrl = getBaseUrl(request, corsMode)
  const parsedOriginalManifest = getOriginalManifest(image)?.parsedManifest
  const manifestId = `${baseUrl}/manifests/3/${image.id}${
    variant === 'default' ? '' : `/${variant}`
  }.json`
  const manifestLabel = image.manifestLabel ?? image.label
  const label = parsedOriginalManifest?.label ?? {
    none: [manifestLabel]
  }
  const canvas = createIiif3Canvas(
    request,
    corsMode,
    image,
    manifestId,
    label,
    variant
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
      annotation: `${baseUrl}/annotations/images/${image.id}.json`,
      imageService2: `${baseUrl}/iiif/2/${image.id}`,
      imageService3: `${baseUrl}/iiif/3/${image.id}`,
      errors: {
        infoJsons: [
          {
            label: 'IIIF 2 info without dimensions',
            href: `${baseUrl}/errors/iiif/2/${image.id}/missing-dimensions/info.json`
          },
          {
            label: 'IIIF 3 info with invalid tiles',
            href: `${baseUrl}/errors/iiif/3/${image.id}/bad-tiles/info.json`
          }
        ],
        annotations: [
          {
            label: 'Annotation without target',
            href: `${baseUrl}/errors/annotations/images/${image.id}/missing-target.json`
          },
          {
            label: 'Annotation with invalid resource size',
            href: `${baseUrl}/errors/annotations/images/${image.id}/bad-resource-size.json`
          },
          {
            label: 'Annotation with only 1 GCP',
            href: `${baseUrl}/errors/annotations/images/${image.id}/one-gcp.json`
          },
          {
            label: 'Annotation with mixed correct/incorrect maps',
            href: `${baseUrl}/errors/annotations/images/${image.id}/mixed-errors.json`
          }
        ],
        manifests: image.hasManifest
          ? [
              {
                label: 'IIIF 2 manifest without image service',
                href: `${baseUrl}/manifests/2/${image.id}/missing-service.json`
              },
              {
                label: 'IIIF 3 manifest with bad service type',
                href: `${baseUrl}/manifests/3/${image.id}/bad-service-type.json`
              },
              {
                label:
                  'IIIF 3 manifest with embedded annotation without target',
                href: `${baseUrl}/manifests/3/${image.id}/embedded-annotation-missing-target.json`
              },
              {
                label:
                  'IIIF 3 manifest with embedded annotation with only 1 GCP',
                href: `${baseUrl}/manifests/3/${image.id}/embedded-annotation-one-gcp.json`
              },
              ...(hasMultipleMapAnnotations(image)
                ? [
                    {
                      label:
                        'IIIF 3 manifest with mixed correct/incorrect embedded annotations',
                      href: `${baseUrl}/manifests/3/${image.id}/embedded-annotation-mixed-errors.json`
                    }
                  ]
                : [])
            ]
          : []
      },
      manifests: image.hasManifest
        ? {
            iiif2: `${baseUrl}/manifests/2/${image.id}.json`,
            iiif3: `${baseUrl}/manifests/3/${image.id}.json`,
            variants: [
              {
                label: 'IIIF 3 with embedded annotation',
                href: `${baseUrl}/manifests/3/${image.id}/embedded-annotation.json`
              },
              {
                label: 'IIIF 3 with navPlace midpoint',
                href: `${baseUrl}/manifests/3/${image.id}/navplace-midpoint.json`
              },
              {
                label: 'IIIF 3 with navPlace bbox',
                href: `${baseUrl}/manifests/3/${image.id}/navplace-bbox.json`
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
    segments[5] === 'info.json'
  ) {
    const version = parseIiifVersion(segments[2])
    const image = getImage(segments[3])

    return jsonResponse(
      createBrokenInfoJson(request, corsMode, version, image, segments[4]),
      corsMode
    )
  }

  if (
    segments[0] === 'iiif' &&
    segments.length === 4 &&
    segments[3] === 'info.json'
  ) {
    const version = parseIiifVersion(segments[1])
    const image = getImage(segments[2])

    return jsonResponse(
      createInfoJson(request, corsMode, version, image),
      corsMode
    )
  }

  if (segments[0] === 'iiif' && segments.length === 7) {
    parseIiifVersion(segments[1])

    return createImageRequestResponse(
      corsMode,
      getImage(segments[2]),
      segments[3],
      segments[4],
      segments[5],
      segments[6].replace(/\.(jpg|jpeg|png|webp)$/, ''),
      segments[6]
    )
  }

  if (
    segments[0] === 'errors' &&
    segments[1] === 'annotations' &&
    segments[2] === 'images'
  ) {
    const { imageId, variant } = parseVariantJsonFilename(
      segments.slice(3).join('/')
    )
    const image = getImage(imageId)
    const annotation = JSON.parse(await readFile(image.annotationPath, 'utf8'))

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
    return jsonResponse(
      createCombinedAnnotation(
        request,
        corsMode,
        parseJsonFilename(segments[2])
      ),
      corsMode
    )
  }

  if (segments[0] === 'annotations' && segments[1] === 'images') {
    const image = getImage(parseJsonFilename(segments[2]))
    const annotation = JSON.parse(await readFile(image.annotationPath, 'utf8'))

    return jsonResponse(
      localizeFixtureUrls(annotation, getBaseUrl(request, corsMode)),
      corsMode
    )
  }

  if (segments[0] === 'manifests' && segments[1] === '2') {
    const path = segments.slice(2).join('/')
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

    return jsonResponse(
      createIiif2Manifest(request, corsMode, image, variant),
      corsMode
    )
  }

  if (segments[0] === 'manifests' && segments[1] === '3') {
    const path = segments.slice(2).join('/')

    if (path === 'combined/embedded-annotations.json') {
      return jsonResponse(
        createCombinedIiif3Manifest(request, corsMode),
        corsMode
      )
    }

    const { imageId, variant } = path.includes('/')
      ? parseVariantJsonFilename(path)
      : { imageId: parseJsonFilename(path), variant: 'default' }
    const image = getImage(imageId)

    if (!image.hasManifest) {
      return textResponse('No manifest for image', corsMode, 404)
    }

    if (!isIiif3ManifestVariant(variant)) {
      return textResponse('Unknown manifest variant', corsMode, 404)
    }

    return jsonResponse(
      createIiif3Manifest(request, corsMode, image, variant),
      corsMode
    )
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
