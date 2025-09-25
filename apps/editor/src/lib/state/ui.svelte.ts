import { setContext, getContext } from 'svelte'
import { browser } from '$app/environment'

import { UiEvents, UiEventTarget } from '$lib/shared/ui-events.js'

import type { Bbox, Point } from '@allmaps/types'

import type { PresetBaseMapID, ClickedItem } from '$lib/types/shared.js'

import type { UrlState } from '$lib/state/url.svelte.js'

const UI_KEY = Symbol('ui')

type BasemapPreset = {
  label: string
  url: string
  attribution: string
  value: PresetBaseMapID
}

type ModalsVisible = Record<string, boolean>

const basemapPresets: BasemapPreset[] = [
  {
    label: 'ESRI World Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community',
    value: 'esri-world-topo'
  },

  {
    label: 'Esri World Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    // TODO: also add https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/12/1340/2108
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    value: 'esri-world-imagery'
  },
  {
    label: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap',
    value: 'osm'
  }
]

export class UiState extends UiEventTarget {
  #urlState: UrlState

  #basemapPresets = $state(basemapPresets)

  #firstUse = $state(true)

  #modalsVisible = $state<ModalsVisible>({
    about: false,
    annotation: false,
    keyboard: false,
    export: false,
    editGcps: false
  })

  #retinaTiles = $state(true)

  #lastClickedItem = $state<ClickedItem>()

  #imagesScrollTop = $state(0)

  #lastBbox = $state<Bbox>()

  constructor(urlState: UrlState) {
    super()

    this.#urlState = urlState

    if (browser) {
      // TODO: move localStorage code to shared ts file
      const firstUseKey = `${String(UI_KEY)}-first-use`

      try {
        const firstUse = localStorage.getItem(firstUseKey)

        if (firstUse) {
          this.#firstUse = false
        }

        localStorage.setItem(firstUseKey, String(false))
      } catch {
        console.warn('Error reading from localStorage')
      }
    }
  }

  handleZoomToExtent() {
    this.dispatchEvent(new CustomEvent(UiEvents.ZOOM_TO_EXTENT))
  }

  handleFitBbox(bbox: Bbox) {
    this.dispatchEvent(
      new CustomEvent<Bbox>(UiEvents.FIT_BBOX, {
        detail: bbox
      })
    )
  }

  handleSetCenter(center: Point) {
    this.dispatchEvent(
      new CustomEvent<Point>(UiEvents.SET_CENTER, {
        detail: center
      })
    )
  }

  get basemapPresets() {
    return this.#basemapPresets
  }

  get basemapPreset(): BasemapPreset {
    const basemapPreset = this.#basemapPresets.find(
      (preset) => preset.value === this.#urlState.basemapPreset
    )

    if (basemapPreset) {
      return basemapPreset
    } else {
      return this.basemapPresets[0]
    }
  }

  get firstUse() {
    return this.#firstUse
  }

  get modalsVisible() {
    return this.#modalsVisible
  }

  set modalsVisible(state: ModalsVisible) {
    const visibleKey = Object.keys(state).find((key) => state[key])

    this.#modalsVisible = Object.fromEntries(
      Object.keys(this.#modalsVisible).map((key) => [key, key === visibleKey])
    )
  }

  get retinaTiles() {
    return this.#retinaTiles
  }

  set retinaTiles(retina: boolean) {
    this.#retinaTiles = retina
  }

  get lastClickedItem(): ClickedItem | undefined {
    return this.#lastClickedItem
  }

  set lastClickedItem(item: ClickedItem) {
    this.dispatchEvent(
      new CustomEvent<ClickedItem>(UiEvents.CLICKED_ITEM, {
        detail: item
      })
    )

    this.#lastClickedItem = item
  }

  get imagesScrollTop() {
    return this.#imagesScrollTop
  }

  set imagesScrollTop(value: number) {
    this.#imagesScrollTop = value
  }

  get lastBbox() {
    return this.#lastBbox
  }

  set lastBbox(bbox: Bbox | undefined) {
    this.#lastBbox = bbox
  }
}

export function setUiState(urlState: UrlState) {
  return setContext(UI_KEY, new UiState(urlState))
}

export function getUiState() {
  const uitState = getContext<ReturnType<typeof setUiState>>(UI_KEY)

  if (!uitState) {
    throw new Error('UiState is not set')
  }

  return uitState
}
