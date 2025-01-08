export { IIIF } from './classes/iiif.js'
export { Collection, EmbeddedCollection } from './classes/collection.js'
export { Manifest, EmbeddedManifest } from './classes/manifest.js'
export { Canvas } from './classes/canvas.js'
export { Image, EmbeddedImage } from './classes/image.js'

export type { Region, Size, ImageRequest, TileZoomLevel } from '@allmaps/types'
export type {
  Tileset,
  MajorVersion,
  Metadata,
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
