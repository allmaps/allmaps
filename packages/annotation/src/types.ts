import { z } from 'zod'

import {
  AnnotationAllVersionsSchema,
  AnnotationPageAllVersionsSchema,
  FeaturePropertiesAllVersionsSchema,
  Annotation0Schema,
  Annotation1Schema,
  AnnotationPage0Schema,
  AnnotationPage1Schema,
  SvgSelectorSchema,
  TargetSchema,
  SourceSchema,
  ResourceTypeSchema
} from './schemas/annotation.js'

import {
  GeoreferencedMap1Schema,
  GeoreferencedMap2Schema,
  GeoreferencedMaps1Schema,
  GeoreferencedMaps2Schema,
  GeoreferencedMapAllVersionsSchema,
  GeoreferencedMapsAllVersionsSchema,
  GCPAllVersionsSchema,
  GeoreferencedMap2GCPSchema,
  ResourceSchema
} from './schemas/georeferenced-map.js'

import {
  ImageServiceSchema,
  ResourceMaskSchema,
  PartOfSchema
} from './schemas/shared.js'

export type ImageService = z.infer<typeof ImageServiceSchema>
export type ResourceMask = z.infer<typeof ResourceMaskSchema>
export type PartOf = z.infer<typeof PartOfSchema>
export type ResourceType = z.infer<typeof ResourceTypeSchema>
export type Target = z.infer<typeof TargetSchema>
export type Source = z.infer<typeof SourceSchema>

export type GeoreferencedMap1 = z.infer<typeof GeoreferencedMap1Schema>
export type GeoreferencedMaps1 = z.infer<typeof GeoreferencedMaps1Schema>
export type GCP1 = z.infer<typeof GCPAllVersionsSchema>

export type GeoreferencedMap2 = z.infer<typeof GeoreferencedMap2Schema>
export type GeoreferencedMaps2 = z.infer<typeof GeoreferencedMaps2Schema>
export type GCP2 = z.infer<typeof GeoreferencedMap2GCPSchema>

export type GeoreferencedMapAllVersions = z.infer<
  typeof GeoreferencedMapAllVersionsSchema
>
export type GeoreferencedMapsAllVersions = z.infer<
  typeof GeoreferencedMapsAllVersionsSchema
>
export type GCP = z.infer<typeof GCPAllVersionsSchema>

export type Annotation0 = z.infer<typeof Annotation0Schema>
export type Annotation1 = z.infer<typeof Annotation1Schema>

export type AnnotationPage0 = z.infer<typeof AnnotationPage0Schema>
export type AnnotationPage1 = z.infer<typeof AnnotationPage1Schema>

export type AnnotationAllVersions = z.infer<typeof AnnotationAllVersionsSchema>
export type AnnotationPageAllVersions = z.infer<
  typeof AnnotationPageAllVersionsSchema
>

export type SvgSelector = z.infer<typeof SvgSelectorSchema>

export type Resource = z.infer<typeof ResourceSchema>

export type FeatureProperties = z.infer<
  typeof FeaturePropertiesAllVersionsSchema
>
