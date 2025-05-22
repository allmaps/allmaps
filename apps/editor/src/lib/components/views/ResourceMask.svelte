<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { TerraDraw, TerraDrawPolygonMode } from 'terra-draw'
  import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

  import { X as XIcon, Check as CheckIcon } from 'phosphor-svelte'

  import { pink } from '@allmaps/tailwind'
  import { computeBbox } from '@allmaps/stdlib'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { generateId } from '$lib/shared/id.js'
  import { polygonDifference } from '$lib/shared/geometry.js'
  import { getResourceMask } from '$lib/shared/maps.js'
  import { roundWithDecimals } from '$lib/shared/math.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'
  import { UiEvents } from '$lib/shared/ui-events.js'
  import { idStrategy, ensureStringId } from '$lib/shared/terra-draw.js'

  import type { GeoJSONStoreFeatures } from 'terra-draw'
  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { GcpTransformer } from '@allmaps/transform'

  import type { DbImageService, DbMap3, ResourceMask } from '$lib/types/maps.js'

  import Resource from '$lib/components/maplibre/Resource.svelte'

  import type {
    InsertMapEvent,
    RemoveMapEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent,
    ClickedItemEvent
  } from '$lib/types/events.js'

  import { MAPLIBRE_PADDING } from '$lib/shared/constants.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const viewportsState = getViewportsState()
  const uiState = getUiState()

  let resourceMap = $state.raw<MapLibreMap>()
  let transformer = $state.raw<GcpTransformer>()
  let bounds = $state.raw<LngLatBoundsLike>()

  let polygonMode: TerraDrawPolygonMode | undefined
  let resourceDraw: TerraDraw | undefined

  let resourceMapReady = $state(false)

  let mapsInitialized = $state(false)
  let isDrawing = $state(false)
  let canFinishDrawing = $state(true)

  let currentMapsImageId = $state<string>()
  let currentDisplayImageId = $state<string>()

  let activeMapId = $state<string>()

  function handleLastClickedItem(event: ClickedItemEvent) {
    if (resourceDraw && event.detail.type === 'map') {
      const resourceFeature = resourceDraw.getSnapshotFeature(
        event.detail.mapId
      )

      if (resourceFeature) {
        // @ts-expect-error incompatible types
        const bbox = computeBbox(resourceFeature.geometry)

        resourceMap?.fitBounds(bbox, {
          duration: 200,
          padding: MAPLIBRE_PADDING
        })
      }
    }
  }

  function saveViewport() {
    if (resourceMap && currentDisplayImageId) {
      const resourceZoom = resourceMap.getZoom()
      const resourceCenter = resourceMap.getCenter().toArray()
      const resourceBearing = resourceMap.getBearing()

      viewportsState.saveViewport(
        { imageId: currentDisplayImageId, view: 'mask' },
        {
          zoom: resourceZoom,
          center: resourceCenter,
          bearing: resourceBearing
        }
      )
    }
  }

  export function getResourceMaskFromFeature(
    transformer: GcpTransformer,
    feature: GeoJSONStoreFeatures
  ): ResourceMask {
    if (feature.geometry.type !== 'Polygon') {
      throw new Error('Feature is not a polygon!')
    }

    const coordinates = feature.geometry.coordinates[0] as [number, number][]
    const geoCoordinates = transformer.transformToResource(coordinates)

    const resourceMask = geoCoordinates
      .slice(0, -1)
      .map((coordinate) => [
        Math.round(coordinate[0]),
        Math.round(coordinate[1])
      ]) as ResourceMask

    return resourceMask
  }

  function createFeature(transformer: GcpTransformer, map: DbMap3) {
    const resourceMask = getResourceMask(map)

    if (resourceMask.length < 3) {
      throw new Error('Resource mask is must have 3 or more vertices')
    }

    const geoCoordinates = transformer
      .transformToGeo([...resourceMask, resourceMask[0]])
      .map((coordinate) =>
        coordinate.map((number) => roundWithDecimals(number, 9))
      )

    return {
      type: 'Feature' as const,
      id: map.id,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [geoCoordinates]
      },
      properties: {
        mode: 'polygon',
        index: map.index || 0
      }
    }
  }

  function addFeature(
    transformer: GcpTransformer,
    resourceDraw: TerraDraw,
    map: DbMap3
  ) {
    const feature = createFeature(transformer, map)
    resourceDraw.addFeatures([feature])
  }

  function makeResourceMaskFeatureActive(mapId?: string, redraw = false) {
    activeMapId = mapId

    if (resourceDraw && redraw) {
      resourceDraw.updateModeOptions('polygon', getModeOptions())
    }
  }

  function getPolygonFeature(
    resourceDraw: TerraDraw,
    terraDrawId: string | number
  ) {
    const feature = resourceDraw.getSnapshotFeature(terraDrawId)

    if (feature && feature.geometry.type === 'Polygon') {
      return feature
    }
  }

  function initializeMaps(
    transformer: GcpTransformer,
    resourceDraw: TerraDraw,
    maps: DbMap3[]
  ) {
    mapsInitialized = false

    resourceDraw.clear()
    maps.forEach((map) => addFeature(transformer, resourceDraw, map))

    currentMapsImageId = mapsState.connectedImageId

    const resourceViewport = viewportsState.getViewport({
      imageId: currentMapsImageId,
      view: 'mask'
    })

    if (resourceViewport) {
      resourceMap?.flyTo({
        ...resourceViewport,
        duration: 0,
        padding: MAPLIBRE_PADDING
      })
    } else if (bounds) {
      resourceMap?.fitBounds(bounds, {
        duration: 0,
        padding: MAPLIBRE_PADDING
      })
    }

    mapsInitialized = true
  }

  function replaceFeatureFromState(mapId: string) {
    if (!resourceDraw) {
      console.error('No resource draw!')
      return
    }

    const map = mapsState?.maps?.find((map) => map.id === mapId)

    if (map && transformer) {
      resourceDraw.removeFeatures([mapId])

      addFeature(transformer, resourceDraw, map)
    }
  }

  function handleDrawChange(
    ids: (string | number)[],
    type: string,
    context?: { origin: 'api' }
  ) {
    if (ids.length === 1) {
      const hasApiOrigin = context && context.origin === 'api'

      if (type === 'update') {
        const mapId = ensureStringId(ids[0])

        if (mapId) {
          makeResourceMaskFeatureActive(mapId)
        }
      } else if (type === 'create') {
        const mapId = ids[0]
        const feature = resourceDraw?.getSnapshotFeature(mapId)

        if (!hasApiOrigin) {
          isDrawing = true
        }
      } else if (type === 'delete') {
        if (!hasApiOrigin) {
          isDrawing = false
        }
      }
    }
  }

  async function handleFeatureEdited(
    transformer: GcpTransformer,
    feature: GeoJSONStoreFeatures
  ) {
    const mapId = ensureStringId(feature.id)

    if (!mapId) {
      console.error('No Allmaps ID found!')
      return
    }

    const map = mapsState.getMapById(mapId)

    if (!map) {
      console.error('No map found with ID', mapId)
      return
    }

    const resourceMaskCurrent = getResourceMask(map)
    const resourceMaskEdited = getResourceMaskFromFeature(transformer, feature)

    const diff = polygonDifference(resourceMaskCurrent, resourceMaskEdited)

    if (diff) {
      const { operation, index, point } = diff
      if (operation === 'insert') {
        mapsState.insertResourceMaskPoint({
          mapId,
          index,
          point
        })
      } else if (operation === 'replace') {
        mapsState.replaceResourceMaskPoint({
          mapId,
          index,
          point
        })
      } else if (operation === 'remove') {
        mapsState.removeResourceMaskPoint({
          mapId,
          index
        })
      }
    }
  }

  async function handleFeatureDrawn(
    transformer: GcpTransformer,
    feature: GeoJSONStoreFeatures
  ) {
    if (!transformer) {
      throw new Error('No transformer!')
    }

    const mapId = ensureStringId(feature.id)
    const resourceMask = getResourceMaskFromFeature(transformer, feature)

    const image = sourceState.activeImage

    if (!image) {
      console.error('No active image!')
      return
    }

    const allmapsId = generateId(image.uri)

    let resourceType: DbImageService = 'ImageService1' as const
    if (image.majorVersion === 2) {
      resourceType = 'ImageService2' as const
    } else if (image.majorVersion === 3) {
      resourceType = 'ImageService3' as const
    }

    mapsState.insertMap({
      mapId,
      map: {
        id: mapId,
        version: 3,
        index: mapsState.mapsCount + Math.random(),
        gcps: {},
        resource: {
          id: allmapsId,
          uri: image.uri,
          type: resourceType,
          width: image.width,
          height: image.height
        },
        resourceMask
      }
    })
  }

  function handleDrawFinish(
    id: string | number,
    context: { action: string; mode: string }
  ) {
    if (!transformer) {
      throw new Error('Transformer not initialized')
    }

    if (!resourceDraw) {
      throw new Error('Terra Draw not initialized')
    }

    const feature = getPolygonFeature(resourceDraw, id)

    if (feature) {
      isDrawing = false

      if (context.action === 'edit') {
        handleFeatureEdited(transformer, feature)
      } else if (context.action === 'draw') {
        handleFeatureDrawn(transformer, feature)
      }
    }
  }

  function handleInsertMap(event: InsertMapEvent) {
    if (!transformer) {
      console.error('Transformer not initialized')
      return
    }

    if (!resourceDraw) {
      console.error('Terra Draw not initialized')
      return
    }

    addFeature(transformer, resourceDraw, event.detail.map)
  }

  function handleRemoveMap(event: RemoveMapEvent) {
    if (!resourceDraw) {
      console.error('Terra Draw not initialized')
      return
    }

    const mapId = event.detail.mapId
    resourceDraw.removeFeatures([mapId])
  }

  function handleInsertResourceMaskPoint(event: InsertResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceFeatureFromState(mapId)
  }

  function handleReplaceResourceMaskPoint(
    event: ReplaceResourceMaskPointEvent
  ) {
    const mapId = event.detail.mapId
    replaceFeatureFromState(mapId)
  }

  function handleRemoveResourceMaskPoint(event: RemoveResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceFeatureFromState(mapId)
  }

  function abortDrawing() {
    if (polygonMode) {
      polygonMode.cleanUp()
    }
  }

  function finishDrawing() {
    if (polygonMode && canFinishDrawing) {
      // @ts-expect-error ignore private method
      polygonMode.close()
    }
  }

  function getModeOptions() {
    return {
      editable: true,
      showCoordinatePoints: true,
      styles: {
        fillColor: '#ffffff' as `#${string}`,
        fillOpacity: ({ id }: { id?: number | string }) =>
          activeMapId === id ? 0.3 : 0,

        outlineColor: pink as `#${string}`,
        outlineWidth: ({ id }: { id?: number | string }) =>
          activeMapId === id ? 5 : 2,
        editedPointWidth: 4,
        editedPointColor: '#ffffff' as `#${string}`,
        editedPointOutlineWidth: 3,
        editedPointOutlineColor: pink,

        coordinatePointWidth: ({ id }: { id?: number | string }) =>
          activeMapId === id ? 3 : 2,
        coordinatePointColor: '#ffffff' as `#${string}`,
        coordinatePointOutlineWidth: ({ id }: { id?: number | string }) =>
          activeMapId === id ? 4 : 3,
        coordinatePointOutlineColor: pink,

        closingPointWidth: 3,
        closingPointColor: '#ffffff' as `#${string}`,
        closingPointOutlineWidth: 4,
        closingPointOutlineColor: pink
      }
    }
  }

  $effect(() => {
    if (resourceMap) {
      polygonMode = new TerraDrawPolygonMode(getModeOptions())

      resourceDraw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map: resourceMap
        }),
        modes: [polygonMode],
        idStrategy
      })

      resourceDraw.start()
      resourceDraw.setMode('polygon')
      resourceDraw.on('change', handleDrawChange)
      resourceDraw.on('finish', handleDrawFinish)

      resourceMapReady = true
    }
  })

  $effect(() => {
    if (mapsState.activeMapId) {
      makeResourceMaskFeatureActive(mapsState.activeMapId, true)
    }
  })

  $effect(() => {
    if (
      resourceMapReady &&
      transformer &&
      resourceDraw &&
      mapsState.connected === true &&
      mapsState.connectedImageId !== currentMapsImageId
    ) {
      initializeMaps(transformer, resourceDraw, mapsState.maps)
    }
  })

  onMount(() => {
    uiState.addEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)

    mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
    mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

    mapsState.addEventListener(
      MapsEvents.INSERT_RESOURCE_MASK_POINT,
      handleInsertResourceMaskPoint
    )
    mapsState.addEventListener(
      MapsEvents.REPLACE_RESOURCE_MASK_POINT,
      handleReplaceResourceMaskPoint
    )
    mapsState.addEventListener(
      MapsEvents.REMOVE_RESOURCE_MASK_POINT,
      handleRemoveResourceMaskPoint
    )

    return () => {
      saveViewport()

      uiState.removeEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)

      mapsState.removeEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
      mapsState.removeEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

      mapsState.removeEventListener(
        MapsEvents.INSERT_RESOURCE_MASK_POINT,
        handleInsertResourceMaskPoint
      )
      mapsState.removeEventListener(
        MapsEvents.REPLACE_RESOURCE_MASK_POINT,
        handleReplaceResourceMaskPoint
      )
      mapsState.removeEventListener(
        MapsEvents.REMOVE_RESOURCE_MASK_POINT,
        handleRemoveResourceMaskPoint
      )
    }
  })
</script>

<div class="relative w-full h-full">
  <!-- initialBounds -->
  <Resource bind:resourceMap bind:transformer bind:bounds />
  {#if isDrawing}
    <div
      transition:fade={{ duration: 50 }}
      class="absolute top-16 w-full flex justify-center gap-2"
    >
      <button
        onclick={abortDrawing}
        class="bg-red z-50 p-2 rounded-md text-sm flex items-center gap-1"
      >
        <XIcon class="size-4" weight="bold" />
        <span>Cancel</span>
      </button>

      <button
        onclick={finishDrawing}
        disabled={!canFinishDrawing}
        class="bg-green z-50 p-2 rounded-md text-sm flex items-center gap-1 transition-opacity disabled:opacity-50"
      >
        <CheckIcon class="size-4" weight="bold" />
        <span>Finish</span>
      </button>
    </div>
  {/if}
</div>
