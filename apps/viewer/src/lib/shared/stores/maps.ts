import { writable, derived } from 'svelte/store'

import { generateChecksum } from '@allmaps/id/browser'
import { parseAnnotation } from '@allmaps/annotation'

import type { SourceMap } from '$lib/shared/types.js'

type SourceMaps = Map<string, SourceMap>

const mapsStore = writable<SourceMaps>(new Map())

export async function addAnnotation(sourceId: string, json: any) {
  const maps = parseAnnotation(json)

  let mapIds: string[] = []

  if (maps.length) {
    let newSourceMaps: SourceMap[] = []

    for (let [index, map] of maps.entries()) {
      const mapId = map.id || (await generateChecksum(map))

      const sourceMap: SourceMap = {
        sourceId,
        mapId,
        map,
        order: index
      }

      newSourceMaps.push(sourceMap)
      mapIds.push(mapId)
    }

    mapsStore.update((sourceMaps) => {
      for (let sourceMap of newSourceMaps) {
        sourceMaps.set(sourceMap.mapId, sourceMap)
      }

      return sourceMaps
    })
  }

  return mapIds
}

export function removeAnnotation(sourceId: string) {
  console.log('removeAnnotation', sourceId)
  mapsStore.update((sourceMaps) => {
    for (let [id, map] of sourceMaps.entries()) {
      if (map.sourceId === sourceId) {
        sourceMaps.delete(id)
      }
    }

    return sourceMaps
  })
}

export const mapIds = derived(mapsStore, (maps) => maps.keys())

export const mapsById = { subscribe: mapsStore.subscribe }

export const maps = derived(mapsStore, (maps) => maps.values())

export const mapCount = derived(mapsStore, (maps) => maps.size)
