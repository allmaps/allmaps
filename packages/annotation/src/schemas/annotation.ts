import { z } from 'zod'

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
  SvgSelectorSchema as SvgSelector1Schema,
  TargetSchema as Target1Schema,
  SourceSchema as Source1Schema
} from './annotation/annotation.1.js'
import {
  ResourceTypeSchema,
  PointGeometrySchema,
  ImageServiceSchema,
  TransformationSchema,
  PartOfSchema
} from './shared.js'

const DefaultAnnotationSchema = Annotation1Schema
const DefaultAnnotationPageSchema = AnnotationPage1Schema

const DefaultFeaturePropertiesSchema = Annotation1FeaturePropertiesSchema

const DefaultTargetSchema = Target1Schema
const DefaultSourceSchema = Source1Schema
const DefaultSvgSelectorSchema = SvgSelector1Schema

const AnnotationAllVersionsSchema = z.union([
  Annotation0Schema,
  Annotation1Schema
])
const AnnotationPageAllVersionsSchema = z.union([
  AnnotationPage0Schema,
  AnnotationPage1Schema
])

const FeaturePropertiesAllVersionsSchema = z.union([
  Annotation0FeaturePropertiesSchema,
  Annotation1FeaturePropertiesSchema
])

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
  DefaultSvgSelectorSchema as SvgSelectorSchema,
  DefaultTargetSchema as TargetSchema,
  DefaultSourceSchema as SourceSchema,

  // All versions
  AnnotationAllVersionsSchema,
  AnnotationPageAllVersionsSchema,
  FeaturePropertiesAllVersionsSchema,

  // Shared schemas
  PointGeometrySchema,
  ImageServiceSchema,
  TransformationSchema,
  PartOfSchema,
  ResourceTypeSchema
}
