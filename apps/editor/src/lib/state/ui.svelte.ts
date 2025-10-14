import { setContext, getContext } from 'svelte'
import { browser } from '$app/environment'

import { UiEvents, UiEventTarget } from '$lib/shared/ui-events.js'

import type { PickerProjection } from '@allmaps/components/projections'

import type { Bbox, Point } from '@allmaps/types'

import type {
  BasemapPresetId,
  AllmapsPluginId,
  ClickedItem,
  BasemapPresetItem,
  AllmapsPluginItem
} from '$lib/types/shared.js'

import type { UrlState } from '$lib/state/url.svelte.js'
import type { SourceState } from '$lib/state/source.svelte.js'

const UI_KEY = Symbol('ui')

type Modal =
  | 'command'
  | 'about'
  | 'annotation'
  | 'keyboard'
  | 'export'
  | 'editGcps'
  | 'editResourceMask'
type Popover = 'export' | 'geocoder' | 'info' | 'maps' | 'mapSettings'

type ModalOpen = Modal | undefined
type PopoverOpen = Popover | undefined

type GeoreferenceOptions = {
  warpedMapLayerOpacity: number
  renderMasks: boolean
  onlyRenderActiveMap: boolean
}

type ResultsOptions = {
  warpedMapLayerOpacity: number
  renderMasks: boolean
}

const basemapPresets: BasemapPresetItem[] = [
  {
    label: 'Protomaps',
    value: 'protomaps',
    type: 'protomaps',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  },
  {
    label: 'ESRI World Topo',
    value: 'esri-world-topo',
    type: 'raster',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  },

  {
    label: 'Esri World Imagery',
    value: 'esri-world-imagery',
    type: 'raster',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    // TODO: also add https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/12/1340/2108
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  {
    label: 'OpenStreetMap',
    value: 'osm',
    type: 'raster',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: 'OpenStreetMap'
  }
]

const allmapsPlugins: AllmapsPluginItem[] = [
  {
    label: 'MapLibre GL',
    value: 'maplibre'
  },
  {
    label: 'Leaflet',
    value: 'leaflet'
  },
  {
    label: 'OpenLayers',
    value: 'openlayers'
  }
]

type ProjectionIndices = {
  fullText: ((query: string) => PickerProjection[]) | undefined
  bbox: ((bbox: Bbox) => PickerProjection[]) | undefined
}

export class UiState extends UiEventTarget {
  #urlState: UrlState

  #firstUse = $state(true)

  #sourceUrl = $state<string>()

  #modalOpen = $state<ModalOpen>()
  #popoverOpen = $state<PopoverOpen>()

  #retinaTiles = $state(true)

  #lastClickedItem = $state<ClickedItem>()

  #imagesScrollTop = $state(0)

  #lastBbox = $state<Bbox>()

  #projectionIndices = $state.raw<ProjectionIndices>({
    fullText: undefined,
    bbox: undefined
  })

  #selectedAllmapsPluginId = $state<AllmapsPluginId>('maplibre')

  #georeferenceOptions = $state<GeoreferenceOptions>({
    warpedMapLayerOpacity: 0,
    renderMasks: true,
    onlyRenderActiveMap: true
  })

  #resultsOptions = $state<ResultsOptions>({
    warpedMapLayerOpacity: 1,
    renderMasks: false
  })

  constructor(urlState: UrlState, sourceState: SourceState) {
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

    $effect(() => {
      // If source changes, close modals/popovers
      if (sourceState.source?.url !== this.#sourceUrl) {
        this.closeModalsAndPopovers()
        this.#sourceUrl = sourceState.source?.url
      }
    })
  }

  dispatchZoomToExtent() {
    this.dispatchEvent(new CustomEvent(UiEvents.ZOOM_TO_EXTENT))
  }

  dispatchToggleVisible(visible: boolean) {
    this.dispatchEvent(
      new CustomEvent(UiEvents.TOGGLE_VISIBLE, {
        detail: visible
      })
    )
  }

  dispatchToggleRenderMasks() {
    this.dispatchEvent(new CustomEvent(UiEvents.TOGGLE_RENDER_MASKS))
  }

  dispatchFitBbox(bbox: Bbox) {
    this.dispatchEvent(
      new CustomEvent<Bbox>(UiEvents.FIT_BBOX, {
        detail: bbox
      })
    )
  }

  dispatchSetCenter(center: Point) {
    this.dispatchEvent(
      new CustomEvent<Point>(UiEvents.SET_CENTER, {
        detail: center
      })
    )
  }

  get basemapPresets() {
    return basemapPresets
  }

  get basemapPreset(): BasemapPresetItem {
    const basemapPreset = this.basemapPresets.find(
      (preset) => preset.value === this.#urlState.basemapPresetId
    )

    if (basemapPreset) {
      return basemapPreset
    } else {
      return this.basemapPresets[0]
    }
  }

  get allmapsPlugins() {
    return allmapsPlugins
  }

  get selectedAllmapsPluginId() {
    return this.#selectedAllmapsPluginId
  }

  getSelectedAllmapsPlugin() {
    const selectedAllmapsPlugin = this.allmapsPlugins.find(
      (plugin) => plugin.value === this.#selectedAllmapsPluginId
    )

    if (selectedAllmapsPlugin) {
      return selectedAllmapsPlugin
    } else {
      return this.allmapsPlugins[0]
    }
  }

  set selectedAllmapsPluginId(selectedPluginId: AllmapsPluginId) {
    this.#selectedAllmapsPluginId = selectedPluginId
  }

  get firstUse() {
    return this.#firstUse
  }

  getModalOpen(modal: Modal) {
    return this.#modalOpen === modal
  }

  setModalOpen(modal: Modal, open: boolean) {
    this.#modalOpen = open ? modal : undefined
  }

  get hasModalOpen() {
    return this.#modalOpen !== undefined
  }

  getPopoverOpen(popover: Popover) {
    return this.#popoverOpen === popover
  }

  setPopoverOpen(popover: Popover, open: boolean) {
    this.#popoverOpen = open ? popover : undefined
  }

  closeModalsAndPopovers() {
    this.#modalOpen = undefined
    this.#popoverOpen = undefined
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

  get projectionIndices() {
    return this.#projectionIndices
  }

  set projectionIndices(indices: ProjectionIndices) {
    this.#projectionIndices = indices
  }

  get georeferenceOptions() {
    return this.#georeferenceOptions
  }

  set georeferenceOptions(options: Partial<GeoreferenceOptions>) {
    this.#georeferenceOptions = { ...this.#georeferenceOptions, ...options }
  }

  get resultsOptions() {
    return this.#resultsOptions
  }

  set resultsOptions(options: Partial<ResultsOptions>) {
    this.#resultsOptions = { ...this.#resultsOptions, ...options }
  }
}

export function setUiState(urlState: UrlState, sourceState: SourceState) {
  return setContext(UI_KEY, new UiState(urlState, sourceState))
}

export function getUiState() {
  const uiState = getContext<ReturnType<typeof setUiState>>(UI_KEY)

  if (!uiState) {
    throw new Error('UiState is not set')
  }

  return uiState
}
