import RBF from '../shared/radial-basis-function.js'

import { euclideanNorm } from '../shared/norm-functions.js'

import type {
  GCPTransformerInterface,
  KernelFunction,
  NormFunction
} from '../shared/types.js'

import type { Position, GCP } from '@allmaps/types'

export default class RadialBasisFunctionGCPTransformer
  implements GCPTransformerInterface
{
  gcps: GCP[]

  gcpGeoCoords: Position[]
  gcpResourceCoords: Position[]

  kernelFunction: KernelFunction
  normFunction: NormFunction

  toGeoRbf?: RBF
  toResourceRbf?: RBF

  constructor(gcps: GCP[], kernelFunction: KernelFunction) {
    this.gcps = gcps

    this.gcpGeoCoords = gcps.map((gcp) => gcp.geo)
    this.gcpResourceCoords = gcps.map((gcp) => gcp.resource)

    this.kernelFunction = kernelFunction
    this.normFunction = euclideanNorm
  }

  createToGeoRbf(): RBF {
    return new RBF(
      this.gcpResourceCoords,
      this.gcpGeoCoords,
      this.kernelFunction,
      this.normFunction
    )
  }

  createToResourceRbf(): RBF {
    return new RBF(
      this.gcpGeoCoords,
      this.gcpResourceCoords,
      this.kernelFunction,
      this.normFunction
    )
  }

  toGeo(point: Position): Position {
    if (!this.toGeoRbf) {
      this.toGeoRbf = this.createToGeoRbf()
    }

    return this.toGeoRbf.interpolant(point)
  }

  transformForward(position: Position): Position {
    return this.toGeo(position)
  }

  toResource(point: Position): Position {
    if (!this.toResourceRbf) {
      this.toResourceRbf = this.createToResourceRbf()
    }

    return this.toResourceRbf.interpolant(point)
  }

  transformBackward(position: Position): Position {
    return this.toResource(position)
  }
}
