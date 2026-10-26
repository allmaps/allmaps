// Presentation API 3.0 - Manifest
// https://iiif.io/api/presentation/3.0/#52-manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'
import {
  NavDateSchema,
  NavPlaceSchema,
  filterValidItems,
  oneOrMany,
  parseIfValid,
  optionalValue
} from '../schemas/shared.js'

export const SingleValue3Schema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((val) => String(val))

export const LanguageValue3Schema = z.record(
  z.string(),
  SingleValue3Schema.array()
)

// Invalid summary values are intentionally treated as absent.
export const Summary3Schema = parseIfValid(LanguageValue3Schema)

export const HomepageItem3Schema = z.object({
  id: z.string().url(),
  type: optionalValue(z.string()),
  label: LanguageValue3Schema,
  format: optionalValue(z.string()),
  language: optionalValue(z.union([z.string(), z.array(z.string())]))
})

export const Rendering3ItemSchema = z.object({
  id: z.string().url(),
  type: optionalValue(z.string()),
  label: LanguageValue3Schema,
  format: optionalValue(z.string())
})

export const Rendering3Schema = oneOrMany(Rendering3ItemSchema)

export const Homepage3Schema = oneOrMany(HomepageItem3Schema)

export const ThumbnailItem3Schema = z.object({
  id: z.string(),
  type: optionalValue(z.string()),
  format: optionalValue(z.string()),
  width: optionalValue(z.number().int()),
  height: optionalValue(z.number().int())
})

export const Thumbnail3Schema = oneOrMany(ThumbnailItem3Schema)

export const SeeAlsoItem3Schema = z.object({
  id: z.string().url(),
  type: optionalValue(z.string()),
  format: optionalValue(z.string()),
  profile: optionalValue(z.string())
})

export const SeeAlso3Schema = oneOrMany(SeeAlsoItem3Schema)

export const NonPaintingAnnotations3 = z
  .object({
    id: z.string().url(),
    type: z.literal('AnnotationPage'),
    items: optionalValue(z.array(z.looseObject({})))
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

export const Rights3Schema = z.string()

export const Agent3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Agent'),
  label: optionalValue(LanguageValue3Schema),
  homepage: optionalValue(Homepage3Schema),
  logo: optionalValue(Thumbnail3Schema),
  seeAlso: optionalValue(SeeAlso3Schema)
})

export const Provider3Schema = Agent3Schema.array()

export const AnnotationImageBody3Schema = z.object({
  type: z.literal('Image'),
  width: optionalValue(z.number().int()),
  height: optionalValue(z.number().int()),
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
  label: optionalValue(LanguageValue3Schema),
  description: optionalValue(LanguageValue3Schema),
  metadata: optionalValue(Metadata3Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema),
  homepage: optionalValue(Homepage3Schema),
  thumbnail: optionalValue(Thumbnail3Schema),
  rendering: optionalValue(Rendering3Schema),
  seeAlso: optionalValue(SeeAlso3Schema),
  summary: optionalValue(Summary3Schema),
  requiredStatement: optionalValue(RequiredStatement3Schema),
  rights: optionalValue(Rights3Schema),
  provider: optionalValue(Provider3Schema),
  annotations: optionalValue(NonPaintingAnnotations3)
})

export const Manifest3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Manifest'),
  items: Canvas3Schema.array(),
  label: optionalValue(LanguageValue3Schema),
  description: optionalValue(LanguageValue3Schema),
  metadata: optionalValue(Metadata3Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema),
  homepage: optionalValue(Homepage3Schema),
  thumbnail: optionalValue(Thumbnail3Schema),
  rendering: optionalValue(Rendering3Schema),
  seeAlso: optionalValue(SeeAlso3Schema),
  summary: optionalValue(Summary3Schema),
  rights: optionalValue(Rights3Schema),
  provider: optionalValue(Provider3Schema),
  requiredStatement: optionalValue(RequiredStatement3Schema),
  annotations: optionalValue(NonPaintingAnnotations3)
})

export const EmbeddedManifest3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Manifest'),
  label: optionalValue(LanguageValue3Schema),
  description: optionalValue(LanguageValue3Schema),
  metadata: optionalValue(Metadata3Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema),
  thumbnail: optionalValue(Thumbnail3Schema)
})

export const EmbeddedCollection3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Collection'),
  label: optionalValue(LanguageValue3Schema),
  description: optionalValue(LanguageValue3Schema),
  metadata: optionalValue(Metadata3Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema),
  thumbnail: optionalValue(Thumbnail3Schema)
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
  label: optionalValue(LanguageValue3Schema),
  description: optionalValue(LanguageValue3Schema),
  metadata: optionalValue(Metadata3Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema),
  thumbnail: optionalValue(Thumbnail3Schema),
  homepage: optionalValue(Homepage3Schema),
  rendering: optionalValue(Rendering3Schema),
  seeAlso: optionalValue(SeeAlso3Schema),
  summary: optionalValue(Summary3Schema),
  rights: optionalValue(Rights3Schema),
  provider: optionalValue(Provider3Schema),
  requiredStatement: optionalValue(RequiredStatement3Schema),
  annotations: optionalValue(NonPaintingAnnotations3)
})
