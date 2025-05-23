import { isGeojsonLineString } from '@allmaps/stdlib'

import type { GeojsonLineString, Point } from '@allmaps/types'

import type { LayoutLoad } from './$types.js'

export const load: LayoutLoad = async ({ url, params, fetch }) => {
  let geojsonRoute: GeojsonLineString | undefined
  let from: Point | undefined
  let color: string | undefined

  const { mapId } = params

  const geojsonParam = url.searchParams.get('geojson')
  const fromParam = url.searchParams.get('from')
  const colorParam = url.searchParams.get('color')

  if (geojsonParam) {
    try {
      const response = await fetch(geojsonParam)
      const geojson = await response.json()
      if (isGeojsonLineString(geojson)) {
        geojsonRoute = geojson
      }
    } catch {
      console.warn('GeoJSON not found or not valid')
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
      console.warn('From not valid, should be lat,lon')
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

  return {
    selectedMapId: `https://annotations.allmaps.org/maps/${mapId}`,
    allmapsMapId: mapId,
    geojsonRoute,
    from,
    color
  }
}
