import GCPTransformer from './transformer.js'

import HelmertGCPTransformer from './transformers/helmert-transformer.js'
import PolynomialGCPTransformer from './transformers/polynomial-transformer.js'
import ProjectiveGCPTransformer from './transformers/projective-transformer.js'
import RadialBasisFunctionGCPTransformer from './transformers/radial-basis-function-transformer.js'
import { thinPlateKernel } from './shared/kernel-functions.js'

// TODO: consider only exporting GCPTransformer
export {
  GCPTransformer,
  HelmertGCPTransformer,
  PolynomialGCPTransformer,
  ProjectiveGCPTransformer,
  RadialBasisFunctionGCPTransformer
}

// TODO: can this be removed?
export { thinPlateKernel }

export * from './shared/types.js'
