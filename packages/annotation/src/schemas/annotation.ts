import {
  AnnotationSchema as Annotation0Schema,
  AnnotationPageSchema as AnnotationPage0Schema,
  FeaturePropertiesSchema as Annotation0FeaturePropertiesSchema,
  SvgSelectorSchema as SvgSelector0Schema
} from './annotation/annotation.0.js'
import {
  AnnotationSchema as Annotation1Schema,
  AnnotationPageSchema as AnnotationPage1Schema,
  FeaturePropertiesSchema as Annotation1FeaturePropertiesSchema,
  SvgSelectorSchema as SvgSelector1Schema
} from './annotation/annotation.1.js'
import {
  PointGeometrySchema,
  ImageServiceSchema,
  TransformationSchema,
  PartOfSchema
} from './shared.js'

const DefaultAnnotationSchema = Annotation1Schema
const DefaultAnnotationPageSchema = AnnotationPage1Schema

const DefaultFeaturePropertiesSchema = Annotation1FeaturePropertiesSchema

const AnnotationAllVersionsSchema = Annotation0Schema.or(Annotation1Schema)
const AnnotationPageAllVersionsSchema = AnnotationPage0Schema.or(
  AnnotationPage1Schema
)

const FeaturePropertiesAllVersionsSchema =
  Annotation0FeaturePropertiesSchema.or(Annotation1FeaturePropertiesSchema)

export {
  Annotation0Schema,
  AnnotationPage0Schema,
  Annotation0FeaturePropertiesSchema,
  Annotation1Schema,
  AnnotationPage1Schema,
  Annotation1FeaturePropertiesSchema,
  SvgSelector0Schema,

  // Default schemas
  DefaultAnnotationSchema as AnnotationSchema,
  DefaultAnnotationPageSchema as AnnotationPageSchema,
  DefaultFeaturePropertiesSchema as FeaturePropertiesSchema,
  SvgSelector1Schema,

  // All versions
  AnnotationAllVersionsSchema,
  AnnotationPageAllVersionsSchema,
  FeaturePropertiesAllVersionsSchema,

  // Shared schemas
  PointGeometrySchema,
  ImageServiceSchema,
  TransformationSchema,
  PartOfSchema
}
