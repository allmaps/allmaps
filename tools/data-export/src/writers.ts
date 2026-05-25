import { createWriteStream } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
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
import { getTileBand } from './tile-bands.ts'

import type { ApiMap } from '@allmaps/api-shared/types'
import type { Writable } from 'node:stream'

type DataExportWritersOptions = {
  outputDirectory: string
  includeDomainCounts?: boolean
}

type DataExportFile = {
  filename: string
  size: number
}

export type DataExportWriters = {
  close: () => Promise<void>
  writeMap: (map: ApiMap) => Promise<void>
}

const dataExportFilenames = [
  'maps.json',
  'maps.ndjson',
  'maps.geojson',
  'maps.geojsonl',
  'maps-flattened.geojson',
  'annotations.json'
]

const dataExportDomainCountFilenames = ['domains-counted.json']

export async function createDataExportWriters({
  outputDirectory,
  includeDomainCounts = true
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

      if (includeDomainCounts) {
        addMapDomain(domainCounts, map)
      }

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

      if (includeDomainCounts) {
        await writeFile(
          join(outputDirectory, 'domains-counted.json'),
          `${JSON.stringify(serializeDomainCounts(domainCounts), null, 2)}\n`
        )
      }

      await writeFilesManifest(outputDirectory, includeDomainCounts)
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
  const tileBand = getTileBand(map._allmaps?.area)

  return {
    type: 'Feature',
    tippecanoe: {
      layer: tileBand.layer,
      minzoom: tileBand.minzoom,
      maxzoom: tileBand.maxzoom
    },
    properties: {
      mapId: getLastPathPart(mapUrl),
      tileBand: tileBand.id,
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

async function writeFilesManifest(
  outputDirectory: string,
  includeDomainCounts: boolean
) {
  const filenames = includeDomainCounts
    ? [...dataExportFilenames, ...dataExportDomainCountFilenames]
    : dataExportFilenames

  const files: DataExportFile[] = await Promise.all(
    filenames.map(async (filename) => ({
      filename,
      size: (await stat(join(outputDirectory, filename))).size
    }))
  )

  await writeFile(
    join(outputDirectory, 'files.json'),
    `${JSON.stringify({ files }, null, 2)}\n`
  )
}
