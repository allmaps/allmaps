import { setContext, getContext } from 'svelte'
import { SvelteMap, SvelteSet } from 'svelte/reactivity'
import simplify from 'simplify-js'

import { generateChecksum } from '@allmaps/id/sync'
import { isClosed } from '@allmaps/stdlib'

import { getCanonicalCanvas, getCanonicalManifest } from '$lib/shared/iiif.js'
import { searchParams } from '$lib/shared/params.js'

import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'
import type { Point, Ring } from '@allmaps/types'
import type { BatchMapResult } from '@allmaps/render'

import type {
  InvalidGeoreferenceAnnotation,
  MapsHierarchy,
  Source
} from '$lib/types/shared.js'

import type { SourceState } from '$lib/state/source.svelte.js'
import type { UrlState } from '$lib/state/url.svelte.js'
import type { UiState } from '$lib/state/ui.svelte.js'
import type { ImagesState } from '$lib/state/images.svelte.js'

const MAPS_KEY = Symbol('maps')

export type ThumbnailRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type MapRenderError = {
  error: Error
  mapId?: string
  message: string
}

export class MapsState {
  #sourceState: SourceState
  #urlState: UrlState<typeof searchParams>
  #uiState: UiState
  #imagesState = $state<ImagesState>()

  #maps = $derived.by(() => this.#getMapsFromSource(this.#sourceState.source))
  #mapRenderErrors = $state(new SvelteMap<string, MapRenderError>())
  #mapRenderErrorsRevision = $state(0)
  #thumbnailRegions = new WeakMap<
    GeoreferencedMap,
    ThumbnailRegion | undefined
  >()
  #thumbnailResourceMasks = new WeakMap<
    GeoreferencedMap,
    Map<string, Ring | undefined>
  >()

  #invalidEmbeddedAnnotations = $derived.by(() => {
    const source = this.#sourceState.source

    if (source?.parsed.type === 'iiif') {
      return source.parsed.invalidEmbeddedAnnotations ?? []
    }

    return []
  })

  #embeddedMapIds = $derived.by(() => {
    const embeddedMapIds = new SvelteSet<string>()
    const source = this.#sourceState.source

    if (source?.parsed.type === 'iiif') {
      for (const map of source.parsed.embeddedMaps ?? []) {
        const mapId = this.#ensureMapId(map).id

        if (mapId) {
          embeddedMapIds.add(mapId)
        }
      }
    }

    return embeddedMapIds
  })

  #visibleMaps = $derived.by(() => {
    const hiddenMapIds = this.#uiState.hiddenMapIds

    return this.#maps.filter((map) => map.id && !hiddenMapIds.includes(map.id))
  })

  #selectableMaps = $derived.by(() => {
    const hiddenMapIds = this.#uiState.hiddenMapIds

    // eslint-disable-next-line
    this.#mapRenderErrorsRevision

    return this.#maps.filter((map) => this.#isMapSelectable(map, hiddenMapIds))
  })

  #mapsHierarchy = $derived(
    this.#getMapsHierarchy(this.#maps, this.#invalidEmbeddedAnnotations)
  )

  #previousMapId = $derived.by(() => {
    return this.#getSiblingSelectableMapId(-1)
  })

  #nextMapId = $derived.by(() => {
    return this.#getSiblingSelectableMapId(1)
  })

  constructor(
    sourceState: SourceState,
    urlState: UrlState<typeof searchParams>,
    uiState: UiState
  ) {
    this.#sourceState = sourceState
    this.#urlState = urlState
    this.#uiState = uiState
  }

  #ensureMapId(map: GeoreferencedMap): GeoreferencedMap {
    if (!map.id) {
      const checksum = generateChecksum(map)
      return {
        ...map,
        id: checksum
      }
    }
    return map
  }

  #getMapsFromSource(source?: Source) {
    if (source?.parsed.type === 'annotation') {
      return source.parsed.maps.map((map) => this.#ensureMapId(map))
    } else if (source?.parsed.type === 'iiif') {
      return [
        ...(source.parsed.embeddedMaps || []),
        ...(source.parsed.apiMaps || [])
      ].map((map) => this.#ensureMapId(map))
    }

    return []
  }

  // TODO: this function needs cleaning-up / simplifying!
  #getMapsHierarchy(
    maps: GeoreferencedMap[],
    invalidAnnotations: InvalidGeoreferenceAnnotation[]
  ): MapsHierarchy {
    type ByResource = Map<
      string,
      {
        resource: GeoreferencedMap['resource']
        maps: GeoreferencedMap[]
        invalidAnnotations: InvalidGeoreferenceAnnotation[]
      }
    >
    type ByCanvas = Map<string, { canvas: PartOfItem; byResource: ByResource }>

    const byManifest = new Map<
      string,
      { manifest: PartOfItem; byCanvas: ByCanvas }
    >()
    const byCanvasOnly = new Map<
      string,
      { canvas: PartOfItem; byResource: ByResource }
    >()
    const byResourceOnly: ByResource = new Map()

    const addToResource = (byResource: ByResource, map: GeoreferencedMap) => {
      const id = map.resource.id
      if (!byResource.has(id)) {
        byResource.set(id, {
          resource: map.resource,
          maps: [],
          invalidAnnotations: []
        })
      }
      byResource.get(id)!.maps.push(map)
    }

    const addInvalidToResource = (
      byResource: ByResource,
      invalidAnnotation: InvalidGeoreferenceAnnotation
    ) => {
      if (!invalidAnnotation.resource) {
        return
      }

      const id = invalidAnnotation.resource.id
      if (!byResource.has(id)) {
        byResource.set(id, {
          resource: invalidAnnotation.resource,
          maps: [],
          invalidAnnotations: []
        })
      }
      byResource.get(id)!.invalidAnnotations.push(invalidAnnotation)
    }

    const findPartOfItem = (
      partOfItems: PartOfItem[] | undefined,
      type: PartOfItem['type']
    ): PartOfItem | undefined => {
      for (const partOfItem of partOfItems ?? []) {
        if (partOfItem.type === type) {
          return partOfItem
        }

        const nestedPartOfItem = findPartOfItem(partOfItem.partOf, type)

        if (nestedPartOfItem) {
          return nestedPartOfItem
        }
      }

      return undefined
    }

    const getInvalidAnnotationCanvas = (
      invalidAnnotation: InvalidGeoreferenceAnnotation
    ) =>
      invalidAnnotation.canvas ??
      findPartOfItem(invalidAnnotation.resource?.partOf, 'Canvas')

    const getInvalidAnnotationManifest = (
      invalidAnnotation: InvalidGeoreferenceAnnotation,
      canvas?: PartOfItem
    ) =>
      invalidAnnotation.manifest ??
      findPartOfItem(canvas?.partOf, 'Manifest') ??
      findPartOfItem(invalidAnnotation.resource?.partOf, 'Manifest')

    for (const map of maps) {
      const canvas = getCanonicalCanvas(map)

      if (!canvas) {
        addToResource(byResourceOnly, map)
      } else {
        const manifest = getCanonicalManifest(map)

        if (!manifest) {
          if (!byCanvasOnly.has(canvas.id)) {
            byCanvasOnly.set(canvas.id, { canvas, byResource: new Map() })
          }
          addToResource(byCanvasOnly.get(canvas.id)!.byResource, map)
        } else {
          if (!byManifest.has(manifest.id)) {
            byManifest.set(manifest.id, { manifest, byCanvas: new Map() })
          }
          const manifestEntry = byManifest.get(manifest.id)!

          if (!manifestEntry.byCanvas.has(canvas.id)) {
            manifestEntry.byCanvas.set(canvas.id, {
              canvas,
              byResource: new Map()
            })
          }
          addToResource(manifestEntry.byCanvas.get(canvas.id)!.byResource, map)
        }
      }
    }

    for (const invalidAnnotation of invalidAnnotations) {
      const canvas = getInvalidAnnotationCanvas(invalidAnnotation)

      if (!canvas) {
        addInvalidToResource(byResourceOnly, invalidAnnotation)
      } else {
        const manifest = getInvalidAnnotationManifest(invalidAnnotation, canvas)

        if (!manifest) {
          if (!byCanvasOnly.has(canvas.id)) {
            byCanvasOnly.set(canvas.id, { canvas, byResource: new Map() })
          }
          addInvalidToResource(
            byCanvasOnly.get(canvas.id)!.byResource,
            invalidAnnotation
          )
        } else {
          if (!byManifest.has(manifest.id)) {
            byManifest.set(manifest.id, { manifest, byCanvas: new Map() })
          }
          const manifestEntry = byManifest.get(manifest.id)!

          if (!manifestEntry.byCanvas.has(canvas.id)) {
            manifestEntry.byCanvas.set(canvas.id, {
              canvas,
              byResource: new Map()
            })
          }
          addInvalidToResource(
            manifestEntry.byCanvas.get(canvas.id)!.byResource,
            invalidAnnotation
          )
        }
      }
    }

    const result: MapsHierarchy = {}

    if (byManifest.size > 0) {
      result.mapsByManifest = [...byManifest.values()].map(
        ({ manifest, byCanvas }) => ({
          manifest,
          mapsByCanvas: [...byCanvas.values()].map(
            ({ canvas, byResource }) => ({
              canvas,
              mapsByImage: [...byResource.values()]
            })
          )
        })
      )
    }

    if (byCanvasOnly.size > 0) {
      result.mapsByCanvas = [...byCanvasOnly.values()].map(
        ({ canvas, byResource }) => ({
          canvas,
          mapsByImage: [...byResource.values()]
        })
      )
    }

    if (byResourceOnly.size > 0) {
      result.mapsByImage = [...byResourceOnly.values()]
    }

    return result
  }

  #getSiblingSelectableMapId(direction: -1 | 1) {
    const currentMapId = this.#urlState.params.mapId

    if (this.#selectableMaps.length === 0) {
      return undefined
    }

    if (!currentMapId) {
      return this.#selectableMaps[0].id
    }

    const currentVisibleIndex = this.#selectableMaps.findIndex(
      (map) => map.id === currentMapId
    )

    if (currentVisibleIndex !== -1) {
      return this.#selectableMaps[
        (currentVisibleIndex + direction + this.#selectableMaps.length) %
          this.#selectableMaps.length
      ].id
    }

    const currentSourceIndex = this.#maps.findIndex(
      (map) => map.id === currentMapId
    )

    if (currentSourceIndex === -1) {
      return this.#selectableMaps[0].id
    }

    for (let offset = 1; offset <= this.#maps.length; offset++) {
      const map =
        this.#maps[
          (currentSourceIndex + direction * offset + this.#maps.length) %
            this.#maps.length
        ]

      if (this.#isMapSelectable(map)) {
        return map.id
      }
    }
  }

  #isMapSelectable(
    map: GeoreferencedMap,
    hiddenMapIds = this.#uiState.hiddenMapIds
  ) {
    if (!map.id || hiddenMapIds.includes(map.id)) {
      return false
    }

    if (this.#mapRenderErrors.has(map.id)) {
      return false
    }

    if (this.#imagesState?.getImageError(map.resource.id)) {
      return false
    }

    return true
  }

  #getResourceMaskBbox(resourceMask: GeoreferencedMap['resourceMask']) {
    if (!resourceMask.length) {
      return
    }

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const [x, y] of resourceMask) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(minY) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(maxY)
    ) {
      return
    }

    return [minX, minY, maxX, maxY] as const
  }

  #computeThumbnailRegion(map: GeoreferencedMap): ThumbnailRegion | undefined {
    const resource = map.resource

    if (!resource.width || !resource.height) {
      return
    }

    const bbox = this.#getResourceMaskBbox(map.resourceMask)

    if (!bbox) {
      return
    }

    const [minX, minY, maxX, maxY] = bbox
    const width = maxX - minX
    const height = maxY - minY
    const padding = Math.max(width, height) * 0.1

    const x = Math.max(0, minX - padding)
    const y = Math.max(0, minY - padding)
    const right = Math.min(resource.width, maxX + padding)
    const bottom = Math.min(resource.height, maxY + padding)

    if (right <= x || bottom <= y) {
      return
    }

    return {
      x,
      y,
      width: right - x,
      height: bottom - y
    }
  }

  #getThumbnailMaskTolerance(
    map: GeoreferencedMap,
    region: ThumbnailRegion | undefined,
    renderSize: number
  ) {
    const sourceWidth = region?.width || map.resource.width
    const sourceHeight = region?.height || map.resource.height

    if (!sourceWidth || !sourceHeight || renderSize <= 0) {
      return 0
    }

    return (Math.max(sourceWidth, sourceHeight) / renderSize) * 1.5
  }

  #getThumbnailMaskCacheKey(tolerance: number) {
    return tolerance.toFixed(2)
  }

  #simplifyThumbnailResourceMask(
    resourceMask: Ring,
    tolerance: number
  ): Ring | undefined {
    const openResourceMask = isClosed(resourceMask)
      ? resourceMask.slice(0, -1)
      : resourceMask

    if (openResourceMask.length < 3) {
      return
    }

    if (openResourceMask.length <= 8 || tolerance <= 0) {
      return openResourceMask
    }

    const points = openResourceMask.map(([x, y]) => ({ x, y }))
    const simplifiedPoints = simplify(points, tolerance, false)

    if (simplifiedPoints.length < 3) {
      return openResourceMask
    }

    return simplifiedPoints.map(({ x, y }) => [x, y] as Point)
  }

  #setMapRenderError(error: Error, mapId?: string, key?: string) {
    this.#mapRenderErrors.set(
      key ?? mapId ?? `unknown:${this.#mapRenderErrors.size}`,
      {
        error,
        mapId,
        message: error.message
      }
    )
    this.#mapRenderErrorsRevision += 1
  }

  #clearMapRenderErrors() {
    if (this.#mapRenderErrors.size === 0) {
      return
    }

    this.#mapRenderErrors.clear()
    this.#mapRenderErrorsRevision += 1
  }

  get maps() {
    return this.#maps
  }

  get invalidEmbeddedAnnotations() {
    return this.#invalidEmbeddedAnnotations
  }

  get selectableMaps() {
    return this.#selectableMaps
  }

  get mapRenderErrors() {
    // eslint-disable-next-line
    this.#mapRenderErrorsRevision
    return [...this.#mapRenderErrors.values()]
  }

  get mapCount() {
    return this.#maps.length
  }

  get visibleMapCount() {
    return this.#visibleMaps.length
  }

  get selectableMapCount() {
    return this.#selectableMaps.length
  }

  canHideMap(mapId?: string) {
    return (
      !!mapId &&
      (this.#uiState.isMapHidden(mapId) || this.#visibleMaps.length > 1)
    )
  }

  get previousMapId() {
    return this.#previousMapId
  }

  get nextMapId() {
    return this.#nextMapId
  }

  get mapsHierarchy() {
    return this.#mapsHierarchy
  }

  isMapSelectable(mapId?: string) {
    if (!mapId) {
      return false
    }

    const map = this.#maps.find((map) => map.id === mapId)

    return map ? this.#isMapSelectable(map) : false
  }

  setImagesState(imagesState: ImagesState) {
    this.#imagesState = imagesState
  }

  getThumbnailRegion(map: GeoreferencedMap) {
    if (!this.#thumbnailRegions.has(map)) {
      this.#thumbnailRegions.set(map, this.#computeThumbnailRegion(map))
    }

    return this.#thumbnailRegions.get(map)
  }

  getThumbnailResourceMask(
    map: GeoreferencedMap,
    region: ThumbnailRegion | undefined,
    renderSize: number
  ) {
    const tolerance = this.#getThumbnailMaskTolerance(map, region, renderSize)
    const cacheKey = this.#getThumbnailMaskCacheKey(tolerance)
    let thumbnailResourceMasks = this.#thumbnailResourceMasks.get(map)

    if (!thumbnailResourceMasks) {
      thumbnailResourceMasks = new Map()
      this.#thumbnailResourceMasks.set(map, thumbnailResourceMasks)
    }

    if (!thumbnailResourceMasks.has(cacheKey)) {
      thumbnailResourceMasks.set(
        cacheKey,
        this.#simplifyThumbnailResourceMask(map.resourceMask, tolerance)
      )
    }

    return thumbnailResourceMasks.get(cacheKey)
  }

  getMapRenderError(mapId?: string) {
    // eslint-disable-next-line
    this.#mapRenderErrorsRevision
    if (!mapId) {
      return
    }

    return this.#mapRenderErrors.get(mapId)
  }

  isEmbeddedMap(mapId?: string) {
    return !!mapId && this.#embeddedMapIds.has(mapId)
  }

  addMapRenderError(error: Error, mapId?: string) {
    this.#setMapRenderError(error, mapId)
  }

  clearMapRenderErrors() {
    this.#clearMapRenderErrors()
  }

  setMapRenderResults(results: BatchMapResult[]) {
    this.#clearMapRenderErrors()

    for (const result of results) {
      if (result.ok) {
        continue
      }

      const mapId = result.mapId ?? this.#maps[result.index]?.id
      const key = mapId ?? String(result.index)
      this.#setMapRenderError(result.error, mapId, key)
    }
  }
}

export function setMapsState(
  sourceState: SourceState,
  urlState: UrlState<typeof searchParams>,
  uiState: UiState
) {
  return setContext(MAPS_KEY, new MapsState(sourceState, urlState, uiState))
}

export function getMapsState() {
  const mapsState = getContext<MapsState>(MAPS_KEY)
  if (!mapsState) {
    throw new Error('MapsState is not set')
  }

  return mapsState
}
