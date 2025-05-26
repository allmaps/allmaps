import { setContext, getContext } from 'svelte'

import type { GeoreferencedMap } from '@allmaps/annotation'

const MAP_KEY = Symbol('map')

export class MapState {
  #map = $state.raw<GeoreferencedMap>()

  constructor(map?: GeoreferencedMap) {
    this.#map = map
  }

  set map(map: GeoreferencedMap | undefined) {
    this.#map = map
  }

  get map() {
    return this.#map
  }

  // const manifests = $derived(map ? findManifests(map.resource.partOf) : [])
  // const canvases = $derived(map ? findCanvases(map.resource.partOf) : [])

  // const firstCanvasWithManifestLabel = $derived.by(() =>
  //   canvases
  //     .map((canvas) => ({
  //       canvas,
  //       label: labelFromPartOfItem(canvas),
  //       manifests: findManifests(canvas.partOf)
  //         .map((manifest) => ({
  //           manifest,
  //           label: labelFromPartOfItem(manifest)
  //         }))
  //         .filter((manifest) => manifest.label)
  //     }))
  //     .find((canvas) => canvas.label && canvas.manifests.length > 0)
  // )

  // const firstCanvasLabel = $derived.by(() =>
  //   canvases
  //     .map((canvas) => ({
  //       canvas,
  //       label: labelFromPartOfItem(canvas)
  //     }))
  //     .find((canvas) => canvas.label)
  // )
  // const firstManifestLabel = $derived.by(() =>
  //   manifests
  //     .map((manifest) => ({
  //       manifest,
  //       label: labelFromPartOfItem(manifest)
  //     }))
  //     .find((manifest) => manifest.label)
  // )

  // let labels = $derived.by(() => {
  //   if (firstCanvasWithManifestLabel) {
  //     const canvasLabel = firstCanvasWithManifestLabel.label
  //     const manifestLabel = firstCanvasWithManifestLabel.manifests[0].label

  //     return [canvasLabel, manifestLabel]
  //   } else if (firstCanvasLabel) {
  //     return [firstCanvasLabel.label]
  //   } else if (firstManifestLabel) {
  //     return [firstManifestLabel.label]
  //   } else if (map?.resource.id) {
  //     return [`Map from ${new URL(map.resource.id).host}`]
  //   }
  // })

  // let title = $derived(labels?.map((label) => truncate(label)).join(' / '))
}

export function setMapState(map?: GeoreferencedMap) {
  return setContext(MAP_KEY, new MapState(map))
}

export function getMapState() {
  const mapState = getContext<ReturnType<typeof setMapState>>(MAP_KEY)

  if (!mapState) {
    throw new Error('MapState is not set')
  }

  return mapState
}
