import GCPTransformer from './transformer.js'

import PolynomialGCPTransformer from './transformers/polynomial-transformer.js'
import RadialBasisFunctionGCPTransformer from './transformers/radial-basis-function-transformer.js'
import { distanceThinPlate } from './shared/distance-functions.js'

export {
  GCPTransformer,
  PolynomialGCPTransformer,
  RadialBasisFunctionGCPTransformer
}
export { distanceThinPlate }

export * from './shared/types.js'
