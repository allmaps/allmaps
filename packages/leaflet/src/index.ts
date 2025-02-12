export {
  WarpedMapLayer,
  type LeafletWarpedMapLayerOptions
} from './WarpedMapLayer.js'

export { WarpedMapEvent, WarpedMapEventType } from '@allmaps/render'

import {
  WarpedMapLayer,
  type LeafletWarpedMapLayerOptions
} from './WarpedMapLayer.js'

const warpedMapLayer = function (
  annotationOrAnnotationUrl: unknown,
  options: LeafletWarpedMapLayerOptions
) {
  return new WarpedMapLayer(annotationOrAnnotationUrl, options)
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
L.WarpedMapLayer = WarpedMapLayer

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
L.warpedMapLayer = warpedMapLayer
