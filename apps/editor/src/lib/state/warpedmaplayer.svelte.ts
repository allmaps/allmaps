// import { setContext, getContext } from 'svelte'

// import { WarpedMapLayer } from '@allmaps/maplibre'

// import type {
//   Annotation,
//   AnnotationPage,
//   GeoreferencedMap
// } from '@allmaps/annotation'

// import type { ProjectionsState } from '@allmaps/components/state'

// import type { MapsState } from '$lib/state/maps.svelte'
// import type { MapsMergedState } from '$lib/state/maps-merged.svelte.js'
// import type { ScopeState } from '$lib/state/scope.svelte'

// const WARPED_MAP_LAYER_KEY = Symbol('warpedmaplayer')

// export class WarpedMapLayerState {
//   #warpedMapLayer = $state.raw<WarpedMapLayer>()

//   #initialized = $state(false)

//   constructor(
//     mapsState: MapsState,
//     mapsMergedState: MapsMergedState,
//     scopeState: ScopeState,
//     projectionsState: ProjectionsState
//   ) {
//     this.#warpedMapLayer = new WarpedMapLayer()

//     // mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
//     // mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)
//     // mapsState.addEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
//     // mapsState.addEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
//     // mapsState.addEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)
//     // mapsState.addEventListener(
//     //   MapsEvents.INSERT_RESOURCE_MASK_POINT,
//     //   handleInsertResourceMaskPoint
//     // )
//     // mapsState.addEventListener(
//     //   MapsEvents.REPLACE_RESOURCE_MASK_POINT,
//     //   handleReplaceResourceMaskPoint
//     // )
//     // mapsState.addEventListener(
//     //   MapsEvents.REMOVE_RESOURCE_MASK_POINT,
//     //   handleRemoveResourceMaskPoint
//     // )
//     // mapsState.addEventListener(
//     //   MapsEvents.SET_TRANSFORMATION,
//     //   handleSetTransformation
//     // )
//     // mapsState.addEventListener(
//     //   MapsEvents.SET_RESOURCE_CRS,
//     //   handleSetResourceCrs
//     // )

//     $effect(() => {
//       if (
//         this.#warpedMapLayer &&
//         mapsState.connected === true &&
//         scopeState.annotation &&
//         projectionsState.ready &&
//         !this.#initialized
//       ) {
//         this.#setGeoreferenceAnnotation(scopeState.annotation)
//         this.#initialized = true
//       }
//     })
//   }

//   async #setGeoreferenceAnnotation(annotation: Annotation | AnnotationPage) {
//     if (!this.#warpedMapLayer) {
//       return
//     }

//     this.#warpedMapLayer.clear()
//     await this.#warpedMapLayer.addGeoreferenceAnnotation(annotation)
//   }

//   getWarpedMapLayer() {
//     return this.#warpedMapLayer
//   }
// }

// export function setWarpedMapLayerState(
//   mapsState: MapsState,
//   mapsMergedState: MapsMergedState,
//   scopeState: ScopeState,
//   projectionsState: ProjectionsState
// ) {
//   return setContext(
//     WARPED_MAP_LAYER_KEY,
//     new WarpedMapLayerState(
//       mapsState,
//       mapsMergedState,
//       scopeState,
//       projectionsState
//     )
//   )
// }

// export function getWarpedMapLayerState() {
//   const warpedMapLayerState =
//     getContext<ReturnType<typeof setWarpedMapLayerState>>(WARPED_MAP_LAYER_KEY)

//   if (!warpedMapLayerState) {
//     throw new Error('WarpedMapLayerState is not set')
//   }

//   return warpedMapLayerState
// }
