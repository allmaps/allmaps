import proj4 from 'proj4'

import { defaultGcpTransformerOptions } from '@allmaps/transform'

import type {
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from './types'

export const lonLatProjection: Projection =
  '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'
export const webMercatorProjection: Projection =
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs'

export const defaultProjectedTransformerOptions: ProjectedGcpTransformerOptions =
  {
    internalProjection: webMercatorProjection,
    projection: webMercatorProjection,
    ...defaultGcpTransformerOptions
  }

export const defaultProjectedTransformOptions: ProjectedGcpTransformOptions = {
  projection: webMercatorProjection,
  ...defaultGcpTransformerOptions
}

const lonLatProjectionToWebMecatorProjectionConverter = proj4(
  lonLatProjection,
  webMercatorProjection
)
export const lonLatToWebMercator =
  lonLatProjectionToWebMecatorProjectionConverter.forward
export const webMercatorToLonLat =
  lonLatProjectionToWebMecatorProjectionConverter.inverse
