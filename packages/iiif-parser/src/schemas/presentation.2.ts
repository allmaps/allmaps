// Presentation API 2.1 - Manifest
// https://iiif.io/api/presentation/2.1/#manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'

export const SingleStringValue2Schema = z.string().or(z.string().array())

export const LanguageString2Schema = z.object({
  '@language': z.string().optional(),
  '@value': SingleStringValue2Schema
})

export const StringValue2Schema = SingleStringValue2Schema.or(
  LanguageString2Schema
).or(LanguageString2Schema.array())

export const MetadataItem2Schema = z.object({
  label: StringValue2Schema.optional(),
  value: StringValue2Schema.optional()
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
  label: StringValue2Schema.optional(),
  metadata: Metadata2Schema.optional()
})

const Sequence2Schema = z.object({
  canvases: Canvas2Schema.array().nonempty()
})

export const Manifest2Schema = z.object({
  '@id': z.string().url(),
  '@type': z.literal('sc:Manifest'),
  sequences: Sequence2Schema.array().length(1),
  label: StringValue2Schema.optional(),
  description: StringValue2Schema.optional(),
  metadata: Metadata2Schema.optional()
})

export interface EmbeddedManifest2 {
  '@id': string
  '@type': 'sc:Manifest'
  label?: z.infer<typeof StringValue2Schema>
}

export interface Collection2 {
  '@id': string
  '@type': 'sc:Collection'
  label?: z.infer<typeof StringValue2Schema>
  manifests?: EmbeddedManifest2[]
  collections?: Collection2[]
  members?: (EmbeddedManifest2 | Collection2)[]
}

export const EmbeddedManifest2Schema: z.ZodType<EmbeddedManifest2> = z.lazy(
  () =>
    z.object({
      '@id': z.string().url(),
      '@type': z.literal('sc:Manifest'),
      label: StringValue2Schema.optional()
    })
)

export const Collection2Schema: z.ZodType<Collection2> = z.lazy(() =>
  z.object({
    '@id': z.string().url(),
    '@type': z.literal('sc:Collection'),
    label: StringValue2Schema.optional(),
    manifests: EmbeddedManifest2Schema.array().optional(),
    collections: Collection2Schema.array().optional(),
    members: EmbeddedManifest2Schema.or(Collection2Schema).array().optional()
  })
)
