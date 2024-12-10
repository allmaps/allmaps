import WarpedMapLayer from './WarpedMapLayer.js'

import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

export { WarpedMapLayer, OLWarpedMapEvent }
export { WarpedMapEvent, WarpedMapEventType } from '@allmaps/render'

/**
 * Point
 * @typedef {[number, number]} Point
 */

/**
 * Bounding box
 * @typedef {[number, number, number, number ]} Bbox
 */

/**
 * Transformation type
 * @typedef {'helmert' | 'polynomial' | 'polynomial1' | 'polynomial2' | 'polynomial3' | 'projective' | 'thinPlateSpline'} TransformationType
 */
