import type { MapsMergedState } from '$lib/state/maps-merged.svelte.js'
import type { MapsState } from '$lib/state/maps.svelte.js'
import type { SourceState } from '$lib/state/source.svelte.js'

import { parseLanguageString } from '@allmaps/iiif-inspector'

import { getCompleteGcps } from '$lib/shared/maps.js'
import { getTransformationGcpMinimum } from '$lib/shared/analyze.js'
import { truncate } from '$lib/shared/strings.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { DbMap3 } from '$lib/types/maps.js'

export type EditorMapGuideImageProgress = {
  imageId: string
  imageNumber: number
  imageLabel?: string
}

export type EditorMapGuideMapProgress = EditorMapGuideImageProgress & {
  mapId: string
  mapDisplayIndex: number
  completeGcpCount: number
  minimumGcpCount: number
}

type EditorMapGuideMapProgressWithState = EditorMapGuideMapProgress & {
  complete: boolean
}

export type EditorMapGuideProgress = {
  resourceLoaded: boolean
  imageCount: number
  mapCount: number
  activeImageMapCount: number
  activeImageHasMaps: boolean
  maskedMapCount: number
  georeferencedMapCount: number
  exportReadyMapCount: number
  imagesWithoutMaps: EditorMapGuideImageProgress[]
  imagesWithoutMasksCount: number
  mapsNeedingGeoreferencing: EditorMapGuideMapProgress[]
  mapsNeedingGeoreferencingCount: number
  exportReadyMaps: EditorMapGuideMapProgress[]
  exportReady: boolean
}

type GetEditorMapGuideProgressOptions = {
  sourceState: SourceState
  mapsState: MapsState
  mapsMergedState: MapsMergedState
  locale: string
}

function getDbMapGeoreferencingState(map: DbMap3) {
  const completeGcpCount = getCompleteGcps(map).length
  const minimumGcpCount = getTransformationGcpMinimum(map.transformation)

  return {
    completeGcpCount,
    minimumGcpCount,
    complete: completeGcpCount >= minimumGcpCount
  }
}

function getGeoreferencedMapGeoreferencingState(map: GeoreferencedMap) {
  const completeGcpCount = map.gcps.length
  const minimumGcpCount = getTransformationGcpMinimum(map.transformation)

  return {
    completeGcpCount,
    minimumGcpCount,
    complete: completeGcpCount >= minimumGcpCount
  }
}

function getMapDisplayIndex(index: number) {
  return index + 1
}

function getImageLabel(
  sourceState: SourceState,
  imageId: string,
  locale: string
) {
  const label = sourceState.getCanvasByImageId(imageId)?.label

  if (label) {
    return truncate(parseLanguageString(label, locale))
  }
}

export function getEditorMapGuideProgress({
  sourceState,
  mapsState,
  mapsMergedState,
  locale
}: GetEditorMapGuideProgressOptions): EditorMapGuideProgress {
  const resourceLoaded = Boolean(sourceState.source && !sourceState.fetching)
  const imageCount = sourceState.imageCount
  const imageIds = [...sourceState.images].map((image) => image.uri)
  const imageNumbersById = new Map(
    imageIds.map((imageId, index) => [imageId, index + 1])
  )
  const activeImageId = sourceState.activeImageId
  const activeMaps =
    activeImageId && mapsState.connectedImageId === activeImageId
      ? mapsState.maps
      : []
  const mergedMapsByImageId = mapsMergedState.mapsByImageId
  const activeImageStoredMaps =
    activeImageId && mapsState.connectedImageId !== activeImageId
      ? mergedMapsByImageId[activeImageId] || []
      : []
  const activeImageMapCount = activeMaps.length + activeImageStoredMaps.length
  const mapsByImageId = { ...mergedMapsByImageId }

  if (activeImageId && mapsState.connectedImageId === activeImageId) {
    delete mapsByImageId[activeImageId]
  }

  const inactiveMapsByImageId = Object.entries(mapsByImageId)
  const inactiveMaps = Object.values(mapsByImageId).flat()
  const activeMapProgress: EditorMapGuideMapProgressWithState[] = activeImageId
    ? activeMaps.map((map, index) => {
        const georeferencingState = getDbMapGeoreferencingState(map)

        return {
          imageId: activeImageId,
          imageNumber: imageNumbersById.get(activeImageId) ?? 1,
          imageLabel: getImageLabel(sourceState, activeImageId, locale),
          mapId: map.id,
          mapDisplayIndex: getMapDisplayIndex(index),
          ...georeferencingState
        }
      })
    : []
  const inactiveMapProgress: EditorMapGuideMapProgressWithState[] =
    inactiveMapsByImageId.flatMap(([imageId, maps]) =>
      maps.flatMap((map, index) => {
        if (!map.id) {
          return []
        }

        const georeferencingState = getGeoreferencedMapGeoreferencingState(map)

        return [
          {
            imageId,
            imageNumber: imageNumbersById.get(imageId) ?? 1,
            imageLabel: getImageLabel(sourceState, imageId, locale),
            mapId: map.id,
            mapDisplayIndex: getMapDisplayIndex(index),
            ...georeferencingState
          }
        ]
      })
    )
  const mapProgress = [...inactiveMapProgress, ...activeMapProgress]
  const imagesWithoutMaps = imageIds
    .filter((imageId) => {
      if (imageId === activeImageId && mapsState.connectedImageId === imageId) {
        return activeMaps.length === 0
      }

      return !mergedMapsByImageId[imageId]?.length
    })
    .map((imageId) => ({
      imageId,
      imageNumber: imageNumbersById.get(imageId) ?? 1,
      imageLabel: getImageLabel(sourceState, imageId, locale)
    }))
  const mapsNeedingGeoreferencing = mapProgress
    .filter((map) => !map.complete)
    .map(({ complete, ...map }) => map)
  const exportReadyMaps = mapProgress
    .filter((map) => map.complete)
    .map(({ complete, ...map }) => map)
  const mapCount = inactiveMaps.length + activeMaps.length
  const georeferencedMapCount =
    inactiveMaps.filter(
      (map: GeoreferencedMap) =>
        getGeoreferencedMapGeoreferencingState(map).complete
    ).length +
    activeMaps.filter((map) => getDbMapGeoreferencingState(map).complete).length
  const exportReadyMapCount = georeferencedMapCount
  const imagesWithoutMasksCount = imagesWithoutMaps.length
  const mapsNeedingGeoreferencingCount = mapsNeedingGeoreferencing.length

  return {
    resourceLoaded,
    imageCount,
    mapCount,
    activeImageMapCount,
    activeImageHasMaps: activeImageMapCount > 0,
    maskedMapCount: mapCount,
    georeferencedMapCount,
    exportReadyMapCount,
    imagesWithoutMaps,
    imagesWithoutMasksCount,
    mapsNeedingGeoreferencing,
    mapsNeedingGeoreferencingCount,
    exportReadyMaps,
    exportReady: exportReadyMapCount > 0
  }
}
