export * from './classes/iiif.js'
export * from './classes/collection.js'
export * from './classes/manifest.js'
export * from './classes/canvas.js'
export * from './classes/image.js'

export type { Region, Size, ImageRequest, TileZoomLevel } from '@allmaps/types'
export type {
  Tileset,
  MajorVersion,
  ProfileProperties,
  LanguageString
} from './lib/types.js'

/**
 * IIIF API version
 * @typedef {1 | 2 | 3} MajorVersion
 */

/**
 * @typedef {Object.<string, string[]>} LanguageString
 */

/**
 * @typedef {MetadataItem[]} Metadata
 */

/**
 * @typedef {Object} MetadataItem
 * @property {LanguageString} label - Metadata label
 * @property {LanguageString} value - Metadata value
 */

/**
 * @typedef {MetadataItem[]} Metadata
 */

/**
 * Image size, with width and height in pixels
 * @typedef {Object} Size
 * @property {number} width - Width, in pixels
 * @property {number} height - Height, in pixels
 */

/**
 * Image region, with x, y, width, and height in pixels
 * @typedef {Object} Region
 * @property {number} x - X coordinate, in pixels
 * @property {number} y - Y coordinate, in pixels
 * @property {number} width - Width, in pixels
 * @property {number} height - Height, in pixels
 */
/**
 * Image request, with region and size
 * @typedef {Object} ImageRequest
 * @property {Region} [region] - Image region
 * @property {Size} [size] - Image size
 */
