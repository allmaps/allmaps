import type {
  TransformerInterface,
  TransformationType,
  Position,
  ImageWorldPosition
} from './shared/types.js'

import PolynomialTransformer from './transformers/polynomial-transformer.js'
import RadialBasisFunctionTransformer from './transformers/radial-basis-function-transformer.js'

import { distanceThinPlate } from './shared/distance-functions.js'

export default class Transformer implements TransformerInterface {
  gcps: ImageWorldPosition[]
  transformer: TransformerInterface

  constructor(
    gcps: ImageWorldPosition[],
    type: TransformationType = 'polynomial'
    // options: TransformationOptions
  ) {
    this.gcps = gcps

    if (type === 'polynomial') {
      this.transformer = new PolynomialTransformer(gcps)
    } else if (type === 'thin-plate-spline') {
      this.transformer = new RadialBasisFunctionTransformer(
        gcps,
        distanceThinPlate
      )
    } else {
      throw new Error(`Unsupported transformation type: ${type}`)
    }
  }

  toWorld(point: Position): Position {
    return this.transformer.toWorld(point)
  }

  toResource(point: Position): Position {
    return this.transformer.toResource(point)
  }
}
