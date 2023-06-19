import Helmert from '../shared/helmert.js'

import type {
  GCPTransformerInterface,
  Position,
  ImageWorldPosition
} from '../shared/types.js'

export default class HelmertGCPTransformer implements GCPTransformerInterface {
  gcps: ImageWorldPosition[]

  worldGcps: Position[]
  resourceGcps: Position[]

  toWorldHelmert?: Helmert
  toResourceHelmert?: Helmert

  order?: number

  constructor(gcps: ImageWorldPosition[], order?: number) {
    this.gcps = gcps

    this.worldGcps = gcps.map((gcp) => gcp.world)
    this.resourceGcps = gcps.map((gcp) => gcp.image)

    if (order) {
      this.order = order
    }
  }

  createToWorldHelmert(): Helmert {
    return new Helmert(this.resourceGcps, this.worldGcps)
  }

  createToResourceHelmert(): Helmert {
    return new Helmert(this.worldGcps, this.resourceGcps)
  }

  toWorld(point: Position): Position {
    if (!this.toWorldHelmert) {
      this.toWorldHelmert = this.createToWorldHelmert()
    }

    return this.toWorldHelmert.interpolant(point)
  }

  toResource(point: Position): Position {
    if (!this.toResourceHelmert) {
      this.toResourceHelmert = this.createToResourceHelmert()
    }

    return this.toResourceHelmert.interpolant(point)
  }
}
