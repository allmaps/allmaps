import { isGeojsonPoint, isGeojsonLineString } from '@allmaps/stdlib'

import { env } from '$env/dynamic/private'

import type { GeojsonLineString, GeojsonFeature, Point } from '@allmaps/types'

import type { GeojsonRoute } from '$lib/shared/types.js'

import type { LayoutServerLoad } from './$types.js'

export const load: LayoutServerLoad = async ({ url, fetch }) => {
  let geojsonRoute: GeojsonRoute | undefined
  let from: Point | undefined
  let color: string | undefined
  let position: Point | undefined

  const geojsonParam = url.searchParams.get('geojson') || undefined
  const fromParam = url.searchParams.get('from') || undefined
  const colorParam = url.searchParams.get('color') || undefined
  const positionParam = url.searchParams.get('position') || undefined

  if (geojsonParam) {
    let response: Response | undefined
    let geojson: unknown | undefined
    let error: string | undefined
    let route: GeojsonLineString | undefined
    let markers: GeojsonFeature[] = []

    try {
      response = await fetch(geojsonParam)
      if (!response.ok) {
        throw new Error()
      }
    } catch {
      error = 'GeoJSON file could not be downloaded'
    }

    if (response && response.ok) {
      try {
        geojson = await response.json()
      } catch {
        error = 'GeoJSON file could not be parsed'
      }

      if (geojson && typeof geojson === 'object' && 'type' in geojson) {
        if (
          geojson.type === 'FeatureCollection' &&
          'features' in geojson &&
          Array.isArray(geojson.features)
        ) {
          const lineStringFeatures = geojson.features.filter(
            (feature) =>
              'geometry' in feature &&
              feature.geometry &&
              typeof feature.geometry === 'object' &&
              'type' in feature.geometry &&
              feature.geometry.type === 'LineString' &&
              isGeojsonLineString(feature.geometry)
          )

          const pointFeatures = geojson.features.filter(
            (feature) =>
              'geometry' in feature &&
              feature.geometry &&
              typeof feature.geometry === 'object' &&
              'type' in feature.geometry &&
              feature.geometry.type === 'Point' &&
              'properties' in feature &&
              typeof feature.properties === 'object' &&
              isGeojsonPoint(feature.geometry)
          )

          route = lineStringFeatures.map((feature) => feature.geometry)[0]
          markers = pointFeatures
        } else if (geojson.type === 'Feature') {
          if (
            'geometry' in geojson &&
            geojson.geometry &&
            typeof geojson.geometry === 'object' &&
            'type' in geojson.geometry
          ) {
            if (
              geojson.geometry.type === 'LineString' &&
              isGeojsonLineString(geojson.geometry)
            ) {
              route = geojson.geometry
            } else if (
              geojson.geometry.type === 'Point' &&
              'properties' in geojson &&
              typeof geojson.properties === 'object' &&
              isGeojsonPoint(geojson.geometry)
            ) {
              markers = [geojson as GeojsonFeature]
            } else {
              error = 'Feature geometry must be a LineString or Point'
            }
          } else {
            error = 'Feature must have a geometry'
          }
        } else if (isGeojsonLineString(geojson)) {
          route = geojson
        } else {
          error = 'GeoJSON must be a FeatureCollection or LineString'
        }
      } else {
        error = 'JSON file is not a valid GeoJSON'
      }
    }

    geojsonRoute = {
      url: geojsonParam,
      error,
      route,
      markers
    }
  }

  if (fromParam) {
    try {
      const parsedFrom = fromParam.split(',').map((c) => parseFloat(c))

      if (parsedFrom.length === 2) {
        from = [parsedFrom[0], parsedFrom[1]]
      } else {
        throw new Error()
      }
    } catch {
      console.warn('From parameter not valid, should be lat,lon')
    }
  }

  if (colorParam) {
    const colors = [
      'blue',
      'purple',
      'pink',
      'orange',
      'red',
      'green',
      'yellow'
    ]

    if (colors.includes(colorParam)) {
      color = colorParam
    }
  }

  if (positionParam) {
    try {
      const parsedPosition = positionParam.split(',').map((c) => parseFloat(c))

      if (
        parsedPosition.length === 2 &&
        !isNaN(parsedPosition[0]) &&
        !isNaN(parsedPosition[1])
      ) {
        position = [parsedPosition[0], parsedPosition[1]]
      }
    } catch {
      console.warn('position parameter not valid, should be lat,lon')
    }
  }

  return {
    geocodeEarthKey: env.GEOCODE_EARTH_KEY,
    geojsonRoute,
    from,
    color,
    position
  }
}
