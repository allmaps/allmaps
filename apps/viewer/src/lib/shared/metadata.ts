import { parseLanguageString } from '@allmaps/iiif-inspector'
import type { LanguageString } from '@allmaps/iiif-parser'
import type { GeoreferencedMap, PartOf, PartOfItem } from '@allmaps/annotation'

import { getCanonicalCanvas, getCanonicalManifest } from '$lib/shared/iiif.js'

import type { OrganizationSummary, SourceLabels } from '$lib/types/shared.js'

const DOMINANT_ORGANIZATION_THRESHOLD = 0.6
const DOMINANT_MANIFEST_THRESHOLD = 0.8

function getMeaningfulLabel(label?: LanguageString) {
  const labelString = parseLanguageString(label, 'en')?.trim()

  if (!labelString || labelString === '-') {
    return undefined
  }

  return label
}

function countManifestsById(
  maps: GeoreferencedMap[]
): Map<string, { count: number; label: LanguageString }> {
  const manifestCounts = new Map<
    string,
    { count: number; label: LanguageString }
  >()
  for (const map of maps) {
    const manifest = getCanonicalManifest(map)

    if (manifest?.id && manifest.label) {
      const key = manifest.id

      if (manifestCounts.has(key)) {
        manifestCounts.get(key)!.count++
      } else {
        const label = getMeaningfulLabel(manifest.label)

        if (label) {
          manifestCounts.set(key, { count: 1, label })
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

export function getSourceLabels(
  maps: GeoreferencedMap[],
  selectedMapId?: string
): SourceLabels {
  if (selectedMapId) {
    const selectedMap = maps.find((map) => map.id === selectedMapId)

    if (selectedMap) {
      return {
        manifest: getMeaningfulLabel(getCanonicalManifest(selectedMap)?.label),
        canvas: getMeaningfulLabel(getCanonicalCanvas(selectedMap)?.label)
      }
    }
  }

  const manifestCounts = countManifestsById(maps)
  if (manifestCounts.size === 0) {
    return { manifest: undefined, canvas: undefined }
  }

  const sorted = Array.from(manifestCounts.entries()).sort((a, b) => {
    if (b[1].count !== a[1].count) {
      return b[1].count - a[1].count
    }

    return a[0].localeCompare(b[0])
  })

  if (sorted.length === 1) {
    return { manifest: sorted[0][1].label, canvas: undefined }
  }

  const dominantManifest = sorted[0][1]
  const otherMapCount = maps.length - dominantManifest.count

  if (
    maps.length > 0 &&
    otherMapCount > 0 &&
    dominantManifest.count / maps.length > DOMINANT_MANIFEST_THRESHOLD
  ) {
    return {
      manifest: dominantManifest.label,
      canvas: undefined,
      badge: `+ ${otherMapCount} other ${otherMapCount === 1 ? 'map' : 'maps'}`
    }
  }

  return {
    title: `${maps.length} georeferenced ${maps.length === 1 ? 'map' : 'maps'}`
  }
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
