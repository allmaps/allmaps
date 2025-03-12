<script lang="ts">
  import { onMount } from 'svelte'

  import OLMap from 'ol/Map'
  import Feature from 'ol/Feature'
  import View from 'ol/View'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import XYZ from 'ol/source/XYZ'
  import { Draw, Modify } from 'ol/interaction'
  import { Geometry, Polygon, Point as OLPoint } from 'ol/geom'
  import { Vector as VectorSource } from 'ol/source'
  import IIIF from 'ol/source/IIIF'
  import IIIFInfo, { type ImageInformationResponse } from 'ol/format/IIIFInfo'
  import { fromLonLat, toLonLat } from 'ol/proj'

  import { generateRandomId } from '@allmaps/id'
  import { WarpedMapLayer } from '@allmaps/openlayers'

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
    resourceMaskStyle,
    gcpStyle,
    deleteCondition,
    getResourceMaskPolygon,
    getGeoMaskPolygon,
    makeFeatureActive
  } from '$lib/shared/openlayers.js'
  import {
    getGcpResourcePoint,
    getGcpGeoPoint,
    createMapWithFullImageResourceMask
  } from '$lib/shared/maps.js'
  import { roundWithDecimals } from '$lib/shared/math.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'

  import type { FeatureLike } from 'ol/Feature'
  import type { VectorSourceEvent } from 'ol/source/Vector'
  import type { ModifyEvent } from 'ol/interaction/Modify'

  import type { DbMap, DbGcp, DbGcp3 } from '$lib/types/maps.js'
  import type { Point, GcpCoordinates, Viewport } from '$lib/types/shared.js'
  import type {
    InsertMapEvent,
    RemoveMapEvent,
    InsertGcpEvent,
    ReplaceGcpEvent,
    RemoveGcpEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent
  } from '$lib/types/events.js'

  import { OL_RESOURCE_PADDING } from '$lib/shared/constants.js'

  const MAX_ZOOM = 20

  let resourceOlMapTarget: HTMLDivElement
  let geoOlMapTarget: HTMLDivElement

  let resourceOlMap: OLMap | undefined
  let geoOlMap: OLMap | undefined

  let resourceTileLayer: TileLayer<IIIF>
  let resourceGcpVectorSource: VectorSource<Feature<OLPoint>> | undefined
  let resourceMaskVectorSource: VectorSource<Feature<Polygon>> | undefined

  let resourceDraw: Draw
  let resourceModify: Modify

  let geoTileLayer: TileLayer<XYZ>
  let warpedMapLayer: WarpedMapLayer | undefined
  let geoGcpVectorSource: VectorSource<Feature<OLPoint>> | undefined
  let geoMaskVectorSource: VectorSource<Feature<Polygon>> | undefined

  let geoDraw: Draw
  let geoModify: Modify

  let currentMapsImageId = $state<string | undefined>(undefined)
  let currentDisplayImageId = $state<string | undefined>(undefined)

  let currentActiveMapId = $state<string | undefined>(undefined)

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const uiState = getUiState()
  const imageInfoState = getImageInfoState()
  const urlState = getUrlState()
  const viewportsState = getViewportsState()

  function getFirstGcpWithMissingResourcePoint(incompleteGcps: DbGcp3[]) {
    return (
      incompleteGcps
        // TODO: create sortGcps function
        .toSorted((gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0))
        .find((gcp) => !getGcpResourcePoint(gcp))
    )
  }

  function getFirstGcpWithMissingGeoPoint(incompleteGcps: DbGcp3[]) {
    return (
      incompleteGcps
        // TODO: create sortGcps function
        .toSorted((gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0))
        .find((gcp) => !getGcpGeoPoint(gcp))
    )
  }

  function resourceFeatureToPoint(
    feature: Feature<OLPoint>
  ): Point | undefined {
    const geometry = feature.getGeometry()

    if (geometry) {
      const coordinates = geometry.getCoordinates()
      return [Math.round(coordinates[0]), Math.round(-coordinates[1])]
    }
  }

  function geoFeatureToPoint(feature: Feature<OLPoint>): Point | undefined {
    const geometry = feature.getGeometry()

    if (geometry) {
      const coordinates = toLonLat(geometry.getCoordinates())

      // 7 decimal places should be enough...
      // See https://gis.stackexchange.com/questions/8650/measuring-accuracy-of-latitude-and-longitude
      return [
        roundWithDecimals(coordinates[0], 7),
        roundWithDecimals(coordinates[1], 7)
      ]
    }
  }

  function pointToResourceGeometry(point: Point) {
    return new OLPoint([point[0], -point[1]])
  }

  function pointToGeoGeometry(point: Point) {
    return new OLPoint(fromLonLat(point))
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

  function gcpCoordinatesFromGcpId(gcpId: string): GcpCoordinates {
    if (resourceGcpVectorSource && geoGcpVectorSource) {
      const resourceFeature = resourceGcpVectorSource.getFeatureById(gcpId)
      const geoFeature = geoGcpVectorSource.getFeatureById(gcpId)

      let resourcePoint
      let geoPoint

      if (resourceFeature) {
        resourcePoint = resourceFeatureToPoint(resourceFeature)
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

  function gcpIndexFromGcpId(gcpId: string): number {
    const map = mapsState.activeMap

    if (map) {
      // TODO: create sortGcps function
      const sortedGcps = Object.values(map.gcps).toSorted(
        (gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0)
      )
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

  async function updateImage(imageId: string | undefined) {
    if (currentDisplayImageId === imageId) {
      return
    }

    if (
      !resourceOlMap ||
      !resourceGcpVectorSource ||
      !geoGcpVectorSource ||
      !resourceMaskVectorSource ||
      !geoMaskVectorSource
    ) {
      return
    }

    if (currentDisplayImageId) {
      saveViewport()
    }

    currentDisplayImageId = imageId

    resourceGcpVectorSource.clear()
    geoGcpVectorSource.clear()

    resourceMaskVectorSource.clear()
    geoMaskVectorSource.clear()

    if (imageId) {
      const imageInfo = (await imageInfoState.fetchImageInfo(
        imageId
      )) as ImageInformationResponse

      const options = new IIIFInfo(imageInfo).getTileSourceOptions()
      if (options === undefined || options.version === undefined) {
        throw new Error('Data seems to be no valid IIIF image information.')
      }

      options.zDirection = -1
      const resourceIiifSource = new IIIF(options)
      resourceTileLayer.setSource(resourceIiifSource)

      const tileGrid = resourceIiifSource.getTileGrid()

      const resourceViewport = viewportsState.getViewport({
        imageId,
        view: 'georeference',
        pane: 'resource'
      })

      const extent = tileGrid?.getExtent()
      if (extent && tileGrid) {
        resourceOlMap.setView(
          new View({
            resolutions: tileGrid.getResolutions(),
            extent,
            constrainOnlyCenter: true,
            center: resourceViewport?.center,
            zoom: resourceViewport?.zoom,
            rotation: resourceViewport?.rotation
          })
        )

        if (!resourceViewport) {
          resourceOlMap.getView().fit(tileGrid.getExtent(), {
            padding: OL_RESOURCE_PADDING
          })
        }
      }
    }
  }

  function addGcp(gcp: DbGcp) {
    const resourcePoint = getGcpResourcePoint(gcp)
    const geoPoint = getGcpGeoPoint(gcp)

    if (resourcePoint && resourceGcpVectorSource) {
      const resourceFeature = new Feature({
        id: gcp.id,
        geometry: pointToResourceGeometry(resourcePoint)
      })
      resourceFeature.setId(gcp.id)
      resourceGcpVectorSource.addFeature(resourceFeature)
    }

    if (geoPoint && geoGcpVectorSource) {
      const geoFeature = new Feature({
        id: gcp.id,
        geometry: pointToGeoGeometry(geoPoint)
      })
      geoFeature.setId(gcp.id)
      geoGcpVectorSource.addFeature(geoFeature)
    }
  }

  function setGcps(map: DbMap) {
    if (
      !resourceOlMap ||
      !geoOlMap ||
      !resourceGcpVectorSource ||
      !geoGcpVectorSource
    ) {
      return
    }

    resourceGcpVectorSource.clear()
    geoGcpVectorSource.clear()

    Object.values(map.gcps).forEach(addGcp)

    let resourceViewport: Viewport | undefined
    let geoViewport: Viewport | undefined

    if (currentDisplayImageId) {
      resourceViewport = viewportsState.getViewport({
        imageId: currentDisplayImageId,
        view: 'georeference',
        pane: 'resource'
      })

      geoViewport = getGeoViewport(currentDisplayImageId)
    }

    if (resourceViewport) {
      const resourceView = resourceOlMap.getView()
      resourceView.setCenter(resourceViewport.center)
      resourceView.setZoom(resourceViewport.zoom)
      resourceView.setRotation(resourceViewport.rotation)
    } else if (resourceGcpVectorSource.getFeatures().length) {
      const resourceExtent = resourceGcpVectorSource.getExtent()
      resourceOlMap.getView().fit(resourceExtent, {
        padding: OL_RESOURCE_PADDING
      })
    }

    if (geoViewport) {
      const geoView = geoOlMap.getView()
      geoView.setCenter(geoViewport.center)
      geoView.setZoom(geoViewport.zoom)
      geoView.setRotation(geoViewport.rotation)
    } else if (geoGcpVectorSource.getFeatures().length) {
      const geoExtent = geoGcpVectorSource.getExtent()
      geoOlMap.getView().fit(geoExtent, {
        padding: OL_RESOURCE_PADDING
      })
    }
  }

  function initializeMasks(maps: DbMap[]) {
    if (!resourceMaskVectorSource || !geoMaskVectorSource) {
      return
    }

    resourceMaskVectorSource.clear()
    geoMaskVectorSource.clear()

    maps.forEach(addMap)
  }

  function addMap(map: DbMap) {
    if (!resourceMaskVectorSource || !geoMaskVectorSource) {
      return
    }

    const resourceMaskPolygon = getResourceMaskPolygon(map)
    const geoMaskPolygon = getGeoMaskPolygon(map)

    if (resourceMaskPolygon) {
      const resourceMaskFeature = new Feature({
        geometry: resourceMaskPolygon
      })
      resourceMaskFeature.setId(map.id)
      resourceMaskVectorSource.addFeature(resourceMaskFeature)
    }

    if (geoMaskPolygon) {
      const geoMaskFeature = new Feature({
        geometry: geoMaskPolygon
      })
      geoMaskFeature.setId(map.id)
      geoMaskVectorSource.addFeature(geoMaskFeature)
    }
  }

  function removeMap(mapId: string) {
    if (
      !resourceGcpVectorSource ||
      !geoGcpVectorSource ||
      !resourceMaskVectorSource ||
      !geoMaskVectorSource
    ) {
      return
    }

    if (currentActiveMapId === mapId) {
      resourceGcpVectorSource.clear()
      geoGcpVectorSource.clear()
    }

    const resourceMaskFeature = resourceMaskVectorSource.getFeatureById(mapId)
    if (resourceMaskFeature) {
      resourceMaskVectorSource.removeFeature(resourceMaskFeature)
    }

    const geoMaskFeature = geoMaskVectorSource.getFeatureById(mapId)
    if (geoMaskFeature) {
      geoMaskVectorSource.removeFeature(geoMaskFeature)
    }
  }

  function replaceMapFromState(mapId: string) {
    if (!resourceMaskVectorSource || !geoMaskVectorSource) {
      return
    }

    const map = mapsState.getMapById(mapId)
    if (map) {
      const resourceMaskPolygon = getResourceMaskPolygon(map)
      const geoMaskPolygon = getGeoMaskPolygon(map)

      if (resourceMaskPolygon) {
        const resourceMaskFeature =
          resourceMaskVectorSource.getFeatureById(mapId)
        resourceMaskFeature?.setGeometry(resourceMaskPolygon)
      }

      if (geoMaskPolygon) {
        const geoMaskFeature = geoMaskVectorSource.getFeatureById(mapId)
        geoMaskFeature?.setGeometry(geoMaskPolygon)
      }
    }
  }

  function replaceGcpFromState(gcpId: string) {
    if (!resourceGcpVectorSource || !geoGcpVectorSource) {
      return
    }

    const gcp = mapsState.activeMap?.gcps[gcpId]

    if (gcp) {
      const resourceGcpFeature = resourceGcpVectorSource.getFeatureById(gcpId)
      if (resourceGcpFeature) {
        resourceGcpVectorSource.removeFeature(resourceGcpFeature)
      }

      const geoGcpFeature = geoGcpVectorSource.getFeatureById(gcpId)
      if (geoGcpFeature) {
        geoGcpVectorSource.removeFeature(geoGcpFeature)
      }

      addGcp(gcp)
    } else {
      console.error(`Error setting new geometries for GCP ${gcpId}`)
    }
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
    if (!resourceGcpVectorSource || !geoGcpVectorSource) {
      return
    }

    const mapId = event.detail.mapId
    if (mapId === currentActiveMapId) {
      const gcpId = event.detail.gcpId

      const resourceGcpFeature = resourceGcpVectorSource.getFeatureById(gcpId)
      if (resourceGcpFeature) {
        resourceGcpVectorSource.removeFeature(resourceGcpFeature)
      }

      const geoGcpFeature = geoGcpVectorSource.getFeatureById(gcpId)
      if (geoGcpFeature) {
        geoGcpVectorSource.removeFeature(geoGcpFeature)
      }
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

  async function handleAddGcpFeature(event: VectorSourceEvent) {
    const feature = event.feature as Feature<OLPoint>

    if (!feature || feature.getId()) {
      return
    }

    let gcpId: string | undefined
    let newGcpId: boolean

    const incompleteGcps = mapsState.incompleteGcps

    if (incompleteGcps.length) {
      if (event.target === resourceGcpVectorSource) {
        if (mapsState.activeGcp && !getGcpResourcePoint(mapsState.activeGcp)) {
          gcpId = mapsState.activeGcp.id
        } else {
          const gcp = getFirstGcpWithMissingResourcePoint(incompleteGcps)
          gcpId = gcp?.id
        }
      } else {
        if (mapsState.activeGcp && !getGcpGeoPoint(mapsState.activeGcp)) {
          gcpId = mapsState.activeGcp.id
        } else {
          const gcp = getFirstGcpWithMissingGeoPoint(incompleteGcps)
          gcpId = gcp?.id
        }
      }
    }

    if (gcpId) {
      newGcpId = false
    } else {
      newGcpId = true
      gcpId = await generateRandomId()
    }

    feature.setId(gcpId)
    const gcp = gcpFromGcpId(gcpId)

    if (mapsState.activeMap) {
      const mapId = mapsState.activeMap.id

      if (newGcpId) {
        mapsState.insertGcp({ mapId, gcp })
      } else {
        mapsState.replaceGcp({ mapId, gcp })
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
    }
  }

  function handleModifyEnd(event: ModifyEvent) {
    const mapId = mapsState.activeMapId
    const feature = event.features.item(0)
    const gcpId = feature.getId()
    if (mapId && gcpId && typeof gcpId === 'string') {
      const gcp = gcpFromGcpId(gcpId)
      mapsState.replaceGcp({ mapId, gcp })
    } else {
      console.error('GCP without ID encountered')
    }
  }

  function abortDrawing() {
    resourceDraw.abortDrawing()
    geoDraw.abortDrawing()
  }

  function makeResourceMaskFeatureActive(mapId: string | undefined) {
    if (resourceMaskVectorSource && geoMaskVectorSource) {
      const resourceMaskfeatures = resourceMaskVectorSource.getFeatures()
      const geoMaskfeatures = geoMaskVectorSource.getFeatures()

      makeFeatureActive(resourceMaskfeatures, mapId)
      makeFeatureActive(geoMaskfeatures, mapId)
    }
  }

  function makeGcpFeatureActive(gcpId: string | undefined) {
    if (resourceGcpVectorSource && geoGcpVectorSource) {
      const resourceGcpFeatures = resourceGcpVectorSource.getFeatures()
      const geoGcpFeatures = geoGcpVectorSource.getFeatures()

      makeFeatureActive(resourceGcpFeatures, gcpId)
      makeFeatureActive(geoGcpFeatures, gcpId)
    }
  }

  function labelIndexFromGcpId(gcpId: string) {
    const map = mapsState.activeMap

    if (map) {
      // TODO: create sortGcps function
      const sortedGcps = Object.values(map.gcps).toSorted(
        (gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0)
      )
      const gcpIndex = sortedGcps.findIndex((gcp) => gcp.id === gcpId)

      if (gcpIndex !== -1) {
        return gcpIndex
      } else {
        return 0
      }
    }

    return 0
  }

  function getGeoViewport(imageId: string): Viewport | undefined {
    let stateGeoViewport: Viewport | undefined
    let navPlaceGeoViewport: Viewport | undefined
    let urlGeoViewport: Viewport | undefined
    let dataGeoViewport: Viewport | undefined

    const view = geoOlMap?.getView()

    if (view) {
      navPlaceGeoViewport = getNavPlaceViewport(view, sourceState.navPlace)
      urlGeoViewport = getBboxViewport(view, urlState.bbox)

      if (geoGcpVectorSource && geoGcpVectorSource.getFeatures().length > 0) {
        dataGeoViewport = getExtentViewport(
          view,
          geoGcpVectorSource.getExtent()
        )
      }
    }

    if (imageId) {
      stateGeoViewport = viewportsState.getViewport({
        imageId,
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
    if (currentDisplayImageId && resourceOlMap && geoOlMap) {
      const resourceZoom = resourceOlMap.getView().getZoom()
      const resourceCenter = resourceOlMap.getView().getCenter()
      const resourceRotation = resourceOlMap.getView().getRotation()

      const geoZoom = geoOlMap.getView().getZoom()
      const geoCenter = geoOlMap.getView().getCenter()
      const geoRotation = geoOlMap.getView().getRotation()

      if (resourceZoom && resourceCenter) {
        viewportsState.saveViewport(
          {
            imageId: currentDisplayImageId,
            view: 'georeference',
            pane: 'resource'
          },
          {
            zoom: resourceZoom,
            center: resourceCenter,
            rotation: resourceRotation
          }
        )
      }

      if (geoZoom && geoCenter) {
        viewportsState.saveViewport(
          {
            imageId: currentDisplayImageId,
            view: 'georeference',
            pane: 'geo'
          },
          {
            zoom: geoZoom,
            center: geoCenter,
            rotation: geoRotation
          }
        )
      }
    }
  }

  onMount(() => {
    // < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < <
    // Left pane: resource
    // < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < <

    resourceTileLayer = new TileLayer()
    resourceGcpVectorSource = new VectorSource()

    const resourceVectorLayer = new VectorLayer({
      source: resourceGcpVectorSource,
      style: (feature: FeatureLike) => gcpStyle(feature, labelIndexFromGcpId)
    })

    resourceMaskVectorSource = new VectorSource()

    const resourceResourceMaskLayer = new VectorLayer({
      source: resourceMaskVectorSource,
      style: resourceMaskStyle
    })

    resourceOlMap = new OLMap({
      layers: [
        resourceTileLayer,
        resourceResourceMaskLayer,
        resourceVectorLayer
      ],
      target: resourceOlMapTarget,
      controls: []
    })

    resourceModify = new Modify({
      // TODO: is there a better way to do this?
      source: resourceGcpVectorSource as unknown as VectorSource<
        Feature<Geometry>
      >,
      pixelTolerance: 25,
      deleteCondition
    })

    resourceDraw = new Draw({
      // TODO: is there a better way to do this?
      source: resourceGcpVectorSource as unknown as VectorSource<
        Feature<Geometry>
      >,
      type: 'Point'
    })

    // > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > >
    // Right pane: geospatial
    // > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > >

    const geoTileSource = new XYZ({
      url: uiState.basemapPreset.url,
      attributions: uiState.basemapPreset.attribution,
      maxZoom: 19
    })

    geoTileLayer = new TileLayer({
      source: geoTileSource
    })

    warpedMapLayer = new WarpedMapLayer()

    geoGcpVectorSource = new VectorSource()

    const geoVectorLayer = new VectorLayer({
      source: geoGcpVectorSource,
      style: (feature: FeatureLike) => gcpStyle(feature, labelIndexFromGcpId)
    })

    geoMaskVectorSource = new VectorSource()

    const geoResourceMaskLayer = new VectorLayer({
      source: geoMaskVectorSource,
      style: resourceMaskStyle
    })

    let viewOptions = {
      center: fromLonLat([0, 0]),
      zoom: 2,
      rotation: 0,
      maxZoom: MAX_ZOOM
    }

    if (sourceState.activeImageId) {
      const geoViewport = getGeoViewport(sourceState.activeImageId)

      if (geoViewport) {
        viewOptions = {
          center: geoViewport.center,
          zoom: geoViewport.zoom,
          rotation: geoViewport.rotation,
          maxZoom: MAX_ZOOM
        }
      }
    }

    geoOlMap = new OLMap({
      layers: [
        geoTileLayer,
        // @ts-expect-error @allmaps/openlayers does not yet include types for multiple OpenLayers version
        warpedMapLayer,
        geoResourceMaskLayer,
        geoVectorLayer
      ],
      target: geoOlMapTarget,
      view: new View(viewOptions),
      controls: []
    })

    geoModify = new Modify({
      // TODO: is there a better way to do this?
      source: geoGcpVectorSource as unknown as VectorSource<Feature<Geometry>>,
      pixelTolerance: 25,
      deleteCondition
    })

    geoDraw = new Draw({
      // TODO: is there a better way to do this?
      source: geoGcpVectorSource as unknown as VectorSource<Feature<Geometry>>,
      type: 'Point'
    })

    // = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
    // Effects
    // = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

    $effect(() => {
      if (sourceState.activeImageId) {
        abortDrawing()
        updateImage(sourceState.activeImageId)
      }
    })

    $effect(() => {
      if (
        mapsState.connected === true &&
        mapsState.maps &&
        mapsState.connectedImageId !== currentMapsImageId
      ) {
        initializeMasks(mapsState.maps)

        currentMapsImageId = mapsState.connectedImageId
      }
    })

    $effect(() => {
      if (mapsState.activeMapId !== currentActiveMapId && mapsState.activeMap) {
        abortDrawing()
        setGcps(mapsState.activeMap)
        makeResourceMaskFeatureActive(mapsState.activeMapId)

        currentActiveMapId = mapsState.activeMapId
      }
    })

    $effect(() => {
      if (mapsState.activeGcpId) {
        makeGcpFeatureActive(mapsState.activeGcpId)
      }
    })

    $effect(() => {
      if (
        uiState.lastClickedItem?.type === 'gcp' &&
        mapsState.activeGcpId === uiState.lastClickedItem.gcpId
      ) {
        const resourceGcpFeature = resourceGcpVectorSource?.getFeatureById(
          mapsState.activeGcpId
        )
        const geoGcpFeature = geoGcpVectorSource?.getFeatureById(
          mapsState.activeGcpId
        )

        const resourceGcpGeometry = resourceGcpFeature?.getGeometry()
        const geoGcpGeometry = geoGcpFeature?.getGeometry()
        if (resourceGcpGeometry) {
          resourceOlMap?.getView().fit(resourceGcpGeometry, {
            duration: 200,
            padding: [25, 25, 25, 25]
          })
        }

        if (geoGcpGeometry) {
          geoOlMap?.getView().fit(geoGcpGeometry, {
            duration: 200,
            padding: [25, 25, 25, 25]
          })
        }
      } else if (
        uiState.lastClickedItem?.type === 'map' &&
        mapsState.activeMapId === uiState.lastClickedItem.mapId
      ) {
        const resourceMaskFeature = resourceMaskVectorSource?.getFeatureById(
          mapsState.activeMapId
        )
        const geoMaskFeature = geoMaskVectorSource?.getFeatureById(
          mapsState.activeMapId
        )

        const resourceMaskGeometry = resourceMaskFeature?.getGeometry()
        const geoMaskGeometry = geoMaskFeature?.getGeometry()
        if (resourceMaskGeometry) {
          resourceOlMap?.getView().fit(resourceMaskGeometry, {
            duration: 200,
            padding: [25, 25, 25, 25]
          })
        }

        if (geoMaskGeometry) {
          geoOlMap?.getView().fit(geoMaskGeometry, {
            duration: 200,
            padding: [25, 25, 25, 25]
          })
        }
      }
    })

    $effect(() => {
      if (warpedMapLayer) {
        warpedMapLayer.clear()
        if (urlState.backgroundGeoreferenceAnnotationUrl) {
          warpedMapLayer.addGeoreferenceAnnotationByUrl(
            urlState.backgroundGeoreferenceAnnotationUrl
          )
        }
      }
    })

    $effect(() => {
      if (urlState.basemapUrl) {
        geoTileSource.setUrl(urlState.basemapUrl)
        geoTileSource.setAttributions(undefined)
      } else {
        geoTileSource.setUrl(uiState.basemapPreset.url)
        geoTileSource.setAttributions(uiState.basemapPreset.attribution)
      }
    })

    // = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =
    // Events
    // = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = = =

    resourceGcpVectorSource.on('addfeature', handleAddGcpFeature)
    geoGcpVectorSource.on('addfeature', handleAddGcpFeature)

    resourceModify.on('modifyend', handleModifyEnd)
    geoModify.on('modifyend', handleModifyEnd)

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

    $effect(() => {
      if (resourceOlMap && geoOlMap) {
        if (mapsState.connected) {
          resourceOlMap.addInteraction(resourceDraw)
          resourceOlMap.addInteraction(resourceModify)

          geoOlMap.addInteraction(geoDraw)
          geoOlMap.addInteraction(geoModify)
        } else {
          resourceOlMap.removeInteraction(resourceDraw)
          resourceOlMap.removeInteraction(resourceModify)

          geoOlMap.removeInteraction(geoDraw)
          geoOlMap.removeInteraction(geoModify)
        }
      }
    })

    return () => {
      saveViewport()

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
  <div bind:this={resourceOlMapTarget} class="w-full h-full"></div>
  <div bind:this={geoOlMapTarget} class="w-full h-full"></div>
</div>
