import {GCP, GDALCreateGCPTransformer, GDALGCPTransform} from './gdaltransform.js'

function createTransformer (gcps) {
  const pasGCPs = gcps.features
    .map((gcp) => new GCP(
      gcp.properties.pixel[0], gcp.properties.pixel[1],
      gcp.geometry.coordinates[1], gcp.geometry.coordinates[0]
    ))

  const nOrder = 0
  const hTransformArg = GDALCreateGCPTransformer(pasGCPs, nOrder, false)

  function toWorld (pixels) {
    const bInverse = false
    const input = pixels.map((pixel) => ({x: pixel[0], y: pixel[1]}))
    const output = GDALGCPTransform(hTransformArg, bInverse, input)

    return {
      type: 'MultiPoint',
      coordinates: output.map(({x, y}) => ([y, x]))
    }
  }

  function toPixels (multiPoint) {
    const bInverse = true

    const input = multiPoint.coordinates.map((point) => ({x: point[1], y: point[0]}))
    const output = GDALGCPTransform(hTransformArg, bInverse, input)
    return output.map(({x, y}) => ([x, y]))
  }

  return {
    toWorld,
    toPixels,
    hTransformArg
  }
}

module.exports = createTransformer
