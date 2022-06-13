import type { GCPTransformInfo } from './gdaltransform.js'
import {
  GCP,
  GDALCreateGCPTransformer,
  GDALGCPTransform
} from './gdaltransform.js'

export type Coord = [number, number]
export type ImageWorldGCP = { image: Coord; world: Coord }

export function toWorld(transformArgs: GCPTransformInfo, point: Coord): Coord {
  const bInverse = false

  const input = [{ x: point[0], y: point[1] }]
  const output = GDALGCPTransform(transformArgs, bInverse, input)

  return [output[0].y, output[0].x]
}

export function toImage(transformArgs: GCPTransformInfo, point: Coord): Coord {
  const bInverse = true

  const input = [{ x: point[1], y: point[0] }]
  const output = GDALGCPTransform(transformArgs, bInverse, input)

  return [output[0].x, output[0].y]
}

export function createTransformer(gcps: ImageWorldGCP[]): GCPTransformInfo {
  const pasGCPs = gcps.map(
    (gcp) => new GCP(gcp.image[0], gcp.image[1], gcp.world[1], gcp.world[0])
  )

  const nOrder = 0
  return GDALCreateGCPTransformer(pasGCPs, nOrder, false)
}
