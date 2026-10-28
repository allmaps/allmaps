import { generateId } from '@allmaps/id/sync'
import {
  IIIF,
  Collection,
  Manifest,
  type EmbeddedCollection,
  type EmbeddedManifest,
  type EmbeddedImage,
  type Image,
  type Canvas
} from '@allmaps/iiif-parser'

export type ResourceId = {
  type: string
  uri: string
  hash: string
  allmapsId: string
}

/** Read the IDs present in one IIIF document without fetching linked resources. */
export function getResourceIds(document: unknown): ResourceId[] {
  const resources = new Map<string, ResourceId>()

  function visit(
    resource:
      | Collection
      | EmbeddedCollection
      | Manifest
      | EmbeddedManifest
      | Canvas
      | Image
      | EmbeddedImage
  ) {
    const key = `${resource.type}:${resource.uri}`
    if (resources.has(key)) return

    const hash = generateId(resource.uri, 40)
    resources.set(key, {
      type: resource.type,
      uri: resource.uri,
      hash,
      allmapsId: hash.slice(0, 16)
    })

    if (resource instanceof Collection) {
      resource.items.forEach(visit)
    } else if (resource instanceof Manifest) {
      resource.canvases.forEach((canvas) => {
        visit(canvas)
        visit(canvas.image)
      })
    }
  }

  visit(IIIF.parse(document))
  return [...resources.values()]
}
