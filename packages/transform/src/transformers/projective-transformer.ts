import Projective from '../shared/projective.js'

import type { GCPTransformerInterface } from '../shared/types.js'

import type { Position, GCP } from '@allmaps/types'

export default class ProjectiveGCPTransformer
  implements GCPTransformerInterface
{
  gcps: GCP[]

  gcpGeoCoords: Position[]
  gcpResourceCoords: Position[]

  toGeoProjective?: Projective
  toResourceProjective?: Projective

  constructor(gcps: GCP[]) {
    this.gcps = gcps

    this.gcpGeoCoords = gcps.map((gcp) => gcp.geo)
    this.gcpResourceCoords = gcps.map((gcp) => gcp.resource)
  }

  createToGeoProjective(): Projective {
    return new Projective(this.gcpResourceCoords, this.gcpGeoCoords)
  }

  createToResourceProjective(): Projective {
    return new Projective(this.gcpGeoCoords, this.gcpResourceCoords)
  }

  toGeo(point: Position): Position {
    if (!this.toGeoProjective) {
      this.toGeoProjective = this.createToGeoProjective()
    }

    return this.toGeoProjective.interpolant(point)
  }

  transformForward(position: Position): Position {
    return this.toGeo(position)
  }

  toResource(point: Position): Position {
    if (!this.toResourceProjective) {
      this.toResourceProjective = this.createToResourceProjective()
    }

    return this.toResourceProjective.interpolant(point)
  }

  transformBackward(position: Position): Position {
    return this.toResource(position)
  }
}
