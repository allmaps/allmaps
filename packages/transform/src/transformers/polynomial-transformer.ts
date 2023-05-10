import {
  GCP,
  GDALCreateGCPTransformer,
  GDALGCPTransform
} from '../shared/gdaltransform.js'

import type { GCPTransformInfo } from '../shared/gdaltransform.js'

import type {
  GCPTransformerInterface,
  Position,
  ImageWorldPosition
} from '../shared/types.js'

export default class PolynomialGCPTransformer implements GCPTransformerInterface {
  gcps: ImageWorldPosition[]
  transformArgs: GCPTransformInfo

  constructor(gcps: ImageWorldPosition[]) {
    this.gcps = gcps

    const pasGCPs = gcps.map(
      (gcp) => new GCP(gcp.image[0], gcp.image[1], gcp.world[1], gcp.world[0])
    )

    const nOrder = 0
    this.transformArgs = GDALCreateGCPTransformer(pasGCPs, nOrder, false)
  }

  toWorld(point: Position): Position {
    const bInverse = false

    const input = [{ x: point[0], y: point[1] }]
    const output = GDALGCPTransform(this.transformArgs, bInverse, input)

    return [output[0].y, output[0].x]
  }

  toResource(point: Position): Position {
    const bInverse = true

    const input = [{ x: point[1], y: point[0] }]
    const output = GDALGCPTransform(this.transformArgs, bInverse, input)

    return [output[0].x, output[0].y]
  }
}
