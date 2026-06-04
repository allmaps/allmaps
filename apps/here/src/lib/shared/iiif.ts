import { parseLanguageString } from '@allmaps/iiif-inspector'
import type { PartOf, PartOfItem } from '@allmaps/annotation'

export { parseLanguageString } from '@allmaps/iiif-inspector'

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
