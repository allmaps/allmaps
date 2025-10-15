<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { TerraDraw, TerraDrawPolygonMode } from 'terra-draw'
  import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

  import { pink } from '@allmaps/tailwind'
  import { computeBbox, combineBboxes } from '@allmaps/stdlib'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { generateId } from '$lib/shared/ids.js'
  import { polygonDifference } from '$lib/shared/geometry.js'
  import { getResourceMask } from '$lib/shared/maps.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'
  import { UiEvents } from '$lib/shared/ui-events.js'
  import {
    idStrategy,
    pointerEvents,
    ensureStringId,
    clearFeatures
  } from '$lib/shared/terra-draw.js'

  import Resource from '$lib/components/maplibre/Resource.svelte'
  import YesNo from '$lib/components/YesNo.svelte'

  import type { GeoJSONStoreFeatures } from 'terra-draw'
  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { GcpTransformer } from '@allmaps/transform'

  import type { DbImageService, DbMap3, ResourceMask } from '$lib/types/maps.js'

  import type {
    InsertMapEvent,
    RemoveMapEvent,
    ReplaceResourceMaskEvent,
    ReplaceGcpsEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent,
    ClickedItemEvent
  } from '$lib/types/events.js'

  import {
    MAPLIBRE_PADDING,
    TERRA_DRAW_COORDINATE_PRECISION
  } from '$lib/shared/constants.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const viewportsState = getViewportsState()
  const uiState = getUiState()

  let resourceMap = $state.raw<MapLibreMap>()
  let transformer = $state.raw<GcpTransformer>()
  let warpedMapLayerBounds = $state.raw<LngLatBoundsLike>()

  let polygonMode: TerraDrawPolygonMode | undefined
  let resourceDraw: TerraDraw | undefined

  let resourceMapReady = $state(false)

  let isDrawing = $state(false)
  let currentlyDrawingMapId = $state<string>()
  let canFinishDrawing = $state(true)

  let currentDisplayImageId = $state<string>()

  let activeMapId = $state<string>()

  const resourceViewport = $derived(
    viewportsState.getViewport({
      imageId: mapsState.connectedImageId,
      view: 'mask'
    })
  )

  function handleLastClickedItem(event: ClickedItemEvent) {
    if (resourceDraw && event.detail.type === 'map') {
      const resourceFeature = resourceDraw.getSnapshotFeature(
        event.detail.mapId
      )

      if (resourceFeature) {
        const bbox = computeBbox(resourceFeature.geometry)

        makeResourceMaskFeatureActive(event.detail.mapId, true)

        resourceMap?.fitBounds(bbox, {
          duration: 200,
          padding: MAPLIBRE_PADDING
        })
      }
    }
  }

  function handleZoomToExtent() {
    if (resourceMap && resourceDraw) {
      const resourceFeatures = resourceDraw.getSnapshot()

      const bboxes = resourceFeatures.map((feature) =>
        computeBbox(feature.geometry)
      )
      const bbox = combineBboxes(...bboxes)

      if (bbox) {
        resourceMap.fitBounds(bbox, {
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

    const geoCoordinates = transformer.transformToGeo([
      ...resourceMask,
      resourceMask[0]
    ])

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

  function resourcePointBelongsToActiveMap(
    pointId?: string | number,
    featureId?: string | number
  ) {
    if (pointId && featureId) {
      const feature = resourceDraw?.getSnapshotFeature(featureId)

      if (feature && Array.isArray(feature.properties.coordinatePointIds)) {
        return feature.properties.coordinatePointIds.includes(pointId)
      }
    }

    return false
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
    imageId: string,
    maps: DbMap3[]
  ) {
    clearFeatures(resourceDraw)
    maps.forEach((map) => addFeature(transformer, resourceDraw, map))

    const resourceViewport = viewportsState.getViewport({
      imageId,
      view: 'mask'
    })

    if (resourceViewport) {
      resourceMap?.flyTo({
        ...resourceViewport,
        duration: 0,
        padding: MAPLIBRE_PADDING
      })
    } else if (warpedMapLayerBounds) {
      resourceMap?.fitBounds(warpedMapLayerBounds, {
        duration: 0,
        padding: MAPLIBRE_PADDING
      })
    }

    currentDisplayImageId = imageId
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
        const id = ensureStringId(ids[0])
        if (id === currentlyDrawingMapId) {
        }

        if (id && resourceDraw && getPolygonFeature(resourceDraw, id)) {
          makeResourceMaskFeatureActive(id)
        }
      } else if (type === 'create') {
        const id = ensureStringId(ids[0])

        if (
          !hasApiOrigin &&
          resourceDraw &&
          getPolygonFeature(resourceDraw, id)
        ) {
          currentlyDrawingMapId = id
          isDrawing = true
        }
      } else if (type === 'delete') {
        if (!hasApiOrigin) {
          currentlyDrawingMapId = undefined
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
      currentlyDrawingMapId = undefined
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

  function handleReplaceResourceMask(event: ReplaceResourceMaskEvent) {
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
      pointerEvents,
      styles: {
        fillColor: '#ffffff' as `#${string}`,
        fillOpacity: ({ id }: { id?: number | string }) =>
          activeMapId === id ? 0.3 : 0,

        outlineColor: pink as `#${string}`,
        outlineWidth: ({ id }: { id?: number | string }) =>
          activeMapId === id ? 5 : 3.5,

        editedPointWidth: 4,
        editedPointColor: '#ffffff' as `#${string}`,
        editedPointOutlineWidth: 3,
        editedPointOutlineColor: pink,

        coordinatePointWidth: ({ id }: { id?: number | string }) =>
          resourcePointBelongsToActiveMap(id, activeMapId) ? 3 : 0,
        coordinatePointColor: '#ffffff' as `#${string}`,
        coordinatePointOutlineWidth: 4.5,
        coordinatePointOutlineColor: pink,

        closingPointWidth: 4,
        closingPointColor: '#ffffff' as `#${string}`,
        closingPointOutlineWidth: 3,
        closingPointOutlineColor: pink
      }
    }
  }

  $effect(() => {
    if (resourceMap) {
      polygonMode = new TerraDrawPolygonMode(getModeOptions())

      resourceDraw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map: resourceMap,
          coordinatePrecision: TERRA_DRAW_COORDINATE_PRECISION,
          ignoreMismatchedPointerEvents: true
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
      mapsState.connectedImageId &&
      mapsState.connectedImageId !== currentDisplayImageId
    ) {
      initializeMaps(
        transformer,
        resourceDraw,
        mapsState.connectedImageId,
        mapsState.maps
      )
    }
  })

  $effect(() => {
    if (sourceState.activeImageId) {
      clearFeatures(resourceDraw)
    }
  })

  onMount(() => {
    uiState.addEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)
    uiState.addEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)

    mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
    mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

    mapsState.addEventListener(
      MapsEvents.REPLACE_RESOURCE_MASK,
      handleReplaceResourceMask
    )

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
      uiState.removeEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)

      mapsState.removeEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
      mapsState.removeEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

      mapsState.removeEventListener(
        MapsEvents.REPLACE_RESOURCE_MASK,
        handleReplaceResourceMask
      )

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

<div class="relative h-full w-full">
  {#if mapsState.connectedImageId}
    <Resource
      bind:resourceMap
      bind:transformer
      bind:warpedMapLayerBounds
      resourceMask={mapsState.activeMap?.resourceMask}
      initialViewport={resourceViewport}
    />
  {/if}
  {#if isDrawing}
    <div
      class="pointer-events-none absolute top-16 flex w-full items-center justify-center"
    >
      <div
        transition:fade={{ duration: 100 }}
        class="pointer-events-auto flex gap-2 rounded-lg bg-white p-1 font-medium
          shadow"
      >
        <YesNo
          yes="Finish"
          no="Cancel"
          onYes={finishDrawing}
          onNo={abortDrawing}
          yesDisabled={!canFinishDrawing}
        />
      </div>
    </div>
  {/if}
</div>
