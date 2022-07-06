// Presentation API 2.1 - Manifest
// https://iiif.io/api/presentation/2.1/#manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'

export const SingleStringValue2Schema = z.string().or(z.string().array())

export const LanguageString2Schema = z.object({
  '@language': z.string(),
  '@value': SingleStringValue2Schema
})

export const StringValue2Schema = SingleStringValue2Schema.or(
  LanguageString2Schema
).or(LanguageString2Schema.array())

export const MetadataItem2Schema = z.object({
  label: StringValue2Schema,
  value: StringValue2Schema
})

export const Metadata2Schema = MetadataItem2Schema.array()

export const ImageResource2Schema = z.object({
  width: z.number().int(),
  height: z.number().int(),
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
