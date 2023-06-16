import Affine from '../shared/affine.js'

import type {
  GCPTransformerInterface,
  Position,
  ImageWorldPosition
} from '../shared/types.js'

export default class PolynomialGCPTransformer
  implements GCPTransformerInterface
{
  gcps: ImageWorldPosition[]

  worldGcps: Position[]
  resourceGcps: Position[]

  toWorldAffine?: Affine
  toResourceAffine?: Affine

  constructor(gcps: ImageWorldPosition[]) {
    this.gcps = gcps

    this.worldGcps = gcps.map((gcp) => gcp.world)
    this.resourceGcps = gcps.map((gcp) => gcp.image)
  }

  createToWorldAffine(): Affine {
    return new Affine(this.resourceGcps, this.worldGcps)
  }

  createToResourceAffine(): Affine {
    return new Affine(this.worldGcps, this.resourceGcps)
  }

  toWorld(point: Position): Position {
    if (!this.toWorldAffine) {
      this.toWorldAffine = this.createToWorldAffine()
    }

    return this.toWorldAffine.interpolant(point)
  }

  toResource(point: Position): Position {
    if (!this.toResourceAffine) {
      this.toResourceAffine = this.createToResourceAffine()
    }

    return this.toResourceAffine.interpolant(point)
  }
}
