import { defaultTransformerOptions } from '@allmaps/transform'

import { ProjectedTransformerOptions } from './types'

export const lonLatProjection = 'EPSG:4326'
export const webMercatorProjection = 'EPSG:3857'

export const defaultProjectedTransformerOptions: ProjectedTransformerOptions = {
  internalProjection: webMercatorProjection,
  projection: webMercatorProjection,
  ...defaultTransformerOptions
}
