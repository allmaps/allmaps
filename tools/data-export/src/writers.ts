import { createWriteStream } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { once } from 'node:events'

import { generateAnnotation } from '@allmaps/annotation'
import { generateFeature } from '@allmaps/api-shared'

import {
  addMapDomain,
  getDomain,
  serializeDomainCounts,
  type DomainCounts
} from './domains.ts'

import type { ApiMap } from '@allmaps/api-shared/types'
import type { Writable } from 'node:stream'

type DataExportWritersOptions = {
  outputDirectory: string
}

export type DataExportWriters = {
  close: () => Promise<void>
  writeMap: (map: ApiMap) => Promise<void>
}

export async function createDataExportWriters({
  outputDirectory
}: DataExportWritersOptions): Promise<DataExportWriters> {
  await mkdir(outputDirectory, { recursive: true })

  const mapsJson = createWriteStream(join(outputDirectory, 'maps.json'))
  const mapsNdjson = createWriteStream(join(outputDirectory, 'maps.ndjson'))
  const mapsGeojson = createWriteStream(join(outputDirectory, 'maps.geojson'))
  const mapsGeojsonl = createWriteStream(join(outputDirectory, 'maps.geojsonl'))
  const mapsFlattenedGeojson = createWriteStream(
    join(outputDirectory, 'maps-flattened.geojson')
  )
  const annotationsJson = createWriteStream(
    join(outputDirectory, 'annotations.json')
  )

  const domainCounts: DomainCounts = new Map()
  let isFirstMap = true

  await write(mapsJson, '[')
  await write(mapsGeojson, '{"type":"FeatureCollection","features":[')
  await write(mapsFlattenedGeojson, '{"type":"FeatureCollection","features":[')
  await write(
    annotationsJson,
    '{"@context":"http://www.w3.org/ns/anno.jsonld","type":"AnnotationPage","items":['
  )

  return {
    async writeMap(map) {
      const separator = isFirstMap ? '' : ','
      const annotation = generateAnnotation(map)

      addMapDomain(domainCounts, map)

      await write(mapsJson, `${separator}${JSON.stringify(map)}`)
      await write(mapsNdjson, `${JSON.stringify(map)}\n`)
      await write(
        mapsGeojson,
        `${separator}${JSON.stringify(generateFeature(map))}`
      )
      await write(mapsGeojsonl, `${JSON.stringify(generateFeature(map))}\n`)
      await write(
        mapsFlattenedGeojson,
        `${separator}${JSON.stringify(generateFlattenedFeature(map))}`
      )
      await write(annotationsJson, `${separator}${JSON.stringify(annotation)}`)

      isFirstMap = false
    },
    async close() {
      await write(mapsJson, ']')
      await write(mapsGeojson, ']}')
      await write(mapsFlattenedGeojson, ']}')
      await write(annotationsJson, ']}')

      await Promise.all([
        close(mapsJson),
        close(mapsNdjson),
        close(mapsGeojson),
        close(mapsGeojsonl),
        close(mapsFlattenedGeojson),
        close(annotationsJson)
      ])

      await writeFile(
        join(outputDirectory, 'domains-counted.json'),
        `${JSON.stringify(serializeDomainCounts(domainCounts), null, 2)}\n`
      )
    }
  }
}

async function write(stream: Writable, chunk: string) {
  if (!stream.write(chunk)) {
    await once(stream, 'drain')
  }
}

async function close(stream: Writable) {
  stream.end()
  await once(stream, 'finish')
}

function generateFlattenedFeature(map: ApiMap) {
  const feature = generateFeature(map)
  const mapUrl = getRequiredString(map._allmaps?.id ?? map.id, 'map id')
  const modified = getRequiredString(map.modified, 'map modified date')

  return {
    type: 'Feature',
    properties: {
      mapId: getLastPathPart(mapUrl),
      modified: Math.floor(Date.parse(modified) / 1000),
      id: mapUrl,
      scale: map._allmaps?.scale,
      area: map._allmaps?.area,
      resourceId: map.resource.id,
      resourceType: map.resource.type,
      resourceWidth: map.resource.width,
      resourceHeight: map.resource.height,
      imageServiceDomain: getDomain(map.resource.id)
    },
    geometry: feature.geometry
  }
}

function getRequiredString(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name}`)
  }

  return value
}

function getLastPathPart(url: string) {
  try {
    const parsedUrl = new URL(url)
    const pathParts = parsedUrl.pathname.split('/').filter(Boolean)

    return pathParts.at(-1) ?? url
  } catch {
    return url
  }
}
