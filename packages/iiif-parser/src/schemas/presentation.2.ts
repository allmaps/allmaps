// Presentation API 2.1 - Manifest
// https://iiif.io/api/presentation/2.1/#manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'

export const SingleValue2Schema = z.string().or(z.number()).or(z.boolean())
export const Value2Schema = SingleValue2Schema.or(SingleValue2Schema.array())

export const LanguageValue2Schema = z
  .union([
    z.object({
      '@language': z.string().optional(),
      '@value': Value2Schema
    }),
    // This is invalid but some IIIF manifests use this incorrect format
    z.object({
      language: z.string().optional(),
      value: Value2Schema
    }),
    z.any()
  ])
  .transform((val) => {
    if (val && typeof val === 'object') {
      if ('@language' in val && '@value' in val) {
        return val
      } else if ('language' in val && 'value' in val) {
        return {
          '@language': val.language,
          '@value': val.value
        }
      }
    }
  })

export const PossibleLanguageValue2Schema = z.union([
  Value2Schema,
  LanguageValue2Schema.array(),
  LanguageValue2Schema
])

export const MetadataItem2Schema = z
  .union([
    z.any(),
    z.object({
      label: PossibleLanguageValue2Schema.optional(),
      value: PossibleLanguageValue2Schema.optional()
    })
  ])
  .transform((val) => {
    if (val && typeof val === 'object' && 'label' in val && 'value' in val) {
      return val
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
  metadata: Metadata2Schema.optional()
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
  metadata: Metadata2Schema.optional()
})

export type EmbeddedManifest2 = {
  '@id': string
  '@type': 'sc:Manifest'
  label?: z.infer<typeof PossibleLanguageValue2Schema>
}

export type Collection2 = {
  '@id': string
  '@type': 'sc:Collection'
  label?: z.infer<typeof PossibleLanguageValue2Schema>
  manifests?: EmbeddedManifest2[]
  collections?: (Collection2 | z.infer<typeof EmbeddedCollection2Schema>)[]
  members?: (
    | EmbeddedManifest2
    | Collection2
    | z.infer<typeof EmbeddedCollection2Schema>
  )[]
}

export const EmbeddedManifest2Schema: z.ZodType<EmbeddedManifest2> = z.lazy(
  () =>
    z.object({
      '@id': z.string().url(),
      '@type': z.literal('sc:Manifest'),
      label: PossibleLanguageValue2Schema.optional()
    })
)

export const Collection2Schema: z.ZodType<Collection2> = z.lazy(() =>
  z.object({
    '@id': z.string().url(),
    '@type': z.literal('sc:Collection'),
    label: PossibleLanguageValue2Schema.optional(),
    manifests: EmbeddedManifest2Schema.array().optional(),
    collections: Collection2Schema.array().optional(),
    members: z
      .union([
        EmbeddedManifest2Schema,
        Collection2Schema,
        EmbeddedCollection2Schema
      ])
      .array()
      .optional()
  })
)

export const EmbeddedCollection2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Collection'),
  label: PossibleLanguageValue2Schema.optional()
})
