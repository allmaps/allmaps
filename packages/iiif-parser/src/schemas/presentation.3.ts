// Presentation API 3.0 - Manifest
// https://iiif.io/api/presentation/3.0/#52-manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'
import { NavDateSchema, NavPlaceSchema } from '../schemas/shared.js'

import { ensureArray } from '../lib/convert.js'

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

export const Rendering3Schema = z
  .union([Rendering3ItemSchema.array(), Rendering3ItemSchema])
  .transform(ensureArray)

export const Homepage3Schema = z
  .union([HomepageItem3Schema.array(), HomepageItem3Schema])
  .transform(ensureArray)

export const ThumbnailItem3Schema = z.object({
  id: z.string(),
  type: z.string().optional(),
  format: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional()
})

export const Thumbnail3Schema = z
  .union([ThumbnailItem3Schema.array(), ThumbnailItem3Schema])
  .transform(ensureArray)

export const SeeAlsoItem3Schema = z.object({
  id: z.string().url(),
  type: z.string().optional(),
  format: z.string().optional(),
  profile: z.string().optional()
})

export const SeeAlso3Schema = z
  .union([SeeAlsoItem3Schema.array(), SeeAlsoItem3Schema])
  .transform(ensureArray)

export const NonPaintingAnnotations3 = z
  .object({
    id: z.string().url(),
    type: z.literal('AnnotationPage'),
    items: z.object({}).passthrough().array().optional()
  })
  .array()

const ValidMetadataItem3Schema = z.object({
  label: LanguageValue3Schema,
  value: LanguageValue3Schema
})

export const MetadataItem3Schema = z
  .union([
    ValidMetadataItem3Schema,

    // Catchall for incorrect values
    z.any()
  ])
  .transform((val) => {
    const { success, data } = ValidMetadataItem3Schema.safeParse(val)
    if (success) {
      return data
    }
  })

export const Metadata3Schema = MetadataItem3Schema.array()

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

export const AnnotationBody3Schema = z.union([
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

export type EmbeddedManifest3 = {
  id: string
  type: 'Manifest'
  label?: z.infer<typeof LanguageValue3Schema>
  description?: z.infer<typeof LanguageValue3Schema>
  metadata?: z.infer<typeof Metadata3Schema>
  navPlace?: z.infer<typeof NavPlaceSchema>
  navDate?: z.infer<typeof NavDateSchema>
  homepage?: z.infer<typeof Homepage3Schema>
  thumbnail?: z.infer<typeof Thumbnail3Schema>
}

export type Collection3 = {
  id: string
  type: 'Collection'
  items: (
    | EmbeddedManifest3
    | Collection3
    | z.infer<typeof EmbeddedCollection3Schema>
  )[]
  label?: z.infer<typeof LanguageValue3Schema>
  description?: z.infer<typeof LanguageValue3Schema>
  metadata?: z.infer<typeof Metadata3Schema>
  navPlace?: z.infer<typeof NavPlaceSchema>
  navDate?: z.infer<typeof NavDateSchema>
  homepage?: z.infer<typeof Homepage3Schema>
  thumbnail?: z.infer<typeof Thumbnail3Schema>
  rendering?: z.infer<typeof Rendering3Schema>
  seeAlso?: z.infer<typeof SeeAlso3Schema>
  summary?: z.infer<typeof Summary3Schema>
  requiredStatement?: z.infer<typeof RequiredStatement3Schema>
  annotations?: z.infer<typeof NonPaintingAnnotations3>
}

// @ts-expect-error - Lazy type is not correctly inferred
export const EmbeddedManifest3Schema: z.ZodType<EmbeddedManifest3> = z.lazy(
  () =>
    z.object({
      id: z.string().url(),
      type: z.literal('Manifest'),
      label: LanguageValue3Schema.optional(),
      description: LanguageValue3Schema.optional(),
      metadata: Metadata3Schema.optional(),
      navDate: NavDateSchema.optional(),
      navPlace: NavPlaceSchema.optional(),
      thumbnail: Thumbnail3Schema.optional()
    })
)

// @ts-expect-error - Lazy type is not correctly inferred
export const Collection3Schema: z.ZodType<Collection3> = z.lazy(() =>
  z.object({
    id: z.string().url(),
    type: z.literal('Collection'),
    items: z
      .union([
        EmbeddedManifest3Schema,
        Collection3Schema,
        EmbeddedCollection3Schema
      ])
      .array(),
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
)

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
