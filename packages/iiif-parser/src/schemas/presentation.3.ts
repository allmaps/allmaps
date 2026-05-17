// Presentation API 3.0 - Manifest
// https://iiif.io/api/presentation/3.0/#52-manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'
import {
  NavDateSchema,
  NavPlaceSchema,
  filterValidItems,
  oneOrMany,
  parseIfValid
} from '../schemas/shared.js'

export const SingleValue3Schema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((val) => String(val))

export const LanguageValue3Schema = z.record(
  z.string(),
  SingleValue3Schema.array()
)

export const Summary3Schema = LanguageValue3Schema

export const HomepageItem3Schema = z.object({
  id: z.string().url(),
  type: z.string().optional(),
  label: LanguageValue3Schema,
  format: z.string().optional(),
  language: z.union([z.string(), z.array(z.string())]).optional()
})

export const Rendering3ItemSchema = z.object({
  id: z.string().url(),
  type: z.string().optional(),
  label: LanguageValue3Schema,
  format: z.string().optional()
})

export const Rendering3Schema = oneOrMany(Rendering3ItemSchema)

export const Homepage3Schema = oneOrMany(HomepageItem3Schema)

export const ThumbnailItem3Schema = z.object({
  id: z.string(),
  type: z.string().optional(),
  format: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional()
})

export const Thumbnail3Schema = oneOrMany(ThumbnailItem3Schema)

export const SeeAlsoItem3Schema = z.object({
  id: z.string().url(),
  type: z.string().optional(),
  format: z.string().optional(),
  profile: z.string().optional()
})

export const SeeAlso3Schema = oneOrMany(SeeAlsoItem3Schema)

export const NonPaintingAnnotations3 = z
  .object({
    id: z.string().url(),
    type: z.literal('AnnotationPage'),
    items: z.array(z.looseObject({})).optional()
  })
  .array()

const ValidMetadataItem3Schema = z.object({
  label: LanguageValue3Schema,
  value: LanguageValue3Schema
})

// Invalid metadata items are intentionally skipped.
export const MetadataItem3Schema = parseIfValid(ValidMetadataItem3Schema)

export const Metadata3Schema = filterValidItems(ValidMetadataItem3Schema)

// Invalid requiredStatement values are intentionally treated as absent.
export const RequiredStatement3Schema = MetadataItem3Schema

export const AnnotationImageBody3Schema = z.object({
  type: z.literal('Image'),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  service: ImageServiceSchema.array()
})

export const AnnotationVideoBody3Schema = z.object({
  type: z.literal('Video')
})

export const AnnotationSoundBody3Schema = z.object({
  type: z.literal('Sound')
})

export const AnnotationBody3Schema = z.discriminatedUnion('type', [
  AnnotationImageBody3Schema,
  AnnotationVideoBody3Schema,
  AnnotationSoundBody3Schema
])

const Choice3Schema = z.object({
  type: z.literal('Choice'),
  items: AnnotationBody3Schema.array()
})

const Annotation3Schema = z.object({
  type: z.literal('Annotation'),
  body: z.union([
    AnnotationBody3Schema,
    AnnotationBody3Schema.array().length(1),
    Choice3Schema
  ])
})

const AnnotationPage3Schema = z.object({
  type: z.literal('AnnotationPage'),
  items: Annotation3Schema.array().length(1)
})

export const Canvas3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Canvas'),
  width: z.number().int(),
  height: z.number().int(),
  items: AnnotationPage3Schema.array(),
  label: LanguageValue3Schema.optional(),
  description: LanguageValue3Schema.optional(),
  metadata: Metadata3Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional(),
  homepage: Homepage3Schema.optional(),
  thumbnail: Thumbnail3Schema.optional(),
  rendering: Rendering3Schema.optional(),
  seeAlso: SeeAlso3Schema.optional(),
  summary: Summary3Schema.optional(),
  requiredStatement: RequiredStatement3Schema.optional(),
  annotations: NonPaintingAnnotations3.optional()
})

export const Manifest3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Manifest'),
  items: Canvas3Schema.array(),
  label: LanguageValue3Schema.optional(),
  description: LanguageValue3Schema.optional(),
  metadata: Metadata3Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional(),
  homepage: Homepage3Schema.optional(),
  thumbnail: Thumbnail3Schema.optional(),
  rendering: Rendering3Schema.optional(),
  seeAlso: SeeAlso3Schema.optional(),
  summary: Summary3Schema.optional(),
  requiredStatement: RequiredStatement3Schema.optional(),
  annotations: NonPaintingAnnotations3.optional()
})

export const EmbeddedManifest3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Manifest'),
  label: LanguageValue3Schema.optional(),
  description: LanguageValue3Schema.optional(),
  metadata: Metadata3Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional(),
  thumbnail: Thumbnail3Schema.optional()
})

export const EmbeddedCollection3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Collection'),
  label: LanguageValue3Schema.optional(),
  description: LanguageValue3Schema.optional(),
  metadata: Metadata3Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional(),
  thumbnail: Thumbnail3Schema.optional()
})

export const Collection3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Collection'),
  get items() {
    return z.array(
      z.union([
        EmbeddedManifest3Schema,
        Collection3Schema,
        EmbeddedCollection3Schema
      ])
    )
  },
  label: LanguageValue3Schema.optional(),
  description: LanguageValue3Schema.optional(),
  metadata: Metadata3Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional(),
  thumbnail: Thumbnail3Schema.optional(),
  homepage: Homepage3Schema.optional(),
  rendering: Rendering3Schema.optional(),
  seeAlso: SeeAlso3Schema.optional(),
  summary: Summary3Schema.optional(),
  requiredStatement: RequiredStatement3Schema.optional(),
  annotations: NonPaintingAnnotations3.optional()
})
