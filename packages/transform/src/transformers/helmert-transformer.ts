import Helmert from '../shared/helmert.js'

import type { GCPTransformerInterface } from '../shared/types.js'

import type { Position, GCP } from '@allmaps/types'

export default class HelmertGCPTransformer implements GCPTransformerInterface {
  gcps: GCP[]

  gcpGeoCoords: Position[]
  gcpResourceCoords: Position[]

  toGeoHelmert?: Helmert
  toResourceHelmert?: Helmert

  constructor(gcps: GCP[]) {
    this.gcps = gcps

    this.gcpGeoCoords = gcps.map((gcp) => gcp.geo)
    this.gcpResourceCoords = gcps.map((gcp) => gcp.resource)
  }

  createToGeoHelmert(): Helmert {
    return new Helmert(this.gcpResourceCoords, this.gcpGeoCoords)
  }

  createToResourceHelmert(): Helmert {
    return new Helmert(this.gcpGeoCoords, this.gcpResourceCoords)
  }

  toGeo(point: Position): Position {
    if (!this.toGeoHelmert) {
      this.toGeoHelmert = this.createToGeoHelmert()
    }

    return this.toGeoHelmert.interpolant(point)
  }

  transformForward(position: Position): Position {
    return this.toGeo(position)
  }

  toResource(point: Position): Position {
    if (!this.toResourceHelmert) {
      this.toResourceHelmert = this.createToResourceHelmert()
    }

    return this.toResourceHelmert.interpolant(point)
  }

  transformBackward(position: Position): Position {
    return this.toResource(position)
  }
}
