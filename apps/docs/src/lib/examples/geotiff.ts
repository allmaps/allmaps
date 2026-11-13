import type { CodeFold } from '@allmaps/ui/code'
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
    resources.map(async (resource) => {
      const imageId = resource.id.replace(/\/+$/, '')
      const size = resource.type === 'ImageService3' ? 'max' : 'full'
      const quality = resource.type === 'ImageService1' ? 'native' : 'default'

      return {
        url: resource.id,
        downloadUrl:
          resource.type === 'Canvas'
            ? undefined
            : `${imageId}/full/${size}/0/${quality}.jpg`,
        filename: `${await generateId(resource.id)}.jpg`,
        width: resource.width,
        height: resource.height
      }
    })
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

export function generateSourceImageCommands(annotationUrl: string) {
  const quotedUrl = `'${annotationUrl.replaceAll("'", "'\\''")}'`
  const imageIds = `curl --fail --location ${quotedUrl} | \\\n  allmaps annotation image-ids`

  return {
    imageIds,
    download: `${imageIds} | \\\n  allmaps fetch full-image`,
    dezoomify: `${imageIds} | \\\n  allmaps script dezoomify > download-images.sh

bash download-images.sh`
  }
}
