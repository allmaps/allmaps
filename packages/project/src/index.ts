export { ProjectedGcpTransformer } from './projected-transformers/ProjectedGcpTransformer.js'

export {
  lonLatProjection,
  webMercatorProjection,
  defaultProjectedGcpTransformerOptions,
  defaultProjectedGcpTransformOptions,
  lonLatToWebMercator,
  webMercatorToLonLat,
  isEqualProjection,
  projectionToAntialiasedProjection,
  projectionDefinitionToAntialiasedDefinition,
  getLonLatDefinition,
  getWebMercatorDefinition
} from './shared/project-functions.js'

export type {
  ProjectionDefinition,
  Projection,
  ProjectedGcpTransformOptions,
  ProjectedGcpTransformerOptions,
  ProjectionInputs,
  InternalProjectionInputs,
  ProjectedGcpTransformerInputs
} from './shared/types.js'
