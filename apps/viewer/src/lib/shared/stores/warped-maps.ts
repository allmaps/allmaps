import type { Writable } from 'svelte/store'

import type { RenderOptions} from '$lib/shared/types.js'

import type { WarpedMap } from '@allmaps/render'

type ViewerMap = {
  sourceId: string
  id: string
  warpedMap: WarpedMap
  renderOptions: Writable<RenderOptions>
  // selected: Writable<boolean>
}

// export const mapIds = derived(mapsStore, (maps) => maps.keys())

// export const maps = { subscribe: mapsStore.subscribe }

// export const mapCount = derived(mapsStore, (maps) => maps.size)
