import { generateId } from '@allmaps/id'

import type { Map } from '@allmaps/annotation'

export async function getUrls(map: Map) {
  const mapId = map.id
  const imageUri = map.resource.id
  const imageId = await generateId(imageUri)

  const annotationUrl = `https://annotations.allmaps.org/images/${imageId}`

  return {
    annotation: annotationUrl,
    viewer: `https://viewer.allmaps.org/?url=${encodeURIComponent(
      annotationUrl
    )}&map=${mapId}`,
    editor: `https://editor.allmaps.org/#/mask?url=${imageUri}/info.json`
  }
}
