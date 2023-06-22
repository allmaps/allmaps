import RBF from '../shared/radial-basis-function.js'

import { euclideanNorm } from '../shared/norm-functions.js'

import type {
  GCPTransformerInterface,
  KernelFunction,
  NormFunction,
  Position,
  ImageWorldPosition
} from '../shared/types.js'

export default class RadialBasisFunctionGCPTransformer
  implements GCPTransformerInterface
{
  gcps: ImageWorldPosition[]

  worldGcps: Position[]
  resourceGcps: Position[]

  kernelFunction: KernelFunction
  normFunction: NormFunction

  toWorldRbf?: RBF
  toResourceRbf?: RBF

  constructor(gcps: ImageWorldPosition[], kernelFunction: KernelFunction) {
    this.gcps = gcps

    this.worldGcps = gcps.map((gcp) => gcp.world)
    this.resourceGcps = gcps.map((gcp) => gcp.image)

    this.kernelFunction = kernelFunction
    this.normFunction = euclideanNorm
  }

  createToWorldRbf(): RBF {
    return new RBF(
      this.resourceGcps,
      this.worldGcps,
      this.kernelFunction,
      this.normFunction
    )
  }

  createToResourceRbf(): RBF {
    return new RBF(
      this.worldGcps,
      this.resourceGcps,
      this.kernelFunction,
      this.normFunction
    )
  }

  toWorld(point: Position): Position {
    if (!this.toWorldRbf) {
      this.toWorldRbf = this.createToWorldRbf()
    }

    return this.toWorldRbf.interpolant(point)
  }

  toResource(point: Position): Position {
    if (!this.toResourceRbf) {
      this.toResourceRbf = this.createToResourceRbf()
    }

    return this.toResourceRbf.interpolant(point)
  }
}
