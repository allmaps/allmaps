import Polynomial from '../shared/polynomial.js'

import type { GCPTransformerInterface, Position, GCP } from '../shared/types.js'

export default class PolynomialGCPTransformer
  implements GCPTransformerInterface
{
  gcps: GCP[]

  gcpGeoCoords: Position[]
  gcpResourceCoords: Position[]

  toGeoPolynomial?: Polynomial
  toResourcePolynomial?: Polynomial

  order?: number

  constructor(gcps: GCP[], order?: number) {
    this.gcps = gcps

    this.gcpGeoCoords = gcps.map((gcp) => gcp.geo)
    this.gcpResourceCoords = gcps.map((gcp) => gcp.resource)

    if (order) {
      this.order = order
    }
  }

  createToGeoPolynomial(): Polynomial {
    return new Polynomial(this.gcpResourceCoords, this.gcpGeoCoords, this.order)
  }

  createToResourcePolynomial(): Polynomial {
    return new Polynomial(this.gcpGeoCoords, this.gcpResourceCoords, this.order)
  }

  toGeo(point: Position): Position {
    if (!this.toGeoPolynomial) {
      this.toGeoPolynomial = this.createToGeoPolynomial()
    }

    return this.toGeoPolynomial.interpolant(point)
  }

  toResource(point: Position): Position {
    if (!this.toResourcePolynomial) {
      this.toResourcePolynomial = this.createToResourcePolynomial()
    }

    return this.toResourcePolynomial.interpolant(point)
  }
}
