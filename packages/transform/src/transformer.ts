import {
  GCP,
  GDALCreateGCPTransformer,
  GDALGCPTransform
} from './gdaltransform.js'

import type { Position, ImageWorldGCP } from './shared/types.js'

import type { GCPTransformInfo } from './gdaltransform.js'

export function toWorld(
  transformArgs: GCPTransformInfo,
  point: Position
): Position {
  const bInverse = false

  const input = [{ x: point[0], y: point[1] }]
  const output = GDALGCPTransform(transformArgs, bInverse, input)

  return [output[0].y, output[0].x]
}

export function toImage(
  transformArgs: GCPTransformInfo,
  point: Position
): Position {
  const bInverse = true

  const input = [{ x: point[1], y: point[0] }]
  const output = GDALGCPTransform(transformArgs, bInverse, input)

  return [output[0].x, output[0].y]
}

export function createTransformer(gcps: ImageWorldGCP[], nOrder?: number): GCPTransformInfo {
  const pasGCPs = gcps.map(
    (gcp) => new GCP(gcp.image[0], gcp.image[1], gcp.world[1], gcp.world[0])
  )

  // const nOrder = 0
  // NOTE : the optional is resolved here in order not to change the order of the parameters in the GDAL functions
  return GDALCreateGCPTransformer(pasGCPs, nOrder ?? 1, false)
}
