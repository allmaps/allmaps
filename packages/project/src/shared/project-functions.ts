import { defaultTransformerOptions } from '@allmaps/transform'

import type { ProjectionDefinition } from 'proj4'

import type { ProjectedTransformerOptions, Projection } from './types'

export const lonLatProjection: Projection = {
  name: 'EPSG:4326',
  definition:
    '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
}
export const webMercatorProjection: Projection = {
  name: 'EPSG:3857',
  definition:
    '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'
}

export const defaultProjections = new Map<
  string,
  string | ProjectionDefinition
>()
defaultProjections.set(lonLatProjection.name, lonLatProjection.definition)
defaultProjections.set(
  webMercatorProjection.name,
  webMercatorProjection.definition
)

export const defaultProjectedTransformerOptions: ProjectedTransformerOptions = {
  internalProjection: webMercatorProjection,
  projection: webMercatorProjection,
  ...defaultTransformerOptions
}
