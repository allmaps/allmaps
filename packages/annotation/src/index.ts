export { parseAnnotation } from './parser.js'
export { generateAnnotation } from './generator.js'
export { validateAnnotation, validateGeoreferencedMap } from './validator.js'

export {
  GeoreferencedMap1Schema,
  GeoreferencedMaps1Schema,
  GeoreferencedMap1GCPSchema,
  GeoreferencedMap1ImageSchema,
  GeoreferencedMap2Schema,
  GeoreferencedMaps2Schema,
  GeoreferencedMap2GCPSchema,
  GeoreferencedMap2ResourceSchema,

  // Default schemas
  GeoreferencedMapSchema,
  GeoreferencedMapsSchema,
  GCPSchema,
  ResourceSchema,

  // All versions
  GeoreferencedMapAllVersionsSchema,
  GeoreferencedMapsAllVersionsSchema,
  GCPAllVersionsSchema
} from './schemas/georeferenced-map.js'

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
  SvgSelectorSchema,

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
  GeoreferencedMap2 as GeoreferencedMap,
  Annotation1 as Annotation,
  AnnotationPage1 as AnnotationPage
} from './types.js'
