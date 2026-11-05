import { createMaplibreExample } from './plugin-code-examples.js'

export const maplibreAnnotationUrl =
  'https://annotations.allmaps.org/maps/f6b4464cc1690fc2@3845c52765326a07'

// Use the viewing-maps guide's source generator with UvA's Amsterdam map.
export const maplibreExample = createMaplibreExample(maplibreAnnotationUrl)
export const maplibreFolds = maplibreExample.folds

export const transformExample = `import { GcpTransformer } from '@allmaps/transform'

const gcps = [
  { resource: [0, 0], geo: [4.9, 52.38] },
  { resource: [1000, 0], geo: [4.92, 52.38] },
  { resource: [0, 1000], geo: [4.9, 52.36] }
]
const transformer = new GcpTransformer(gcps)

// Image pixels
const point = [500, 500]
console.log(transformer.transformToGeo(point))
// Longitude, latitude
// ≈ [4.91, 52.37]`
