import { z } from 'zod'

import {
  AnnotationAllVersionsSchema,
  AnnotationPageAllVersionsSchema,
  FeaturePropertiesAllVersionsSchema,
  Annotation0Schema,
  Annotation1Schema,
  AnnotationPage0Schema,
  AnnotationPage1Schema,
  SvgSelector1Schema
} from './schemas/annotation.js'

import {
  Map1Schema,
  Map2Schema,
  Maps1Schema,
  Maps2Schema,
  MapAllVersionsSchema,
  MapsAllVersionsSchema,
  GCPAllVersionsSchema,
  Map2GCPSchema,
  ResourceSchema
} from './schemas/map.js'

import {
  ImageServiceSchema,
  ResourceMaskSchema,
  PartOfSchema
} from './schemas/shared.js'

export type ImageService = z.infer<typeof ImageServiceSchema>
export type ResourceMask = z.infer<typeof ResourceMaskSchema>
export type PartOf = z.infer<typeof PartOfSchema>

export type Map1 = z.infer<typeof Map1Schema>
export type Maps1 = z.infer<typeof Maps1Schema>
export type GCP1 = z.infer<typeof GCPAllVersionsSchema>

export type Map2 = z.infer<typeof Map2Schema>
export type Maps2 = z.infer<typeof Maps2Schema>
export type GCP2 = z.infer<typeof Map2GCPSchema>

export type MapAllVersions = z.infer<typeof MapAllVersionsSchema>
export type MapsAllVersions = z.infer<typeof MapsAllVersionsSchema>
export type GCP = z.infer<typeof GCPAllVersionsSchema>

export type Annotation0 = z.infer<typeof Annotation0Schema>
export type Annotation1 = z.infer<typeof Annotation1Schema>

export type AnnotationPage0 = z.infer<typeof AnnotationPage0Schema>
export type AnnotationPage1 = z.infer<typeof AnnotationPage1Schema>

export type AnnotationAllVersions = z.infer<typeof AnnotationAllVersionsSchema>
export type AnnotationPageAllVersions = z.infer<
  typeof AnnotationPageAllVersionsSchema
>

export type SvgSelector1 = z.infer<typeof SvgSelector1Schema>

export type Resource = z.infer<typeof ResourceSchema>

export type FeatureProperties = z.infer<
  typeof FeaturePropertiesAllVersionsSchema
>
