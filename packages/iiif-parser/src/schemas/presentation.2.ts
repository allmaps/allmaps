// Presentation API 2.1 - Manifest
// https://iiif.io/api/presentation/2.1/#manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'
import {
  NavPlaceSchema,
  NavDateSchema,
  filterValidItems,
  oneOrMany,
  parseIfValid,
  optionalValue
} from '../schemas/shared.js'

export const SingleValue2Schema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((val) => String(val))

export const Value2Schema = z.union([
  SingleValue2Schema.array(),
  SingleValue2Schema
])

export const RelatedItem2Schema = z.object({
  '@id': z.string().url(),
  format: optionalValue(z.string()),
  label: optionalValue(Value2Schema)
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
    '@type': optionalValue(z.string()),
    format: optionalValue(z.string()),
    height: optionalValue(z.number()),
    width: optionalValue(z.number())
  })
])

export const Thumbnail2Schema = oneOrMany(ThumbnailItem2Schema)

export const RenderingItem2Schema = z.object({
  '@id': z.string().url(),
  '@type': optionalValue(z.string()),
  label: optionalValue(Value2Schema),
  format: optionalValue(z.string())
})

export const Rendering2Schema = oneOrMany(RenderingItem2Schema)

export const License2Schema = oneOrMany(z.string())

const ValidLanguageValue2Schema = z
  .union([
    z.object({
      '@value': Value2Schema,
      '@language': optionalValue(z.string())
    }),
    // This is invalid but some IIIF manifests use this incorrect format
    z.object({ value: Value2Schema, language: optionalValue(z.string()) })
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
  label: optionalValue(PossibleLanguageValue2Schema),
  value: optionalValue(PossibleLanguageValue2Schema)
})

// Invalid metadata items are intentionally skipped.
export const MetadataItem2Schema = parseIfValid(ValidMetadataItem2Schema)

export const Metadata2Schema = filterValidItems(ValidMetadataItem2Schema)

export const ImageResource2Schema = z.object({
  width: optionalValue(z.number().int()),
  height: optionalValue(z.number().int()),
  service: ImageServiceSchema
})

export const Annotation2Schema = z.object({
  resource: ImageResource2Schema
})

export const Canvas2Schema = z.object({
  '@id': z.string().url(),
  '@type': optionalValue(z.literal('sc:Canvas')),
  width: z.number().int(),
  height: z.number().int(),
  images: Annotation2Schema.array().length(1),
  label: optionalValue(PossibleLanguageValue2Schema),
  description: optionalValue(PossibleLanguageValue2Schema),
  related: optionalValue(Related2Schema),
  attribution: optionalValue(Attribution2Schema),
  license: optionalValue(License2Schema),
  thumbnail: optionalValue(Thumbnail2Schema),
  rendering: optionalValue(Rendering2Schema),
  metadata: optionalValue(Metadata2Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema)
})

const ManifestCanvas2Schema = Canvas2Schema.extend({
  images: Annotation2Schema.array().max(1)
})

const Sequence2Schema = z.object({
  canvases: ManifestCanvas2Schema.array()
    .nonempty()
    .transform((canvases): z.infer<typeof Canvas2Schema>[] =>
      canvases.filter((canvas) => canvas.images.length === 1)
    )
    .refine((canvases) => canvases.length > 0, {
      error: 'At least one Canvas must contain an image'
    })
})

export const Manifest2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Manifest'),
  sequences: Sequence2Schema.array().length(1),
  label: optionalValue(PossibleLanguageValue2Schema),
  description: optionalValue(PossibleLanguageValue2Schema),
  metadata: optionalValue(Metadata2Schema),
  related: optionalValue(Related2Schema),
  attribution: optionalValue(Attribution2Schema),
  license: optionalValue(License2Schema),
  rendering: optionalValue(Rendering2Schema),
  thumbnail: optionalValue(Thumbnail2Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema)
})

export const EmbeddedManifest2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Manifest'),
  label: optionalValue(PossibleLanguageValue2Schema),
  description: optionalValue(PossibleLanguageValue2Schema),
  metadata: optionalValue(Metadata2Schema),
  thumbnail: optionalValue(Thumbnail2Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema)
})

export const EmbeddedCollection2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Collection'),
  label: optionalValue(PossibleLanguageValue2Schema),
  description: optionalValue(PossibleLanguageValue2Schema),
  metadata: optionalValue(Metadata2Schema),
  thumbnail: optionalValue(Thumbnail2Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema)
})

export const Collection2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Collection'),
  get manifests() {
    return optionalValue(
      z.array(
        z.union([
          EmbeddedManifest2Schema,
          Collection2Schema,
          EmbeddedCollection2Schema
        ])
      )
    )
  },
  get collections() {
    return optionalValue(
      z.array(
        z.union([
          EmbeddedManifest2Schema,
          Collection2Schema,
          EmbeddedCollection2Schema
        ])
      )
    )
  },
  get members() {
    return optionalValue(
      z.array(
        z.union([
          EmbeddedManifest2Schema,
          Collection2Schema,
          EmbeddedCollection2Schema
        ])
      )
    )
  },
  label: optionalValue(PossibleLanguageValue2Schema),
  description: optionalValue(PossibleLanguageValue2Schema),
  metadata: optionalValue(Metadata2Schema),
  thumbnail: optionalValue(Thumbnail2Schema),
  navDate: optionalValue(NavDateSchema),
  navPlace: optionalValue(NavPlaceSchema),
  related: optionalValue(Related2Schema),
  attribution: optionalValue(Attribution2Schema),
  license: optionalValue(License2Schema),
  rendering: optionalValue(Rendering2Schema)
})
