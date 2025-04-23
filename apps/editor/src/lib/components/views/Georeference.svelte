<script lang="ts">
  import { onMount } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import {
    TerraDraw,
    TerraDrawPointMode,
    TerraDrawRenderMode
  } from 'terra-draw'

  import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

  import { pink } from '@allmaps/tailwind'
  import { computeBbox, combineBboxes } from '@allmaps/stdlib'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'

  import {
    getExtentViewport,
    getNavPlaceViewport,
    getBboxViewport,
    sortGeoViewports
  } from '$lib/shared/viewport.js'
  import {
    getGcpResourcePoint,
    getGcpGeoPoint,
    createMapWithFullImageResourceMask,
    getSortedGcps
  } from '$lib/shared/maps.js'
  import { roundWithDecimals } from '$lib/shared/math.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'
  import { UiEvents } from '$lib/shared/ui-events.js'
  import { idStrategy, ensureStringId } from '$lib/shared/terra-draw.js'
  import { MAPLIBRE_PADDING } from '$lib/shared/constants.js'

  import type { GeoJSONStoreFeatures } from 'terra-draw'

  import type { GcpTransformer } from '@allmaps/transform'
  import type { Bbox } from '@allmaps/types'

  import type { DbImageService, DbMap, ResourceMask } from '$lib/types/maps.js'

  import Resource from '$lib/components/maplibre/Resource.svelte'
  import Geo from '$lib/components/maplibre/Geo.svelte'

  import type { DbMap3, DbGcp3 } from '$lib/types/maps.js'
  import type { Point, GcpCoordinates, Viewport } from '$lib/types/shared.js'
  import type {
    InsertMapEvent,
    RemoveMapEvent,
    InsertGcpEvent,
    ReplaceGcpEvent,
    RemoveGcpEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent,
    ClickedItemEvent
  } from '$lib/types/events.js'

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const uiState = getUiState()
  const imageInfoState = getImageInfoState()
  const urlState = getUrlState()
  const viewportsState = getViewportsState()

  let resourceMap = $state.raw<MapLibreMap>()
  let geoMap = $state.raw<MapLibreMap>()

  let transformer = $state.raw<GcpTransformer>()

  let resourceDraw: TerraDraw | undefined
  let geoDraw: TerraDraw | undefined

  let resourceMapReady = $state(false)
  let geoMapReady = $state(false)
  let mapsReady = $derived(resourceMapReady && geoMapReady)

  let currentActiveMapId = $state<string>()

  let activeGcpId = $state<string>()
  // let geoActiveTerraDrawId = $state<string>()

  function getFirstGcpWithMissingResourcePoint(incompleteGcps: DbGcp3[]) {
    return getSortedGcps(incompleteGcps).find(
      (gcp) => !getGcpResourcePoint(gcp)
    )
  }

  function getFirstGcpWithMissingGeoPoint(incompleteGcps: DbGcp3[]) {
    return getSortedGcps(incompleteGcps).find((gcp) => !getGcpGeoPoint(gcp))
  }

  function handleInsertMap(event: InsertMapEvent) {
    addMap(event.detail.map)
  }

  function handleRemoveMap(event: RemoveMapEvent) {
    const mapId = event.detail.mapId
    removeMap(mapId)
  }

  function handleInsertGcp(event: InsertGcpEvent) {
    const mapId = event.detail.mapId
    if (mapId === currentActiveMapId) {
      addGcp(event.detail.gcp)
    }

    replaceMapFromState(mapId)
  }

  function handleReplaceGcp(event: ReplaceGcpEvent) {
    const mapId = event.detail.mapId
    if (mapId === currentActiveMapId) {
      const gcpId = event.detail.gcp.id
      replaceGcpFromState(gcpId)
    }

    replaceMapFromState(mapId)
  }

  function handleRemoveGcp(event: RemoveGcpEvent) {
    if (!resourceDraw || !geoDraw) {
      return
    }

    const mapId = event.detail.mapId
    if (mapId === currentActiveMapId) {
      const gcpId = event.detail.gcpId
      resourceDraw.removeFeatures([gcpId])
      geoDraw.removeFeatures([gcpId])
    }

    replaceMapFromState(mapId)
  }

  function handleInsertResourceMaskPoint(event: InsertResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceMapFromState(mapId)
  }

  function handleReplaceResourceMaskPoint(
    event: ReplaceResourceMaskPointEvent
  ) {
    const mapId = event.detail.mapId
    replaceMapFromState(mapId)
  }

  function handleRemoveResourceMaskPoint(event: RemoveResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    replaceMapFromState(mapId)
  }

  function saveViewport() {
    // if (currentDisplayImageId && resourceOlMap && geoOlMap) {
    //   const resourceZoom = resourceOlMap.getView().getZoom()
    //   const resourceCenter = resourceOlMap.getView().getCenter()
    //   const resourceRotation = resourceOlMap.getView().getRotation()
    //   const geoZoom = geoOlMap.getView().getZoom()
    //   const geoCenter = geoOlMap.getView().getCenter()
    //   const geoRotation = geoOlMap.getView().getRotation()
    //   if (resourceZoom && resourceCenter) {
    //     viewportsState.saveViewport(
    //       {
    //         imageId: currentDisplayImageId,
    //         view: 'georeference',
    //         pane: 'resource'
    //       },
    //       {
    //         zoom: resourceZoom,
    //         center: resourceCenter,
    //         rotation: resourceRotation
    //       }
    //     )
    //   }
    //   if (geoZoom && geoCenter) {
    //     viewportsState.saveViewport(
    //       {
    //         imageId: currentDisplayImageId,
    //         view: 'georeference',
    //         pane: 'geo'
    //       },
    //       {
    //         zoom: geoZoom,
    //         center: geoCenter,
    //         rotation: geoRotation
    //       }
    //     )
    //   }
    // }
  }

  function handleLastClickedItem(event: ClickedItemEvent) {
    if (event.detail.type === 'gcp') {
      // const resourceGcpFeature = resourceGcpVectorSource?.getFeatureById(
      //   event.detail.gcpId
      // )
      // const geoGcpFeature = geoGcpVectorSource?.getFeatureById(
      //   event.detail.gcpId
      // )
      // const resourceGcpGeometry = resourceGcpFeature?.getGeometry()
      // const geoGcpGeometry = geoGcpFeature?.getGeometry()
      // if (resourceGcpGeometry) {
      //   resourceOlMap?.getView().fit(resourceGcpGeometry, {
      //     duration: 200,
      //     padding: [25, 25, 25, 25]
      //   })
      // }
      // if (geoGcpGeometry) {
      //   geoOlMap?.getView().fit(geoGcpGeometry, {
      //     duration: 200,
      //     padding: [25, 25, 25, 25]
      //   })
      // }
    } else if (event.detail.type === 'map') {
      // const resourceMaskFeature = resourceMaskVectorSource?.getFeatureById(
      //   event.detail.mapId
      // )
      // const geoMaskFeature = geoMaskVectorSource?.getFeatureById(
      //   event.detail.mapId
      // )
      // const resourceMaskGeometry = resourceMaskFeature?.getGeometry()
      // const geoMaskGeometry = geoMaskFeature?.getGeometry()
      // if (resourceMaskGeometry) {
      //   resourceOlMap?.getView().fit(resourceMaskGeometry, {
      //     duration: 200,
      //     padding: [25, 25, 25, 25]
      //   })
      // }
      // if (geoMaskGeometry) {
      //   geoOlMap?.getView().fit(geoMaskGeometry, {
      //     duration: 200,
      //     padding: [25, 25, 25, 25]
      //   })
      // }
    }
  }

  function addMap(map: DbMap) {
    // if (!resourceMaskVectorSource || !geoMaskVectorSource) {
    //   return
    // }
    // const resourceMaskPolygon = getResourceMaskPolygon(map)
    // const geoMaskPolygon = getGeoMaskPolygon(map)
    // if (resourceMaskPolygon) {
    //   const resourceMaskFeature = new Feature({
    //     geometry: resourceMaskPolygon
    //   })
    //   resourceMaskFeature.setId(map.id)
    //   resourceMaskVectorSource.addFeature(resourceMaskFeature)
    // }
    // if (geoMaskPolygon) {
    //   const geoMaskFeature = new Feature({
    //     geometry: geoMaskPolygon
    //   })
    //   geoMaskFeature.setId(map.id)
    //   geoMaskVectorSource.addFeature(geoMaskFeature)
    // }
  }

  function removeMap(mapId: string) {
    // if (
    //   !resourceGcpVectorSource ||
    //   !geoGcpVectorSource ||
    //   !resourceMaskVectorSource ||
    //   !geoMaskVectorSource
    // ) {
    //   return
    // }

    if (currentActiveMapId === mapId) {
      //   resourceGcpVectorSource.clear()
      //   geoGcpVectorSource.clear()
    }
    // const resourceMaskFeature = resourceMaskVectorSource.getFeatureById(mapId)
    // if (resourceMaskFeature) {
    //   resourceMaskVectorSource.removeFeature(resourceMaskFeature)
    // }
    // const geoMaskFeature = geoMaskVectorSource.getFeatureById(mapId)
    // if (geoMaskFeature) {
    //   geoMaskVectorSource.removeFeature(geoMaskFeature)
    // }
  }

  function replaceMapFromState(mapId: string) {
    // if (!resourceDraw || !geoDraw) {
    //   return
    // }
    // const map = mapsState.getMapById(mapId)
    // if (map) {
    //   const resourceMaskPolygon = getResourceMaskPolygon(map)
    //   const geoMaskPolygon = getGeoMaskPolygon(map)
    //   if (resourceMaskPolygon) {
    //     const resourceMaskFeature =
    //       resourceMaskVectorSource.getFeatureById(mapId)
    //     resourceMaskFeature?.setGeometry(resourceMaskPolygon)
    //   }
    //   if (geoMaskPolygon) {
    //     const geoMaskFeature = geoMaskVectorSource.getFeatureById(mapId)
    //     geoMaskFeature?.setGeometry(geoMaskPolygon)
    //   }
    // }
  }

  function replaceGcpFromState(gcpId: string) {
    if (!resourceDraw || !geoDraw) {
      console.error('Cannot set GCPs, maps not ready')
      return
    }

    const gcp = mapsState.activeMap?.gcps[gcpId]
    if (gcp) {
      resourceDraw.removeFeatures([gcp.id])
      geoDraw.removeFeatures([gcp.id])

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

    const resourceFeature = createResourceFeature(gcp)
    const geoFeature = createGeoFeature(gcp)

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

  function gcpCoordinatesFromGcpId(gcpId: string): GcpCoordinates {
    if (resourceDraw && geoDraw && transformer) {
      let resourcePoint: Point | undefined
      let geoPoint: Point | undefined

      const resourceFeature = resourceDraw.getSnapshotFeature(gcpId)
      const geoFeature = geoDraw.getSnapshotFeature(gcpId)

      if (resourceFeature) {
        resourcePoint = resourceFeatureToPoint(transformer, resourceFeature)
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

      console.log(newGcp, existingGcp)

      addGcp({
        id: existingGcpId,
        index: Math.max(newGcp.index || 0, existingGcp.index || 0),
        resource: newGcp.resource || existingGcp.resource,
        geo: newGcp.geo || existingGcp.geo
      })
    }

    const gcp = gcpFromGcpId(gcpId)
    if (mapsState.activeMap) {
      const mapId = mapsState.activeMap.id
      console.log('active map', mapsState.activeMap, mapId)
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
      currentActiveMapId = map.id
      mapsState.insertMap({
        mapId: map.id,
        map
      })
    } else {
      console.error('No active map or image')
    }
  }

  function createResourceFeature(gcp: DbGcp3) {
    if (!transformer) {
      console.error('Cannot create resource feature, transformer not set')
      return
    }

    const resourcePoint = getGcpResourcePoint(gcp)
    if (resourcePoint) {
      const resourceCoordinates = transformer.transformToGeo(resourcePoint)

      const roundedResourceCoordinates: Point = [
        roundWithDecimals(resourceCoordinates[0], 9),
        roundWithDecimals(resourceCoordinates[1], 9)
      ]

      return createFeature(gcp.id, roundedResourceCoordinates, gcp.index)
    }
  }

  function createGeoFeature(gcp: DbGcp3) {
    const geoPoint = getGcpGeoPoint(gcp)
    if (geoPoint) {
      return createFeature(gcp.id, geoPoint, gcp.index)
    }
  }

  function createFeature(id: string, coordinates: Point, index?: number) {
    if (!index) {
      index = Math.random()
    }

    return {
      type: 'Feature' as const,
      id,
      geometry: {
        type: 'Point' as const,
        coordinates
      },
      properties: {
        mode: 'point',
        index
      }
    }
  }

  function setGcps(map: DbMap) {
    if (!resourceDraw || !geoDraw) {
      console.error('Cannot set GCPs, maps not ready')
      return
    }

    resourceDraw.clear()
    geoDraw.clear()

    const gcpFeatures = Object.values(map.gcps).map(addGcp)

    // let resourceViewport: Viewport | undefined
    // let geoViewport: Viewport | undefined

    // if (currentDisplayImageId) {
    //   resourceViewport = viewportsState.getViewport({
    //     imageId: currentDisplayImageId,
    //     view: 'georeference',
    //     pane: 'resource'
    //   })

    //   geoViewport = getGeoViewport(currentDisplayImageId)
    // }

    // if (resourceViewport) {
    //   const resourceView = resourceOlMap.getView()
    //   resourceView.setCenter(resourceViewport.center)
    //   resourceView.setZoom(resourceViewport.zoom)
    //   resourceView.setRotation(resourceViewport.rotation)
    // } else if (resourceGcpVectorSource.getFeatures().length) {
    //   const resourceExtent = resourceGcpVectorSource.getExtent()
    //   resourceOlMap.getView().fit(resourceExtent, {
    //     padding: OL_RESOURCE_PADDING
    //   })
    // }

    // if (geoViewport) {
    //   const geoView = geoOlMap.getView()
    //   geoView.setCenter(geoViewport.center)
    //   geoView.setZoom(geoViewport.zoom)
    //   geoView.setRotation(geoViewport.rotation)
    // } else if (geoGcpVectorSource.getFeatures().length) {
    //   const geoExtent = geoGcpVectorSource.getExtent()
    //   geoOlMap.getView().fit(geoExtent, {
    //     padding: OL_RESOURCE_PADDING
    //   })
    // }

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

    if (resourceBbox) {
      resourceMap?.fitBounds(resourceBbox, {
        padding: MAPLIBRE_PADDING,
        duration: 0
      })
    }
    if (geoBbox) {
      geoMap?.fitBounds(geoBbox, { padding: MAPLIBRE_PADDING, duration: 0 })
    }
  }

  function getPointDrawOptions() {
    return {
      editable: true,
      styles: {
        pointColor: pink,
        pointOutlineWidth: ({ id }: { id?: number | string }) =>
          activeGcpId === id ? 6 : 2,
        pointOutlineColor: '#ffffff99' as `#${string}`,
        pointWidth: ({ id }: { id?: number | string }) =>
          activeGcpId === id ? 5 : 5
      }
    }
  }

  function getPolygonDrawOptions() {
    return {
      modeName: 'polygon',
      styles: {
        polygonFillColor: '#ffffff' as `#${string}`,
        polygonFillOpacity: 0,
        polygonOutlineColor: pink,
        polygonOutlineWidth: 2
      }
    }
  }

  function addLabelLayer() {
    if (!resourceMap) {
      return
    }

    // resourceMap.addLayer({
    //   id: 'labels',
    //   type: 'symbol',
    //   source: 'td-point',
    //   layout: {
    //     'text-field': ['get', 'index'],
    //     'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
    //     'text-radial-offset': 0.5,
    //     'text-justify': 'auto',
    //     'text-font': ['literal', ['Noto Sans Regular']]
    //   }
    // })
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
      mapsState.activeMapId !== currentActiveMapId &&
      mapsState.activeMap
    ) {
      // abortDrawing()
      setGcps(mapsState.activeMap)
      // makeResourceMaskFeatureActive(mapsState.activeMapId)

      addLabelLayer()

      currentActiveMapId = mapsState.activeMapId
    }
  })

  $effect(() => {
    if (resourceMap) {
      const resourcePointMode = new TerraDrawPointMode(getPointDrawOptions())
      const resourcePolygonMode = new TerraDrawRenderMode(
        getPolygonDrawOptions()
      )

      resourceDraw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map: resourceMap
        }),
        modes: [resourcePolygonMode, resourcePointMode],
        idStrategy
      })

      resourceDraw.start()
      resourceDraw.setMode('point')
      resourceDraw.on('change', handleResourceDrawChange)
      resourceDraw.on('finish', handleResourceDrawFinish)

      // console.log(resourceMap?.getLayer('warped-map-layer'))
      // console.log(resourceMap?.getLayer('td-point'))

      resourceMapReady = true
    }
  })

  $effect(() => {
    if (geoMap) {
      const geoPointMode = new TerraDrawPointMode(getPointDrawOptions())
      const geoPolygonMode = new TerraDrawRenderMode(getPolygonDrawOptions())

      geoDraw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
          map: geoMap
        }),
        modes: [geoPolygonMode, geoPointMode],
        idStrategy
      })

      geoDraw.start()
      geoDraw.setMode('point')
      geoDraw.on('change', handleGeoDrawChange)
      geoDraw.on('finish', handleGeoDrawFinish)

      geoMapReady = true
    }
  })

  onMount(() => {
    uiState.addEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)

    mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
    mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

    mapsState.addEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
    mapsState.addEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
    mapsState.addEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)

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

      mapsState.removeEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
      mapsState.removeEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
      mapsState.removeEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)

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

<div class="w-full h-full grid grid-rows-2 sm:grid-rows-1 sm:grid-cols-2">
  <Resource bind:resourceMap bind:transformer />
  <Geo bind:geoMap />
</div>
