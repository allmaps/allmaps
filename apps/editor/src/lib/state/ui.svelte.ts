import { setContext, getContext } from 'svelte'

import { UiEvents, UiEventTarget } from '$lib/shared/ui-events.js'

import type { PresetBaseMapID, ClickedItem } from '$lib/types/shared.js'

import type { UrlState } from '$lib/state/url.svelte.js'

const UI_KEY = Symbol('ui')

type BasemapPreset = {
  label: string
  url: string
  attribution: string
  value: PresetBaseMapID
}

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
  #showAboutDialog = $state(false)

  #retinaTiles = $state(true)

  #lastClickedItem = $state<ClickedItem>()

  constructor(urlState: UrlState) {
    super()

    this.#urlState = urlState

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

  get showAboutDialog() {
    return this.#showAboutDialog
  }

  set showAboutDialog(show: boolean) {
    this.#showAboutDialog = show
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
      new CustomEvent(UiEvents.CLICKED_ITEM, {
        detail: item
      })
    )

    this.#lastClickedItem = item
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
