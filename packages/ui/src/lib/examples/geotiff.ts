import type { CodeFold } from '../code/types.js'
import { parseAnnotation } from '@allmaps/annotation'
import { generateId } from '@allmaps/id'
import { generateGeoreferencedMapsGeotiffScripts } from '@allmaps/io'

export async function generateGeotiffExample(annotation: unknown) {
  const maps = parseAnnotation(annotation)
  if (!maps.length) {
    throw new Error('This annotation does not contain any georeferenced maps.')
  }
  const resources = [
    ...new Map(maps.map((map) => [map.resource.id, map.resource])).values()
  ]
  const images = await Promise.all(
    resources.map(async (resource) => ({
      url: resource.id,
      filename: `${await generateId(resource.id)}.jpg`,
      width: resource.width,
      height: resource.height
    }))
  )
  const script = await generateGeoreferencedMapsGeotiffScripts(maps)
  const preambleEnd = script
    .split('\n')
    .findIndex((line) => line.startsWith('gdal_translate '))
  const folds: CodeFold[] =
    preambleEnd > 1
      ? [
          {
            startLine: 2,
            endLine: preambleEnd,
            label: 'Setup and source-image checks',
            collapsed: true
          }
        ]
      : []
  return { script, mapCount: maps.length, images, folds }
}
