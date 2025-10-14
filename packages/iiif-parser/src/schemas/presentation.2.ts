// Presentation API 2.1 - Manifest
// https://iiif.io/api/presentation/2.1/#manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'
import { NavPlaceSchema, NavDateSchema } from '../schemas/shared.js'

import { ensureArray } from '../lib/convert.js'

export const SingleValue2Schema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((val) => String(val))

export const Value2Schema = z.union([
  SingleValue2Schema.array(),
  SingleValue2Schema
])

export const RelatedItem2Schema = z.object({
  '@id': z.string().url(),
  format: z.string().optional(),
  label: Value2Schema.optional()
})

export const Related2Schema = z.union([
  RelatedItem2Schema,
  RelatedItem2Schema.array(),
  SingleValue2Schema,
  SingleValue2Schema.array()
])

export const ThumbnailItem2Schema = z.union([
  z.string(),
  z.object({
    '@id': z.string(),
    '@type': z.string().optional(),
    format: z.string().optional(),
    height: z.number().optional(),
    width: z.number().optional()
  })
])

export const Thumbnail2Schema = z
  .union([ThumbnailItem2Schema.array(), ThumbnailItem2Schema])
  .transform(ensureArray)

export const RenderingItem2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.string().optional(),
  label: Value2Schema.optional(),
  format: z.string().optional()
})

export const Rendering2Schema = z
  .union([RenderingItem2Schema.array(), RenderingItem2Schema])
  .transform(ensureArray)

const ValidLanguageValue2Schema = z
  .union([
    z.object({ '@value': Value2Schema, '@language': z.string().optional() }),
    // This is invalid but some IIIF manifests use this incorrect format
    z.object({ value: Value2Schema, language: z.string().optional() })
  ])
  .transform((val) => {
    if ('value' in val) {
      return {
        '@value': val.value,
        '@language': val.language
      }
    } else {
      return val
    }
  })

export const LanguageValue2Schema = ValidLanguageValue2Schema

export const PossibleLanguageValue2Schema = z.union([
  LanguageValue2Schema.array(),
  LanguageValue2Schema,
  Value2Schema
])

export const Attribution2Schema = z.union([
  z.string(),
  PossibleLanguageValue2Schema
])

const ValidMetadataItem2Schema = z.object({
  label: PossibleLanguageValue2Schema.optional(),
  value: PossibleLanguageValue2Schema.optional()
})

export const MetadataItem2Schema = z
  .union([
    ValidMetadataItem2Schema,

    // Catchall for incorrect values
    z.any()
  ])
  .transform((val) => {
    const { success, data } = ValidMetadataItem2Schema.safeParse(val)

    if (success) {
      return data
    }
  })

export const Metadata2Schema = MetadataItem2Schema.array()

export const ImageResource2Schema = z.object({
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  service: ImageServiceSchema
})

export const Annotation2Schema = z.object({
  resource: ImageResource2Schema
})

export const Canvas2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Canvas'),
  width: z.number().int(),
  height: z.number().int(),
  images: Annotation2Schema.array().length(1),
  label: PossibleLanguageValue2Schema.optional(),
  description: PossibleLanguageValue2Schema.optional(),
  related: Related2Schema.optional(),
  attribution: Attribution2Schema.optional(),
  thumbnail: Thumbnail2Schema.optional(),
  rendering: Rendering2Schema.optional(),
  metadata: Metadata2Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional()
})

const Sequence2Schema = z.object({
  canvases: Canvas2Schema.array().nonempty()
})

export const Manifest2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Manifest'),
  sequences: Sequence2Schema.array().length(1),
  label: PossibleLanguageValue2Schema.optional(),
  description: PossibleLanguageValue2Schema.optional(),
  metadata: Metadata2Schema.optional(),
  related: Related2Schema.optional(),
  attribution: Attribution2Schema.optional(),
  rendering: Rendering2Schema.optional(),
  thumbnail: Thumbnail2Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional()
})

export type EmbeddedManifest2 = {
  '@id': string
  '@type': 'sc:Manifest'
  label?: z.infer<typeof PossibleLanguageValue2Schema>
  description?: z.infer<typeof PossibleLanguageValue2Schema>
  metadata?: z.infer<typeof Metadata2Schema>
  thumbnail?: z.infer<typeof Thumbnail2Schema>
  rendering?: z.infer<typeof Rendering2Schema>
  navDate?: z.infer<typeof NavDateSchema>
  navPlace?: z.infer<typeof NavPlaceSchema>
}
type Collection2Item =
  | EmbeddedManifest2
  | Collection2
  | z.infer<typeof EmbeddedCollection2Schema>

export type Collection2 = {
  '@id': string
  '@type': 'sc:Collection'
  manifests?: Collection2Item[]
  collections?: Collection2Item[]
  members?: Collection2Item[]
  label?: z.infer<typeof PossibleLanguageValue2Schema>
  description?: z.infer<typeof PossibleLanguageValue2Schema>
  metadata?: z.infer<typeof Metadata2Schema>
  thumbnail?: z.infer<typeof Thumbnail2Schema>
  rendering?: z.infer<typeof Rendering2Schema>
  navDate?: z.infer<typeof NavDateSchema>
  navPlace?: z.infer<typeof NavPlaceSchema>
  related?: z.infer<typeof Related2Schema>
  attribution?: z.infer<typeof Attribution2Schema>
}

// @ts-expect-error - Lazy type is not correctly inferred
export const EmbeddedManifest2Schema: z.ZodType<EmbeddedManifest2> = z.lazy(
  () =>
    z.object({
      '@id': z.string().url(),
      '@type': z.literal('sc:Manifest'),
      label: PossibleLanguageValue2Schema.optional(),
      description: PossibleLanguageValue2Schema.optional(),
      metadata: Metadata2Schema.optional(),
      thumbnail: Thumbnail2Schema.optional(),
      navDate: NavDateSchema.optional(),
      navPlace: NavPlaceSchema.optional()
    })
)

// @ts-expect-error - Lazy type is not correctly inferred
export const Collection2Schema: z.ZodType<Collection2> = z.lazy(() => {
  const Collection2ItemSchema = z.union([
    EmbeddedManifest2Schema,
    Collection2Schema,
    EmbeddedCollection2Schema
  ])

  return z.object({
    '@id': z.string().url(),
    '@type': z.literal('sc:Collection'),
    manifests: Collection2ItemSchema.array().optional(),
    collections: Collection2ItemSchema.array().optional(),
    members: Collection2ItemSchema.array().optional(),
    label: PossibleLanguageValue2Schema.optional(),
    description: PossibleLanguageValue2Schema.optional(),
    metadata: Metadata2Schema.optional(),
    thumbnail: Thumbnail2Schema.optional(),
    navDate: NavDateSchema.optional(),
    navPlace: NavPlaceSchema.optional(),
    related: Related2Schema.optional(),
    attribution: Attribution2Schema.optional(),
    rendering: Rendering2Schema.optional()
  })
})

export const EmbeddedCollection2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Collection'),
  label: PossibleLanguageValue2Schema.optional(),
  description: PossibleLanguageValue2Schema.optional(),
  metadata: Metadata2Schema.optional(),
  thumbnail: Thumbnail2Schema.optional(),
  navDate: NavDateSchema.optional(),
  navPlace: NavPlaceSchema.optional()
})
