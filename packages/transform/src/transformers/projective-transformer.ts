import Projective from '../shared/projective.js'

import type {
  GCPTransformerInterface,
  Position,
  ImageWorldPosition
} from '../shared/types.js'

export default class ProjectiveGCPTransformer
  implements GCPTransformerInterface
{
  gcps: ImageWorldPosition[]

  worldGcps: Position[]
  resourceGcps: Position[]

  toWorldProjective?: Projective
  toResourceProjective?: Projective

  constructor(gcps: ImageWorldPosition[]) {
    this.gcps = gcps

    this.worldGcps = gcps.map((gcp) => gcp.world)
    this.resourceGcps = gcps.map((gcp) => gcp.image)
  }

  createToWorldProjective(): Projective {
    return new Projective(this.resourceGcps, this.worldGcps)
  }

  createToResourceProjective(): Projective {
    return new Projective(this.worldGcps, this.resourceGcps)
  }

  toWorld(point: Position): Position {
    if (!this.toWorldProjective) {
      this.toWorldProjective = this.createToWorldProjective()
    }

    return this.toWorldProjective.interpolant(point)
  }

  toResource(point: Position): Position {
    if (!this.toResourceProjective) {
      this.toResourceProjective = this.createToResourceProjective()
    }

    return this.toResourceProjective.interpolant(point)
  }
}
