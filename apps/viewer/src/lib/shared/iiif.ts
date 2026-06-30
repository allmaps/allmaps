import { parseLanguageString } from '@allmaps/iiif-inspector'

import type { GeoreferencedMap, PartOf, PartOfItem } from '@allmaps/annotation'

type PartOfItemWithParent = PartOfItem & {
  parent?: PartOfItem
}

function findPartOfItems(
  partOf: PartOf,
  type: string,
  parent?: PartOfItem
): PartOfItemWithParent[] {
  const items: PartOfItemWithParent[] = []

  if (partOf) {
    partOf.forEach((item) => {
      if (item.type === type) {
        items.push({ ...item, parent })
      }

      if (item.partOf) {
        items.push(...findPartOfItems(item.partOf, type, item))
      }
    })
  }

  return items
}

export function findCanvases(partOf: PartOf) {
  return findPartOfItems(partOf, 'Canvas')
}

export function findManifests(partOf: PartOf) {
  return findPartOfItems(partOf, 'Manifest')
}

export function labelFromPartOfItem(item: PartOfItem) {
  if (item.label) {
    return parseLanguageString(item.label)
  }
}

function normalizeIiifResourceId(id: string) {
  return id.replace(/\/info\.json$/, '').replace(/\/$/, '')
}

function isImageServiceCanvas(map: GeoreferencedMap, canvas: PartOfItem) {
  return (
    normalizeIiifResourceId(canvas.id) ===
    normalizeIiifResourceId(map.resource.id)
  )
}

export function getCanonicalCanvas(map: GeoreferencedMap) {
  const canvases = findCanvases(map.resource.partOf ?? [])

  return (
    canvases.find((canvas) => !isImageServiceCanvas(map, canvas)) ?? canvases[0]
  )
}

export function getCanonicalManifest(map: GeoreferencedMap) {
  const canvas = getCanonicalCanvas(map)
  const manifests = findManifests(canvas?.partOf ?? [])

  if (manifests.length > 0) {
    return manifests[0]
  }

  return findManifests(map.resource.partOf ?? [])[0]
}
