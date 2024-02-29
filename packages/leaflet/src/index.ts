import { WarpedMapLayer, type WarpedMapLayerOptions } from './WarpedMapLayer.js'

export { WarpedMapLayer, type WarpedMapLayerOptions }

export { WarpedMapEvent, WarpedMapEventType } from '@allmaps/render'

const warpedMapLayer = function (
  annotationOrAnnotationUrl: unknown,
  options: WarpedMapLayerOptions
) {
  return new WarpedMapLayer(annotationOrAnnotationUrl, options)
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
L.WarpedMapLayer = WarpedMapLayer

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
L.warpedMapLayer = warpedMapLayer
