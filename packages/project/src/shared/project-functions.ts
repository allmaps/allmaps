import proj4 from 'proj4'

import { defaultGcpTransformerOptions } from '@allmaps/transform'

import type {
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from './types'

const lonLatEquivalentDefinitions = [
  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees',
  '+proj=longlat +datum=WGS84 +no_defs +type=crs',
  'EPSG:4326',
  'WGS84'
]

const webMercatorEquivalentDefinitions = [
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs',
  'EPSG:3857',
  'EPSG:3785',
  'GOOGLE',
  'EPSG:900913',
  'EPSG:102113'
]

/**
 * lonLatProjection
 *
 * `EPSG:4326` projection with definition: `"+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees"`
 */
export const lonLatProjection: Projection<string> = {
  name: 'EPSG:4326',
  definition: lonLatEquivalentDefinitions[0]
}
/**
 * webMercatorProjection
 *
 * `EPSG:3857` projection with definition: `"+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs"`
 */
export const webMercatorProjection: Projection<string> = {
  name: 'EPSG:3857',
  definition: webMercatorEquivalentDefinitions[0]
}

export const defaultProjectedGcpTransformerOptions: ProjectedGcpTransformerOptions =
  {
    internalProjection: webMercatorProjection,
    projection: webMercatorProjection,
    ...defaultGcpTransformerOptions
  }

export const defaultProjectedGcpTransformOptions: ProjectedGcpTransformOptions =
  {
    projection: webMercatorProjection,
    ...defaultGcpTransformerOptions
  }

const lonLatProjectionToWebMecatorProjectionConverter = proj4(
  lonLatProjection.definition,
  webMercatorProjection.definition
)
export const lonLatToWebMercator =
  lonLatProjectionToWebMecatorProjectionConverter.forward
export const webMercatorToLonLat =
  lonLatProjectionToWebMecatorProjectionConverter.inverse

export function projectionDefinitionToAntialiasedDefinition(
  stringProjectionDefinition: string
): string {
  const lonLatIndex = lonLatEquivalentDefinitions.indexOf(
    stringProjectionDefinition
  )
  const webMercatorIndex = webMercatorEquivalentDefinitions.indexOf(
    stringProjectionDefinition
  )
  if (lonLatIndex != -1) {
    return lonLatProjection.definition
  } else if (webMercatorIndex != -1) {
    return webMercatorProjection.definition
  } else {
    return stringProjectionDefinition
  }
}

export function projectionToAntialiasedProjection(
  projection: Projection
): Projection {
  return {
    definition: projectionDefinitionToAntialiasedDefinition(
      String(projection?.definition)
    )
  }
}

export function isEqualProjection(
  projection0: Projection | undefined,
  projection1: Projection | undefined
): boolean | undefined {
  return (
    projectionDefinitionToAntialiasedDefinition(
      String(projection0?.definition)
    ) ==
    projectionDefinitionToAntialiasedDefinition(String(projection1?.definition))
  )
}
