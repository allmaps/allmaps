import sharp from 'sharp'

import type { ImageFixtureDefinition as ImageFixture } from '../fixtures.ts'
import { getImageServiceId, cloneJsonObject } from '../paths.ts'
import { imageResponse } from '../responses.ts'
import type {
  CorsMode,
  IiifVersion,
  ImageComplianceLevel,
  JsonObject,
  Region,
  Size
} from '../types.ts'

export type Link = {
  label: string
  href: string
  version?: IiifVersion
  versionLabel?: string
  complianceLevel?: ImageComplianceLevel
  complianceLabel?: string
  group?: string
}

export type ImageApiService = {
  version: IiifVersion
  complianceLevel: ImageComplianceLevel
}

export type ImageServiceBehavior =
  | 'image-500'
  | 'service-500'
  | 'slow'
  | 'too-many-requests-after-20s'

export type ImageApiServiceReference = ImageApiService & {
  behavior?: ImageServiceBehavior
}

export const catalogImageComplianceLevels = ['level0', 'level2'] as const
export const catalogImageApiServices = (['2', '3'] as const).flatMap(
  (version) =>
    catalogImageComplianceLevels.map((complianceLevel) => ({
      version,
      complianceLevel
    }))
)

export function getImageApiVersionLabel(version: IiifVersion) {
  return version === '2' ? '2.1' : '3.0'
}

export function getImageApiLabel(version: IiifVersion) {
  return `IIIF Image API ${getImageApiVersionLabel(version)}`
}

export function createImageApiLink(
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

export function isImageComplianceLevel(
  value: string
): value is ImageComplianceLevel {
  return value === 'level0' || value === 'level1' || value === 'level2'
}

export function getIiif2Profile(complianceLevel: ImageComplianceLevel) {
  return `http://iiif.io/api/image/2/${complianceLevel}.json`
}

export function getImageServiceProfile(
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel
) {
  return version === '2' ? getIiif2Profile(complianceLevel) : complianceLevel
}

export function getImageServiceType(version: IiifVersion) {
  return version === '2' ? 'ImageService2' : 'ImageService3'
}

export function getWrongImageServiceType(version: IiifVersion) {
  return version === '2' ? 'ImageService3' : 'ImageService2'
}

export function getManifestImageRequest(
  imageServiceId: string,
  imageApiVersion: IiifVersion
) {
  const imagePathSize = imageApiVersion === '2' ? 'full' : 'max'

  return `${imageServiceId}/full/${imagePathSize}/0/default.jpg`
}

export function getManifestImageBodyDimensions(image: ImageFixture) {
  return {
    width: image.width,
    height: image.height
  }
}

export function parseNumber(value: string, name: string) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw new Error(`Invalid ${name}: ${value}`)
  }

  return number
}

export function parsePositiveNumber(value: string, name: string) {
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

export function getTiles(image: ImageFixture) {
  return [
    {
      width: 512,
      height: 512,
      scaleFactors: getScaleFactors(image)
    }
  ]
}

export function createInfoJson(
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

export function createBrokenInfoJson(
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

export async function createImageRequestResponse(
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

export function getImageServiceBaseUrl(
  baseUrl: string,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  imageId: string,
  behavior?: ImageServiceBehavior
) {
  return `${baseUrl}/iiif/${version}/${complianceLevel}/${imageId}${behavior ? `/${behavior}` : ''}`
}

export function getLevel0TileExample(
  image: ImageFixture,
  imageServiceUrl: string
) {
  const tile = getTiles(image)[0]
  const width = Math.min(tile.width, image.width)
  const height = Math.min(tile.height, image.height)

  return `${imageServiceUrl}/0,0,${width},${height}/${width},/0/default.jpg`
}

export function getImageRequestExamples(
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
