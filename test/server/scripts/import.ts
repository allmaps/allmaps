#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import sharp from 'sharp'

import { generateId } from '@allmaps/id/sync'

import {
  getFixtureDirectory,
  getFixtureMetadataPath,
  type ImageFixtureMetadata
} from '../src/lib/fixtures.ts'

// IIIF and Allmaps annotation inputs are arbitrary JSON documents.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>

type ImportOptions = {
  input: string
  id?: string
  label?: string
}

type SourceImage = {
  serviceId: string
  width?: number
  height?: number
  provider?: unknown
  manifestUrl?: string
  label?: string
}

const localBaseUrl = 'http://localhost:5506/cors'
const targetWidth = 2500

function parseArguments(args: string[]): ImportOptions {
  const options: Partial<ImportOptions> = {}

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === '--id') {
      options.id = args[index + 1]
      index += 1
    } else if (argument === '--label') {
      options.label = args[index + 1]
      index += 1
    } else if (!options.input) {
      options.input = argument
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  if (!options.input) {
    throw new Error(
      [
        'Usage:',
        '  pnpm --filter @allmaps/test-iiif-server import -- <annotation-url-or-file>',
        '',
        'Options:',
        '  --id <image-id>       Override the fixture directory/id',
        '  --label <label>       Override the fixture label'
      ].join('\n')
    )
  }

  return options as ImportOptions
}

function isUrl(value: string) {
  return /^https?:\/\//.test(value)
}

function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function cloneJsonObject(value: unknown): JsonObject {
  if (isJsonObject(value)) {
    return structuredClone(value)
  }

  return {}
}

async function fetchBytes(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function fetchJson(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Could not fetch ${url}: ${response.status}`)
  }

  return response.json()
}

async function readInputJson(input: string) {
  if (isUrl(input)) {
    return fetchJson(input)
  }

  return JSON.parse(await readFile(input, 'utf8'))
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function getNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function getLabel(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (!isJsonObject(value)) {
    return undefined
  }

  for (const language of ['none', 'en', 'nl']) {
    const strings = value[language]

    if (Array.isArray(strings) && typeof strings[0] === 'string') {
      return strings[0]
    }
  }

  for (const strings of Object.values(value)) {
    if (Array.isArray(strings) && typeof strings[0] === 'string') {
      return strings[0]
    }
  }

  return undefined
}

function getType(value: JsonObject) {
  return getString(value.type ?? value['@type'])
}

function getId(value: unknown) {
  if (!isJsonObject(value)) {
    return undefined
  }

  return getString(value.id ?? value['@id'])
}

function findManifestUrl(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const manifestUrl = findManifestUrl(item)

      if (manifestUrl) {
        return manifestUrl
      }
    }
  } else if (isJsonObject(value)) {
    const id = getId(value)
    const type = getType(value)

    if (
      id &&
      (type === 'Manifest' ||
        type === 'sc:Manifest' ||
        /\/manifest(?:\.json)?$/.test(id))
    ) {
      return id
    }

    return findManifestUrl(value.partOf)
  }

  return undefined
}

function findPartOfLabel(value: unknown, type?: string): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const label = findPartOfLabel(item, type)

      if (label) {
        return label
      }
    }
  } else if (isJsonObject(value)) {
    const currentType = getType(value)
    const label = getLabel(value.label)

    if (label && (!type || currentType === type)) {
      return label
    }

    return findPartOfLabel(value.partOf, type)
  }

  return undefined
}

function getManifestLabel(manifest: unknown): string | undefined {
  if (!isJsonObject(manifest)) {
    return undefined
  }

  return (
    getLabel(manifest.label) ??
    getLabel(manifest.sequences?.[0]?.canvases?.[0]?.label) ??
    getLabel(manifest.items?.[0]?.label)
  )
}

function getMaps(annotation: unknown) {
  if (!isJsonObject(annotation)) {
    throw new Error('Annotation input must be a JSON object')
  }

  if (Array.isArray(annotation.items)) {
    const maps = annotation.items.filter(isJsonObject)

    if (maps.length > 0) {
      return maps
    }
  }

  if (
    annotation.type === 'Annotation' ||
    annotation['@type'] === 'oa:Annotation'
  ) {
    return [annotation]
  }

  throw new Error('Could not find a georeference annotation item')
}

function getSourceFromMap(map: JsonObject) {
  const target = cloneJsonObject(map.target)
  const source = cloneJsonObject(target.source)

  if (!source.id && !source['@id']) {
    throw new Error('The first map does not contain target.source.id')
  }

  return source
}

function findImageServiceInManifest(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const serviceId = findImageServiceInManifest(item)

      if (serviceId) {
        return serviceId
      }
    }
  } else if (isJsonObject(value)) {
    const type = getType(value)
    const id = getId(value)

    if (
      id &&
      (type === 'ImageService1' ||
        type === 'ImageService2' ||
        type === 'ImageService3')
    ) {
      return id
    }

    return findImageServiceInManifest(Object.values(value))
  }

  return undefined
}

async function getSourceImage(source: JsonObject): Promise<SourceImage> {
  const sourceId = getId(source)
  const sourceType = getType(source)
  const manifestUrl = findManifestUrl(source.partOf)

  if (!sourceId) {
    throw new Error('Source has no id')
  }

  if (
    sourceType === 'ImageService1' ||
    sourceType === 'ImageService2' ||
    sourceType === 'ImageService3'
  ) {
    return {
      serviceId: sourceId,
      width: getNumber(source.width),
      height: getNumber(source.height),
      provider: source.provider,
      manifestUrl,
      label: getLabel(source.label)
    }
  }

  if (sourceType === 'Canvas' && manifestUrl) {
    const manifest = await fetchJson(manifestUrl)
    const serviceId = findImageServiceInManifest(manifest)

    if (serviceId) {
      return {
        serviceId,
        width: getNumber(source.width),
        height: getNumber(source.height),
        provider: source.provider,
        manifestUrl,
        label: getLabel(source.label)
      }
    }
  }

  throw new Error(`Unsupported source type: ${sourceType ?? 'unknown'}`)
}

async function getImageServiceDimensions(sourceImage: SourceImage) {
  if (sourceImage.width && sourceImage.height) {
    return {
      width: sourceImage.width,
      height: sourceImage.height
    }
  }

  const infoJson = await fetchJson(`${sourceImage.serviceId}/info.json`)

  return {
    width: getNumber(infoJson.width),
    height: getNumber(infoJson.height)
  }
}

function getFirstImageAnnotationId(annotation: unknown) {
  if (isJsonObject(annotation)) {
    const annotationId = getId(annotation)
    const match = annotationId?.match(/\/images\/([^/@.]+)(?:\.json)?/)

    if (match) {
      return match[1]
    }
  }

  return undefined
}

function getAllmapsImageId(map: JsonObject) {
  const imageId = getId(map.body?._allmaps?.image)
  const match = imageId?.match(/\/images\/([^/@.]+)(?:\.json)?/)

  return match?.[1]
}

function getMapId(map: JsonObject, imageId: string) {
  const mapId = getId(map)
  const match = mapId?.match(/\/maps\/([^/@.]+)(?:\.json)?/)

  return match?.[1] ?? imageId
}

function getGeneratedImageId(
  annotation: unknown,
  map: JsonObject,
  serviceId: string
) {
  return (
    getFirstImageAnnotationId(annotation) ??
    getAllmapsImageId(map) ??
    generateId(serviceId)
  )
}

function getProviderLabel(provider: unknown): string | undefined {
  if (!Array.isArray(provider)) {
    return undefined
  }

  return provider.map((item) => getLabel(item?.label)).find(Boolean)
}

function getProviderHomepage(provider: unknown): string | undefined {
  if (!Array.isArray(provider)) {
    return undefined
  }

  for (const item of provider) {
    const homepage = item?.homepage

    if (Array.isArray(homepage)) {
      const id = getId(homepage[0])

      if (id) {
        return id
      }
    }
  }

  return undefined
}

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString()
}

function scalePointList(pointList: string, scaleX: number, scaleY: number) {
  const numbers = pointList
    .trim()
    .split(/[,\s]+/)
    .map((value) => Number(value))

  if (numbers.some((number) => !Number.isFinite(number))) {
    return pointList
  }

  const points: string[] = []

  for (let index = 0; index < numbers.length; index += 2) {
    points.push(
      `${formatNumber(numbers[index] * scaleX)},${formatNumber(
        numbers[index + 1] * scaleY
      )}`
    )
  }

  return points.join(' ')
}

function scaleSvgSelectorValue(
  svg: string,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number
) {
  return svg
    .replace(/<svg\b[^>]*>/, `<svg width="${width}" height="${height}">`)
    .replace(/points="([^"]+)"/g, (_match, pointList: string) => {
      return `points="${scalePointList(pointList, scaleX, scaleY)}"`
    })
}

function scaleCoordinatePair(
  value: unknown,
  scaleX: number,
  scaleY: number
): unknown {
  if (Array.isArray(value)) {
    if (
      value.length === 2 &&
      typeof value[0] === 'number' &&
      typeof value[1] === 'number'
    ) {
      return [
        Number((value[0] * scaleX).toFixed(3)),
        Number((value[1] * scaleY).toFixed(3))
      ]
    }

    return value.map((item) => scaleCoordinatePair(item, scaleX, scaleY))
  }

  return value
}

function scaleResourceCoordinates(
  value: unknown,
  scaleX: number,
  scaleY: number
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => scaleResourceCoordinates(item, scaleX, scaleY))
  }

  if (isJsonObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (key === 'resourceCoords') {
          return [key, scaleCoordinatePair(item, scaleX, scaleY)]
        }

        return [key, scaleResourceCoordinates(item, scaleX, scaleY)]
      })
    )
  }

  return value
}

function createLocalMap(
  map: JsonObject,
  sourceImage: SourceImage,
  imageId: string,
  label: string,
  imageLabel: string | undefined,
  manifestLabel: string | undefined,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
  hasManifest: boolean
) {
  const mapId = getMapId(map, imageId)
  const scaleX = width / originalWidth
  const scaleY = height / originalHeight
  const localMap = scaleResourceCoordinates(
    structuredClone(map),
    scaleX,
    scaleY
  ) as JsonObject
  const target = cloneJsonObject(localMap.target)
  const source = cloneJsonObject(target.source)
  const selector = cloneJsonObject(target.selector)

  if (typeof selector.value === 'string') {
    selector.value = scaleSvgSelectorValue(
      selector.value,
      width,
      height,
      scaleX,
      scaleY
    )
  }

  const localSource: JsonObject = {
    ...source,
    id: `${localBaseUrl}/iiif/2/${imageId}`,
    type: 'ImageService2',
    width,
    height,
    provider: sourceImage.provider ?? source.provider
  }

  if (hasManifest) {
    const localCanvasLabel = imageLabel ?? label
    const localManifestLabel = manifestLabel ?? label

    localSource.partOf = [
      {
        id: `${localBaseUrl}/manifests/2/${imageId}.json/canvas/1`,
        type: 'Canvas',
        label: {
          none: [localCanvasLabel]
        },
        partOf: [
          {
            id: `${localBaseUrl}/manifests/2/${imageId}.json`,
            type: 'Manifest',
            label: {
              none: [localManifestLabel]
            }
          }
        ]
      }
    ]
  } else {
    delete localSource.partOf
  }

  localMap.id = `${localBaseUrl}/annotations/maps/${mapId}.json`
  localMap.target = {
    ...target,
    source: localSource,
    selector
  }

  if (isJsonObject(localMap.body?._allmaps)) {
    localMap.body._allmaps = {
      ...localMap.body._allmaps,
      id: localMap.id,
      image: {
        ...cloneJsonObject(localMap.body._allmaps.image),
        id: `${localBaseUrl}/annotations/images/${imageId}.json`
      },
      scale: Number((originalWidth / width).toFixed(6))
    }
  }

  return localMap
}

function createLocalAnnotation(
  maps: JsonObject[],
  sourceImage: SourceImage,
  imageId: string,
  label: string,
  imageLabel: string | undefined,
  manifestLabel: string | undefined,
  width: number,
  height: number,
  originalWidth: number,
  originalHeight: number,
  hasManifest: boolean
) {
  return {
    id: `${localBaseUrl}/annotations/images/${imageId}.json`,
    type: 'AnnotationPage',
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    items: maps.map((map) =>
      createLocalMap(
        map,
        sourceImage,
        imageId,
        label,
        imageLabel,
        manifestLabel,
        width,
        height,
        originalWidth,
        originalHeight,
        hasManifest
      )
    )
  }
}

async function downloadManifest(manifestUrl: string | undefined) {
  if (!manifestUrl) {
    return undefined
  }

  try {
    return await fetchJson(manifestUrl)
  } catch (error) {
    console.warn(
      `Could not download manifest ${manifestUrl}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }

  return undefined
}

async function importAnnotation() {
  const options = parseArguments(process.argv.slice(2))
  const annotation = await readInputJson(options.input)
  const maps = getMaps(annotation)
  const map = maps[0]

  if (!map) {
    throw new Error('Could not find a georeference annotation item')
  }

  const source = getSourceFromMap(map)
  const sourceImage = await getSourceImage(source)
  const dimensions = await getImageServiceDimensions(sourceImage)

  if (!dimensions.width || !dimensions.height) {
    throw new Error('Could not determine original image dimensions')
  }

  const imageId =
    options.id ?? getGeneratedImageId(annotation, map, sourceImage.serviceId)
  const manifest = await downloadManifest(sourceImage.manifestUrl)
  const imageLabel =
    getLabel(map.label) ??
    getLabel(source.label) ??
    sourceImage.label ??
    findPartOfLabel(source.partOf, 'Canvas')
  const manifestLabel =
    findPartOfLabel(source.partOf, 'Manifest') ?? getManifestLabel(manifest)
  const label =
    (options.label ??
      [manifestLabel, imageLabel].filter(Boolean).join(' - ')) ||
    imageId
  const imageRequestUrl = `${sourceImage.serviceId}/full/${targetWidth},/0/default.jpg`
  const imageBytes = await fetchBytes(imageRequestUrl)
  const webpBuffer = await sharp(imageBytes)
    .resize({
      width: targetWidth,
      withoutEnlargement: true
    })
    .webp({
      quality: 60
    })
    .toBuffer()
  const imageMetadata = await sharp(webpBuffer).metadata()

  if (!imageMetadata.width || !imageMetadata.height) {
    throw new Error('Could not determine imported image dimensions')
  }

  const localAnnotation = createLocalAnnotation(
    maps,
    sourceImage,
    imageId,
    label,
    imageLabel,
    manifestLabel,
    imageMetadata.width,
    imageMetadata.height,
    dimensions.width,
    dimensions.height,
    Boolean(manifest)
  )
  const fixtureDirectory = getFixtureDirectory(imageId)
  const fixtureMetadata: ImageFixtureMetadata = {
    id: imageId,
    label,
    imageLabel,
    manifestLabel,
    width: imageMetadata.width,
    height: imageMetadata.height,
    originalWidth: dimensions.width,
    originalHeight: dimensions.height,
    originalAnnotationUrl: isUrl(options.input) ? options.input : undefined,
    originalManifestUrl: manifest ? sourceImage.manifestUrl : undefined,
    originalImageService: sourceImage.serviceId,
    originalImageRequest: imageRequestUrl,
    institution: getProviderLabel(sourceImage.provider ?? source.provider),
    institutionHomepage: getProviderHomepage(
      sourceImage.provider ?? source.provider
    )
  }

  await mkdir(fixtureDirectory, { recursive: true })
  await writeFile(join(fixtureDirectory, 'default.webp'), webpBuffer)
  await writeFile(
    join(fixtureDirectory, 'annotation.json'),
    `${JSON.stringify(localAnnotation, null, 2)}\n`
  )
  await writeFile(
    getFixtureMetadataPath(imageId),
    `${JSON.stringify(fixtureMetadata, null, 2)}\n`
  )

  if (manifest) {
    await writeFile(
      join(fixtureDirectory, 'original-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`
    )
  }

  console.log(`Imported ${imageId}`)
  console.log(`Image: ${join(fixtureDirectory, 'default.webp')}`)
  console.log(`Annotation: ${join(fixtureDirectory, 'annotation.json')}`)

  if (manifest) {
    console.log(`Manifest: ${join(fixtureDirectory, 'original-manifest.json')}`)
  }
}

try {
  await importAnnotation()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
