import type { LanguageString } from '@allmaps/iiif-parser'
import type { GeoreferencedMap, PartOf, PartOfItem } from '@allmaps/annotation'

import type { OrganizationSummary, SourceLabels } from '$lib/types/shared.js'

const DOMINANT_ORGANIZATION_THRESHOLD = 0.6

function countManifestsById(
  maps: GeoreferencedMap[]
): Map<string, { count: number; label: LanguageString }> {
  const manifestCounts = new Map<
    string,
    { count: number; label: LanguageString }
  >()
  for (const map of maps) {
    for (const partOfItem of flattenPartOf(map.resource.partOf)) {
      if (partOfItem.type === 'Manifest' && partOfItem.id) {
        const key = partOfItem.id
        const label = partOfItem.label
        if (label) {
          if (manifestCounts.has(key)) {
            manifestCounts.get(key)!.count++
          } else {
            manifestCounts.set(key, { count: 1, label })
          }
        }
      }
    }
  }
  return manifestCounts
}

export function* flattenPartOf(partOf?: PartOf): Generator<PartOfItem> {
  if (partOf) {
    for (const partOfItem of partOf) {
      yield partOfItem
      if (partOfItem.partOf) {
        yield* flattenPartOf(partOfItem.partOf)
      }
    }
  }
}

function getPartOfItemsByMapId(maps: GeoreferencedMap[]) {
  const partOfItemsByMapId: Map<string, PartOfItem[]> = new Map()

  for (const map of maps) {
    const partOfs = [...flattenPartOf(map.resource.partOf)]
    if (map.id) {
      partOfItemsByMapId.set(map.id, partOfs)
    }
  }

  return partOfItemsByMapId
}

function findFirstParfOfItemOfType(
  partOfItems: PartOfItem[],
  type: string
): PartOfItem | undefined {
  return partOfItems.find((partOfItem) => partOfItem.type === type)
}

export function getSourceLabels(
  maps: GeoreferencedMap[],
  selectedMapId?: string
): SourceLabels {
  if (selectedMapId) {
    const partOfItemsByMapId = getPartOfItemsByMapId(maps)

    if (partOfItemsByMapId.has(selectedMapId)) {
      const partOfItems = partOfItemsByMapId.get(selectedMapId) || []

      return {
        manifest: findFirstParfOfItemOfType(partOfItems, 'Manifest')?.label,
        canvas: findFirstParfOfItemOfType(partOfItems, 'Canvas')?.label
      }
    }
  }

  // Find all manifest titles, sort by count,
  // if one, return that manifest label
  // if more, return manifest label with highest count
  const manifestCounts = countManifestsById(maps)
  if (manifestCounts.size === 0) {
    return { manifest: undefined, canvas: undefined }
  }
  // Convert to array and sort by count desc, then id asc
  const sorted = Array.from(manifestCounts.entries()).sort((a, b) => {
    if (b[1].count !== a[1].count) {
      return b[1].count - a[1].count
    }

    return a[0].localeCompare(b[0])
  })
  // Return label of manifest with highest count
  return { manifest: sorted[0][1].label, canvas: undefined }
}

export function getOrganizationSummary(
  maps: GeoreferencedMap[],
  selectedMapId?: string
): OrganizationSummary | undefined {
  if (selectedMapId) {
    const selectedMap = maps.find((map) => map.id === selectedMapId)
    if (selectedMap && selectedMap.resource.provider) {
      const provider = selectedMap.resource.provider[0]
      if (provider && provider.label) {
        return {
          organization: {
            label: provider.label,
            url: provider.homepage?.[0]?.id
          },
          otherOrganizationCount: 0
        }
      }
    }

    if (selectedMap) {
      return undefined
    }
  }

  // Find all unique organizations by label, count occurrences
  const organizationCounts = new Map<
    string,
    { count: number; label: LanguageString; url?: string }
  >()
  let mapsWithOrganization = 0

  for (const map of maps) {
    if (map.resource.provider) {
      const provider = map.resource.provider[0]
      if (provider && provider.label) {
        mapsWithOrganization++

        // Use a stringified version of the label as key
        const key = JSON.stringify(provider.label)
        const url = provider.homepage?.[0]?.id

        if (organizationCounts.has(key)) {
          organizationCounts.get(key)!.count++
        } else {
          organizationCounts.set(key, {
            count: 1,
            label: provider.label,
            url
          })
        }
      }
    }
  }

  if (organizationCounts.size === 0 || maps.length === 0) {
    return undefined
  }

  // Sort by count desc, then key asc
  const sorted = Array.from(organizationCounts.entries()).sort((a, b) => {
    if (b[1].count !== a[1].count) {
      return b[1].count - a[1].count
    }

    return a[0].localeCompare(b[0])
  })

  const topOrganization = sorted[0][1]

  if (organizationCounts.size === 1 && mapsWithOrganization === maps.length) {
    return {
      organization: {
        label: topOrganization.label,
        url: topOrganization.url
      },
      otherOrganizationCount: 0
    }
  }

  if (
    organizationCounts.size > 1 &&
    topOrganization.count / maps.length >= DOMINANT_ORGANIZATION_THRESHOLD
  ) {
    return {
      organization: {
        label: topOrganization.label,
        url: topOrganization.url
      },
      otherOrganizationCount: organizationCounts.size - 1
    }
  }
}
