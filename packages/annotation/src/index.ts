export { parseAnnotation } from './parser.js'
export { generateAnnotation } from './generator.js'
export { validateAnnotation, validateMap } from './validator.js'

export {
  Map1Schema,
  Maps1Schema,
  Map1GCPSchema,
  Map1ImageSchema,
  Map2Schema,
  Maps2Schema,
  Map2GCPSchema,
  Map2ResourceSchema,

  // Default schemas
  MapSchema,
  MapsSchema,
  GCPSchema,
  ResourceSchema,

  // All versions
  MapAllVersionsSchema,
  MapsAllVersionsSchema,
  GCPAllVersionsSchema
} from './schemas/map.js'

export {
  Annotation0Schema,
  AnnotationPage0Schema,
  Annotation0FeaturePropertiesSchema,
  Annotation1Schema,
  AnnotationPage1Schema,
  Annotation1FeaturePropertiesSchema,
  SvgSelector0Schema,

  // Default schemas
  AnnotationSchema,
  AnnotationPageSchema,
  FeaturePropertiesSchema,
  SvgSelector1Schema,

  // All versions
  AnnotationAllVersionsSchema,
  AnnotationPageAllVersionsSchema,
  FeaturePropertiesAllVersionsSchema
} from './schemas/annotation.js'

export {
  PartOfSchema,
  ResourceMaskSchema,
  TransformationSchema
} from './schemas/shared.js'

export type {
  Map2 as Map,
  Annotation1 as Annotation,
  AnnotationPage1 as AnnotationPage
} from './types.js'
