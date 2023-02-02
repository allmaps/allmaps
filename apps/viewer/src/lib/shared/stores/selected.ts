import {
  readable,
  writable,
  derived,
  get,
  type Writable,
  type Readable
} from 'svelte/store'

import { mapsById as mapsByIdStore } from '$lib/shared/stores/maps.js'

import type { SelectedMap } from '$lib/shared/types.js'

const selectedMapsStore = writable<Map<string, Writable<SelectedMap>>>(
  new Map()
)

mapsByIdStore.subscribe((mapsById) => {
  selectedMapsStore.update((selectedMaps) => {
    // Remove mapIds that no longer exist from selectedMapIds
    for (let selectedMapId of selectedMaps.keys()) {
      if (!mapsById.has(selectedMapId)) {
        selectedMaps.delete(selectedMapId)
      }
    }

    // Add new mapIds to selectedMapIdsStore
    // and set as not selected
    for (let mapId of mapsById.keys()) {
      if (!selectedMaps.has(mapId)) {
        const sourceMap = mapsById.get(mapId)

        if (sourceMap) {
          const newSelectedMap: SelectedMap = {
            mapId,
            sourceId: sourceMap.sourceId,
            selected: false,
            highlighted: false,
            order: sourceMap.order
          }

          selectedMaps.set(mapId, writable(newSelectedMap))
        }
      }
    }

    return selectedMaps
  })
})

export function setSelectedMapIds(selectedMapIds: Iterable<string>) {
  selectedMapsStore.update((selectedMaps) => {
    let selectedMapIdsSet: Set<string> = new Set()

    for (let selectedMapId of selectedMapIds) {
      const selectedMapStore = selectedMaps.get(selectedMapId)
      if (selectedMapStore) {
        // TODO: create function to set selected
        selectedMapStore.update((selectedMap) => ({
          ...selectedMap,
          selected: true
        }))
      }

      selectedMapIdsSet.add(selectedMapId)
    }

    for (let mapId of selectedMaps.keys()) {
      if (!selectedMapIdsSet.has(mapId)) {
        const selectedMapStore = selectedMaps.get(mapId)
        if (selectedMapStore) {
          // TODO: create function to set unselected
          selectedMapStore.update((selectedMap) => ({
            ...selectedMap,
            selected: false
          }))
        }
      }
    }

    // selectedMapIdsStore.set(new Set(selectedMapIds))
    return selectedMaps
  })
}

export const highlightedMapIndex = writable<number>(0)

export function highlightPrevMap() {}

export function highlightNextMap() {}

export const selectedMapsById = { subscribe: selectedMapsStore.subscribe }

export const selectedMapStores: Readable<Writable<SelectedMap>[]> = derived(
  selectedMapsById,
  ($selectedMapsById) => [...$selectedMapsById.values()]
)

export const selectedMaps = derived(
  [...get(selectedMapStores)],
  ([...$selectedMaps]) => $selectedMaps
)

// selectedMapStores.subscribe((a) => {
//   console.log('selectedMaps', a)
// })

// function createSelectedMapCountStore(selectedMaps: Readable<SelectedMap[]>) {
//   return derived(selectedMaps, (selectMaps) => {
//     console.log('vis')
//     return selectMaps.filter((selectedMap) => selectedMap.selected).length
//   })
// }

export let selectedMapCount = derived(selectedMaps, (selectMaps) => {
    console.log('vis')
    return selectMaps.filter((selectedMap) => selectedMap.selected).length
})


// selectedMapsById.subscribe((selectedMapsById) => {
//   selectedMaps = derived(
//     [...selectedMapsById.values()],
//     (selectedMaps) => selectedMaps
//   )
//   selectedMapCount = createSelectedMapCountStore(selectedMaps)
// })

export const selectedMapIds = derived(selectedMaps, ($selectedMaps) =>
  $selectedMaps
    .filter((selectedMap) => selectedMap.selected)
    .map((selectedMap) => selectedMap.mapId)
)

// $: names = derived($rootStore.map(o => o.name), x=>x)

// export const selectedMapsValues = derived(
//   selectedMapsStore,
//   ($selectedMapsStore) => [...$selectedMapsStore.values()].map((selectedMap) =>({subscribe: selectedMap.subscribe}))
// )

// export const simpleSelectedMaps = derived(
//   selectedMapsValues,
//   ([...$selectedMapsStore]) => $selectedMapsStore
// )

// export const selectedMapCount = derived(
//   selectedMapsValues,
//   ([...$selectedMapsStore]) => $selectedMapsStore.filter((selectedMap) => selectedMap.)
// )

// export const selectedMapIds = writable<Set<string>>(new Set())

// export const mapCount = derived(maps, ($maps) => $maps.length)

// mapCount.subscribe((value) => (mapCountValue = value))

// export const mapIndex = writable<number>(initialMapIndex)
// export const map = derived(
//   [maps, mapIndex],
//   ([$maps, $mapIndex]) => $maps[$mapIndex]
// )

// map.subscribe((value) => {
//   mapId
//   value.id
// })

// export function nextMap() {
//   mapIndex.update((mapIndex) => (mapIndex + 1) % mapCountValue)
// }

// export function prevMap() {
//   mapIndex.update((mapIndex) => (mapIndex - 1 + mapCountValue) % mapCountValue)
// }

// function createSelectedMapCountStore(selectedMaps: Readable<SelectedMap[]>) {
//   return derived(selectedMaps, (selectMaps) => {
//     console.log('vis')
//     return selectMaps.filter((selectedMap) => selectedMap.selected).length
//   })
// }

// export let selectedMapCount = createSelectedMapCountStore(selectedMaps)

// selectedMapsById.subscribe((selectedMapsById) => {
//   selectedMaps = derived(
//     [...selectedMapsById.values()],
//     (selectedMaps) => selectedMaps
//   )
//   selectedMapCount = createSelectedMapCountStore(selectedMaps)
// })

// export const selectedMapIds = derived(selectedMaps, ($selectedMaps) =>
//   $selectedMaps
//     .filter((selectedMap) => selectedMap.selected)
//     .map((selectedMap) => selectedMap.mapId)
// )
