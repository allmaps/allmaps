<script lang="ts">
  import { onMount } from 'svelte'

  import { Map as MapLibreMap, LngLatBounds } from 'maplibre-gl'

  import { TerraDraw, TerraDrawPointMode } from 'terra-draw'

  import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

  import { pink } from '@allmaps/tailwind'
  import { computeBbox, combineBboxes } from '@allmaps/stdlib'

  import { getProjectionsState } from '@allmaps/components/state'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'

  import {
    getNavPlaceViewport,
    getBboxViewport,
    sortGeoViewports
  } from '$lib/shared/viewport.js'
  import {
    getGcpResourcePoint,
    getGcpGeoPoint,
    createMapWithFullImageResourceMask,
    getSortedGcps,
    getFullMapId
  } from '$lib/shared/maps.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'
  import { UiEvents } from '$lib/shared/ui-events.js'
  import {
    idStrategy,
    pointerEvents,
    ensureStringId,
    clearFeatures
  } from '$lib/shared/terra-draw.js'
  import {
    MAPLIBRE_PADDING,
    MAPLIBRE_FIT_BOUNDS_DURATION,
    TERRA_DRAW_COORDINATE_PRECISION
  } from '$lib/shared/constants.js'

  import type { GeoJSONStoreFeatures } from 'terra-draw'
  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { GcpTransformer } from '@allmaps/transform'
  import type { Bbox } from '@allmaps/types'

  import Resource from '$lib/components/maplibre/Resource.svelte'
  import Geo from '$lib/components/maplibre/Geo.svelte'

  import type { DbMap3, DbGcp3 } from '$lib/types/maps.js'
  import type { Point, GcpCoordinates, Viewport } from '$lib/types/shared.js'
  import type {
    ReplaceGcpsEvent,
    InsertGcpEvent,
    ReplaceGcpEvent,
    RemoveGcpEvent,
    ClickedItemEvent
  } from '$lib/types/events.js'

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const uiState = getUiState()
  const urlState = getUrlState()
  const viewportsState = getViewportsState()
  const projectionsState = getProjectionsState()

  let resourceMap = $state.raw<MapLibreMap>()
  let geoMap = $state.raw<MapLibreMap>()

  let resourceTransformer = $state.raw<GcpTransformer>()

  let mapIds = $derived(
    mapsState.activeMapId ? [getFullMapId(mapsState.activeMapId)] : []
  )

  let resourceDraw: TerraDraw | undefined
  let geoDraw: TerraDraw | undefined

  let resourceMapReady = $state(false)
  let geoMapReady = $state(false)
  let mapsReady = $derived(resourceMapReady && geoMapReady)

  const resourceViewport = $derived(
    viewportsState.getViewport({
      imageId: mapsState.connectedImageId,
      mapId: mapsState.activeMapId,
      view: 'georeference',
      pane: 'resource'
    })
  )

  const geoViewport = $derived(
    viewportsState.getViewport({
      imageId: mapsState.connectedImageId,
      mapId: mapsState.activeMapId,
      view: 'georeference',
      pane: 'geo'
    })
  )

  let currentDisplayImageId = $state<string>()
  let currentDisplayMapId = $state<string>()

  let activeGcpId = $state<string>()

  function getHighestGcpIndex(gcps: DbGcp3[]) {
    return gcps.reduce((highestIndex, gcp) => {
      const gcpIndex = gcp.index || 0
      return gcpIndex > highestIndex ? gcpIndex : highestIndex
    }, 0)
  }

  function getFirstGcpWithMissingResourcePoint(incompleteGcps: DbGcp3[]) {
    return getSortedGcps(incompleteGcps).find(
      (gcp) => !getGcpResourcePoint(gcp)
    )
  }

  function getFirstGcpWithMissingGeoPoint(incompleteGcps: DbGcp3[]) {
    return getSortedGcps(incompleteGcps).find((gcp) => !getGcpGeoPoint(gcp))
  }

  function removeGcp(gcpId: string) {
    if (resourceDraw && resourceDraw.getSnapshotFeature(gcpId)) {
      resourceDraw.removeFeatures([gcpId])
    }

    if (geoDraw && geoDraw.getSnapshotFeature(gcpId)) {
      geoDraw.removeFeatures([gcpId])
    }

    updateDisplayIndexes()
  }

  function handleReplaceGcps(event: ReplaceGcpsEvent) {
    const mapId = event.detail.mapId

    if (
      mapId === currentDisplayMapId &&
      mapsState.connectedImageId &&
      mapsState.activeMap
    ) {
      initializeGcps(mapsState.connectedImageId, mapsState.activeMap)
    }
  }

  function handleInsertGcp(event: InsertGcpEvent) {
    const mapId = event.detail.mapId
    if (mapId === currentDisplayMapId) {
      addGcp(event.detail.gcp)
    }
  }

  function handleReplaceGcp(event: ReplaceGcpEvent) {
    const mapId = event.detail.mapId
    if (mapId === currentDisplayMapId) {
      const gcpId = event.detail.gcp.id
      replaceGcpFromState(gcpId)
    }
  }

  function handleRemoveGcp(event: RemoveGcpEvent) {
    if (!resourceDraw || !geoDraw) {
      return
    }

    const mapId = event.detail.mapId
    if (mapId === currentDisplayMapId) {
      const gcpId = event.detail.gcpId
      removeGcp(gcpId)
    }
  }

  function getGeoViewport(
    imageId: string,
    mapId: string
  ): Viewport | undefined {
    let stateGeoViewport: Viewport | undefined
    let navPlaceGeoViewport: Viewport | undefined
    let urlGeoViewport: Viewport | undefined
    let dataGeoViewport: Viewport | undefined

    if (geoMap) {
      navPlaceGeoViewport = getNavPlaceViewport(sourceState.navPlace)
      urlGeoViewport = getBboxViewport(urlState.params.bbox)

      if (mapsState.activeMap?.gcps) {
        // TODO: get viewport from data
        //   dataGeoViewport = getBboxViewport(
        //   geoMap,
        //   mapsState.activeMap?.gcps
        // )
      }
    }

    if (imageId) {
      stateGeoViewport = viewportsState.getViewport({
        imageId,
        mapId,
        view: 'georeference',
        pane: 'geo'
      })
    }

    const geoViewports = sortGeoViewports({
      state: stateGeoViewport,
      navPlace: navPlaceGeoViewport,
      url: urlGeoViewport,
      data: dataGeoViewport
    })

    return geoViewports[0]
  }

  function saveViewport() {
    if (currentDisplayImageId && resourceMap && geoMap) {
      const resourceZoom = resourceMap.getZoom()
      const resourceCenter = resourceMap.getCenter()
      const resourceBearing = resourceMap.getBearing()
      const geoZoom = geoMap.getZoom()
      const geoCenter = geoMap.getCenter()
      const geoBearing = geoMap.getBearing()

      viewportsState.saveViewport(
        {
          imageId: currentDisplayImageId,
          mapId: currentDisplayMapId,
          view: 'georeference',
          pane: 'resource'
        },
        {
          zoom: resourceZoom,
          center: resourceCenter.toArray(),
          bearing: resourceBearing
        }
      )

      viewportsState.saveViewport(
        {
          imageId: currentDisplayImageId,
          mapId: currentDisplayMapId,
          view: 'georeference',
          pane: 'geo'
        },
        {
          zoom: geoZoom,
          center: geoCenter.toArray(),
          bearing: geoBearing
        }
      )
    }
  }

  function handleLastClickedItem(event: ClickedItemEvent) {
    if (event.detail.type === 'gcp') {
      const resourceGcpFeature = resourceDraw?.getSnapshotFeature(
        event.detail.gcpId
      )
      const geoGcpFeature = geoDraw?.getSnapshotFeature(event.detail.gcpId)

      if (resourceGcpFeature) {
        resourceMap?.flyTo({
          center: resourceGcpFeature.geometry.coordinates as Point,
          duration: MAPLIBRE_FIT_BOUNDS_DURATION
        })
      }

      if (geoGcpFeature) {
        geoMap?.flyTo({
          center: geoGcpFeature.geometry.coordinates as Point,
          duration: MAPLIBRE_FIT_BOUNDS_DURATION
        })
      }
    } else if (event.detail.type === 'map') {
      const map = mapsState.getMapById(event.detail.mapId)

      if (mapsState.connectedImageId && map) {
        initializeGcps(mapsState.connectedImageId, map, true)
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

    if (geoMap && geoDraw) {
      const resourceFeatures = geoDraw.getSnapshot()

      const bboxes = resourceFeatures.map((feature) =>
        computeBbox(feature.geometry)
      )
      const bbox = combineBboxes(...bboxes)

      if (bbox) {
        geoMap.fitBounds(bbox, {
          duration: 200,
          padding: MAPLIBRE_PADDING
        })
      }
    }
  }

  function handleFitBbox(event: CustomEvent<Bbox>) {
    geoMap?.fitBounds(event.detail, {
      duration: MAPLIBRE_FIT_BOUNDS_DURATION,
      padding: MAPLIBRE_PADDING
    })
  }

  function handleSetCenter(event: CustomEvent<Point>) {
    geoMap?.setCenter(event.detail, {
      duration: MAPLIBRE_FIT_BOUNDS_DURATION
    })
  }

  function handleToggleRenderMasks() {
    uiState.georeferenceOptions.renderMasks =
      !uiState.georeferenceOptions.renderMasks
  }

  function replaceGcpFromState(gcpId: string) {
    if (!resourceDraw || !geoDraw) {
      console.error('Cannot set GCPs, maps not ready')
      return
    }

    const gcp = mapsState.activeMap?.gcps[gcpId]
    if (gcp) {
      removeGcp(gcp.id)
      addGcp(gcp)
    } else {
      console.error(`Error setting new geometries for GCP ${gcpId}`)
    }
  }

  function makeGcpFeatureActive(gcpId?: string, redraw = false) {
    activeGcpId = gcpId

    if (resourceDraw && geoDraw && redraw) {
      resourceDraw.updateModeOptions('point', getPointDrawOptions())
      geoDraw.updateModeOptions('point', getPointDrawOptions())
    }
  }

  function handleResourceDrawChange(ids: (string | number)[], type: string) {
    if (type === 'update' && ids.length === 1) {
      const gcpId = ensureStringId(ids[0])
      makeGcpFeatureActive(gcpId)
    }
  }

  function handleResourceDrawFinish(
    id: string | number,
    context: { action: string; mode: string }
  ) {
    const gcpId = ensureStringId(id)
    if (context.action === 'edit') {
      handleDrawFinishEdited(gcpId)
    } else if (resourceDraw && context.action === 'draw') {
      handleDrawFinishDrawn(resourceDraw, gcpId)
    }
  }

  function handleGeoDrawChange(ids: (string | number)[], type: string) {
    if (type === 'update' && ids.length === 1) {
      const gcpId = ensureStringId(ids[0])
      makeGcpFeatureActive(gcpId)
    }
  }

  function handleGeoDrawFinish(
    id: string | number,
    context: { action: string; mode: string }
  ) {
    const gcpId = ensureStringId(id)

    if (context.action === 'edit') {
      handleDrawFinishEdited(gcpId)
    } else if (geoDraw && context.action === 'draw') {
      handleDrawFinishDrawn(geoDraw, gcpId)
    }
  }

  function addGcp(gcp: DbGcp3) {
    if (!resourceDraw || !geoDraw) {
      console.error('Cannot set GCPs, maps not ready')
      return
    }

    const displayIndex = displayIndexFromGcpId(gcp.id)

    const resourceFeature = createResourceGcpFeature(gcp, displayIndex)
    const geoFeature = createGeoGcpFeature(gcp, displayIndex)

    if (resourceFeature) {
      resourceDraw.addFeatures([resourceFeature])
    }

    if (geoFeature) {
      geoDraw.addFeatures([geoFeature])
    }

    return {
      resource: resourceFeature,
      geo: geoFeature
    }
  }

  function updateDisplayIndexes() {
    if (!resourceDraw || !geoDraw) {
      return
    }

    const map = mapsState.activeMap

    if (!map) {
      return
    }

    for (const gcp of getSortedGcps(Object.values(map.gcps))) {
      if (resourceDraw.hasFeature(gcp.id)) {
        resourceDraw.updateFeatureProperties(gcp.id, {
          displayIndex: displayIndexFromGcpId(gcp.id)
        })
      }

      if (geoDraw.hasFeature(gcp.id)) {
        geoDraw.updateFeatureProperties(gcp.id, {
          displayIndex: displayIndexFromGcpId(gcp.id)
        })
      }
    }
  }

  function gcpCoordinatesFromGcpId(gcpId: string): GcpCoordinates {
    if (resourceDraw && geoDraw && resourceTransformer) {
      let resourcePoint: Point | undefined
      let geoPoint: Point | undefined

      const resourceFeature = resourceDraw.getSnapshotFeature(gcpId)
      const geoFeature = geoDraw.getSnapshotFeature(gcpId)

      if (resourceFeature) {
        resourcePoint = resourceFeatureToPoint(
          resourceTransformer,
          resourceFeature
        )
      }

      if (geoFeature) {
        geoPoint = geoFeatureToPoint(geoFeature)
      }

      if (resourcePoint || geoPoint) {
        return {
          resource: resourcePoint,
          geo: geoPoint
        }
      }
    }

    throw new Error(`Cannot create GCP for ${gcpId}`)
  }

  function resourceFeatureToPoint(
    transformer: GcpTransformer,
    feature: GeoJSONStoreFeatures
  ): Point {
    if (feature.geometry.type !== 'Point') {
      throw new Error('Feature is not a point!')
    }

    const coordinates = feature.geometry.coordinates as [number, number]
    const resourceCoordinates = transformer.transformToResource(coordinates)

    const point: Point = [
      Math.round(resourceCoordinates[0]),
      Math.round(resourceCoordinates[1])
    ]

    return point
  }

  function geoFeatureToPoint(feature: GeoJSONStoreFeatures) {
    if (feature.geometry.type !== 'Point') {
      throw new Error('Feature is not a point!')
    }

    const coordinates: Point = [
      feature.geometry.coordinates[0],
      feature.geometry.coordinates[1]
    ]

    return coordinates
  }

  function displayIndexFromGcpId(gcpId: string): number {
    const map = mapsState.activeMap

    if (map) {
      const sortedGcps = getSortedGcps(Object.values(map.gcps))
      const displayIndex = sortedGcps.findIndex((gcp) => gcp.id === gcpId)

      if (displayIndex !== -1) {
        return displayIndex
      } else {
        return sortedGcps.length - 1
      }
    }

    return 0
  }

  function gcpIndexFromGcpId(gcpId: string): number {
    const map = mapsState.activeMap

    if (map) {
      const sortedGcps = getSortedGcps(Object.values(map.gcps))
      const gcp = sortedGcps.find((gcp) => gcp.id === gcpId)

      if (gcp) {
        return gcp.index || 0
      } else if (sortedGcps.length) {
        const highestIndex = sortedGcps[sortedGcps.length - 1].index || 0
        return Math.floor(highestIndex) + 1 + Math.random()
      }
    }

    return Math.random()
  }

  function gcpFromGcpId(gcpId: string): DbGcp3 {
    const gcpCoordinates = gcpCoordinatesFromGcpId(gcpId)
    const gcpIndex = gcpIndexFromGcpId(gcpId)

    return {
      id: gcpId,
      index: gcpIndex,
      ...gcpCoordinates
    }
  }

  function handleDrawFinishEdited(gcpId: string) {
    const mapId = mapsState.activeMapId

    const gcp = gcpFromGcpId(gcpId)
    if (mapId && gcp) {
      mapsState.replaceGcp({ mapId, gcp })
    } else {
      console.error(`Error setting new geometries for GCP`)
    }
  }

  async function handleDrawFinishDrawn(draw: TerraDraw, newGcpId: string) {
    let existingGcpId: string | undefined

    let linkWithExistingGcp: boolean

    const incompleteGcps = mapsState.incompleteGcps

    if (incompleteGcps.length) {
      if (draw === resourceDraw) {
        if (mapsState.activeGcp && !getGcpResourcePoint(mapsState.activeGcp)) {
          existingGcpId = mapsState.activeGcp.id
        } else {
          const gcp = getFirstGcpWithMissingResourcePoint(incompleteGcps)
          existingGcpId = gcp?.id
        }
      } else if (draw === geoDraw) {
        if (mapsState.activeGcp && !getGcpGeoPoint(mapsState.activeGcp)) {
          existingGcpId = mapsState.activeGcp.id
        } else {
          const gcp = getFirstGcpWithMissingGeoPoint(incompleteGcps)
          existingGcpId = gcp?.id
        }
      }
    }

    let gcpId: string

    if (existingGcpId) {
      linkWithExistingGcp = true
      gcpId = existingGcpId
    } else {
      linkWithExistingGcp = false
      gcpId = newGcpId
    }

    if (linkWithExistingGcp && existingGcpId) {
      const newGcp = gcpFromGcpId(newGcpId)
      const existingGcp = gcpFromGcpId(existingGcpId)
      draw.removeFeatures([newGcpId])

      addGcp({
        id: existingGcpId,
        index: Math.max(newGcp.index || 0, existingGcp.index || 0),
        resource: newGcp.resource || existingGcp.resource,
        geo: newGcp.geo || existingGcp.geo
      })
    } else {
      const displayIndex = displayIndexFromGcpId(gcpId) + 1
      draw.updateFeatureProperties(gcpId, {
        displayIndex
      })
    }

    const gcp = gcpFromGcpId(gcpId)
    if (mapsState.activeMap) {
      const mapId = mapsState.activeMap.id

      if (linkWithExistingGcp) {
        mapsState.replaceGcp({ mapId, gcp })
      } else {
        mapsState.insertGcp({ mapId, gcp })
      }
    } else if (sourceState.activeImage) {
      const map = {
        ...(await createMapWithFullImageResourceMask(
          sourceState.activeImage,
          mapsState.mapsCount + Math.random()
        )),
        gcps: { [gcp.id]: gcp }
      }
      currentDisplayMapId = map.id
      mapsState.insertMap({
        mapId: map.id,
        map
      })
    } else {
      console.error('No active map or image')
    }
  }

  function createResourceGcpFeature(gcp: DbGcp3, displayIndex: number) {
    if (!resourceTransformer) {
      console.error('Cannot create resource feature, transformer not set')
      return
    }

    const resourcePoint = getGcpResourcePoint(gcp)
    if (resourcePoint) {
      const resourceCoordinates =
        resourceTransformer.transformToGeo(resourcePoint)
      return createGcpFeature(gcp.id, resourceCoordinates, displayIndex)
    }
  }

  function createGeoGcpFeature(gcp: DbGcp3, displayIndex: number) {
    const geoPoint = getGcpGeoPoint(gcp)
    if (geoPoint) {
      return createGcpFeature(gcp.id, geoPoint, displayIndex)
    }
  }

  function createGcpFeature(
    id: string,
    coordinates: Point,
    displayIndex: number
  ) {
    // if (!index) {
    //   index = Math.random()
    // }

    return {
      type: 'Feature' as const,
      id,
      geometry: {
        type: 'Point' as const,
        coordinates
      },
      properties: {
        mode: 'point',
        displayIndex
      }
    }
  }

  function resetGcps() {
    if (!resourceDraw || !geoDraw) {
      console.error('Cannot reset GCPs, maps not ready')
      return
    }

    clearFeatures(resourceDraw, 'point')
    clearFeatures(geoDraw, 'point')

    currentDisplayImageId = undefined
    currentDisplayMapId = undefined
  }

  function initializeGcps(imageId: string, map: DbMap3, animate = false) {
    resetGcps()

    const gcpFeatures = Object.values(map.gcps).map(addGcp)

    let resourceViewport: Viewport | undefined
    let geoViewport: Viewport | undefined

    resourceViewport = viewportsState.getViewport({
      imageId,
      mapId: map.id,
      view: 'georeference',
      pane: 'resource'
    })

    geoViewport = getGeoViewport(imageId, map.id)

    let resourceBbox: Bbox | undefined
    let geoBbox: Bbox | undefined

    gcpFeatures.forEach((gcpFeature) => {
      if (gcpFeature) {
        const resourceFeature = gcpFeature.resource
        const geoFeature = gcpFeature.geo

        if (resourceFeature) {
          const bbox = computeBbox(resourceFeature.geometry)

          if (resourceBbox) {
            resourceBbox = combineBboxes(resourceBbox, bbox)
          } else {
            resourceBbox = bbox
          }
        }

        if (geoFeature) {
          const bbox = computeBbox(geoFeature.geometry)

          if (geoBbox) {
            geoBbox = combineBboxes(geoBbox, bbox)
          } else {
            geoBbox = bbox
          }
        }
      }
    })

    const duration = animate ? 300 : 0

    if (resourceViewport) {
      resourceMap?.flyTo({
        ...resourceViewport,
        duration,
        padding: MAPLIBRE_PADDING
      })
    } else if (resourceBbox) {
      resourceMap?.fitBounds(resourceBbox, {
        duration,
        padding: MAPLIBRE_PADDING
      })
    }

    if (geoViewport) {
      geoMap?.flyTo({
        ...geoViewport,
        duration,
        padding: MAPLIBRE_PADDING
      })
    } else if (geoBbox) {
      geoMap?.fitBounds(geoBbox, { padding: MAPLIBRE_PADDING, duration })
    }

    currentDisplayImageId = imageId
    currentDisplayMapId = map.id
  }

  function getPointDrawOptions() {
    return {
      editable: true,
      pointerEvents,
      styles: {
        pointColor: pink,
        pointOutlineWidth: ({ id }: { id?: number | string }) =>
          activeGcpId === id ? 6 : 2,
        pointOutlineColor: '#ffffff99' as const,
        pointWidth: ({ id }: { id?: number | string }) =>
          activeGcpId === id ? 5 : 5
      }
    }
  }

  function addLabelLayer(map?: MapLibreMap) {
    if (!map) {
      return
    }

    const sources = map.getStyle().sources

    if (sources['td-point']) {
      map.addLayer({
        id: 'labels',
        type: 'symbol',
        source: 'td-point',
        layout: {
          'text-size': 14,
          'text-field': ['to-string', ['+', 1, ['get', 'displayIndex']]],
          // 'text-field': ['to-string', ['+', 1, ['floor', ['get', 'displayIndex']]]],
          'text-anchor': 'top-left',
          'text-radial-offset': 0.8,
          'text-justify': 'auto',
          'text-font': ['literal', ['Roboto Regular']]
        },
        paint: {
          'text-halo-color': '#ffffff',
          'text-halo-width': 1,
          'text-halo-blur': 0.5
        }
      })
    }
  }

  function handleMoveend(boundsLike: LngLatBoundsLike) {
    let bounds = LngLatBounds.convert(boundsLike)
    const bbox = bounds.toArray().flat() as Bbox
    uiState.lastBbox = bbox
  }

  $effect(() => {
    if (mapsState.activeGcpId) {
      makeGcpFeatureActive(mapsState.activeGcpId, true)
    }
  })

  $effect(() => {
    if (
      mapsReady &&
      mapsState.connected &&
      mapsState.activeMapId !== currentDisplayMapId &&
      mapsState.connectedImageId &&
      mapsState.connectedImageId !== currentDisplayImageId
    ) {
      if (mapsState.activeMap) {
        initializeGcps(mapsState.connectedImageId, mapsState.activeMap)
      } else {
        resetGcps()
      }
    }
  })

  $effect(() => {
    if (resourceMap) {
      const resourcePointMode = new TerraDrawPointMode(getPointDrawOptions())

      resourceDraw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map: resourceMap,
          coordinatePrecision: TERRA_DRAW_COORDINATE_PRECISION,
          ignoreMismatchedPointerEvents: true
        }),
        modes: [resourcePointMode],
        idStrategy
      })

      resourceDraw.start()
      resourceDraw.setMode('point')
      resourceDraw.on('change', handleResourceDrawChange)
      resourceDraw.on('finish', handleResourceDrawFinish)

      addLabelLayer(resourceMap)

      resourceMapReady = true
    }
  })

  $effect(() => {
    if (geoMap) {
      const geoPointMode = new TerraDrawPointMode(getPointDrawOptions())

      const adapter = new TerraDrawMapLibreGLAdapter({
        map: geoMap,
        coordinatePrecision: TERRA_DRAW_COORDINATE_PRECISION,
        ignoreMismatchedPointerEvents: true
      })

      geoDraw = new TerraDraw({
        adapter,
        modes: [geoPointMode],
        idStrategy
      })

      geoDraw.start()
      geoDraw.setMode('point')
      geoDraw.on('change', handleGeoDrawChange)
      geoDraw.on('finish', handleGeoDrawFinish)

      // const sources = Object.values(geoMap.getStyle().sources)
      // const layers = Object.values(geoMap.getStyle().layers)

      // const terraDrawSources = sources.filter(isTerraDrawSource)
      // const terraDrawLayers = layers.filter(isTerraDrawLayer)

      addLabelLayer(geoMap)

      geoMapReady = true
    }
  })

  onMount(() => {
    projectionsState.fetchProjections()

    uiState.addEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)
    uiState.addEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)
    uiState.addEventListener(UiEvents.FIT_BBOX, handleFitBbox)
    uiState.addEventListener(UiEvents.SET_CENTER, handleSetCenter)
    uiState.addEventListener(
      UiEvents.TOGGLE_RENDER_MASKS,
      handleToggleRenderMasks
    )

    mapsState.addEventListener(MapsEvents.REPLACE_GCPS, handleReplaceGcps)

    mapsState.addEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
    mapsState.addEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
    mapsState.addEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)

    return () => {
      saveViewport()

      uiState.removeEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)
      uiState.removeEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)
      uiState.removeEventListener(UiEvents.FIT_BBOX, handleFitBbox)
      uiState.removeEventListener(UiEvents.SET_CENTER, handleSetCenter)
      uiState.removeEventListener(
        UiEvents.TOGGLE_RENDER_MASKS,
        handleToggleRenderMasks
      )

      mapsState.removeEventListener(MapsEvents.REPLACE_GCPS, handleReplaceGcps)

      mapsState.removeEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
      mapsState.removeEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
      mapsState.removeEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)
    }
  })
</script>

<div
  class="grid h-full w-full grid-rows-2 gap-0.5 sm:grid-cols-2 sm:grid-rows-1"
>
  <Resource
    bind:resourceMap
    bind:transformer={resourceTransformer}
    initialViewport={resourceViewport}
    resourceMask={mapsState.activeMap?.resourceMask}
    renderMasks={uiState.georeferenceOptions.renderMasks}
  />
  <Geo
    bind:geoMap
    {mapIds}
    initialViewport={geoViewport}
    onmoveend={handleMoveend}
    warpedMapsOpacity={uiState.georeferenceOptions.warpedMapLayerOpacity}
    renderMasks={uiState.georeferenceOptions.renderMasks}
  />
</div>
