import Polynomial from '../shared/polynomial.js'

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

  toWorldPolynomial?: Polynomial
  toResourcePolynomial?: Polynomial

  order?: number

  constructor(gcps: ImageWorldPosition[], order?: number) {
    this.gcps = gcps

    this.worldGcps = gcps.map((gcp) => gcp.world)
    this.resourceGcps = gcps.map((gcp) => gcp.image)

    if (order) {
      this.order = order
    }
  }

  createToWorldPolynomial(): Polynomial {
    return new Polynomial(this.resourceGcps, this.worldGcps, this.order)
  }

  createToResourcePolynomial(): Polynomial {
    return new Polynomial(this.worldGcps, this.resourceGcps, this.order)
  }

  toWorld(point: Position): Position {
    if (!this.toWorldPolynomial) {
      this.toWorldPolynomial = this.createToWorldPolynomial()
    }

    return this.toWorldPolynomial.interpolant(point)
  }

  toResource(point: Position): Position {
    if (!this.toResourcePolynomial) {
      this.toResourcePolynomial = this.createToResourcePolynomial()
    }

    return this.toResourcePolynomial.interpolant(point)
  }
}
