// Presentation API 3.0 - Manifest
// https://iiif.io/api/presentation/3.0/#52-manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'

export const StringValue3Schema = z.record(z.string(), z.string().array())

export const MetadataItem3Schema = z.object({
  label: StringValue3Schema,
  value: StringValue3Schema
})

export const Metadata3Schema = MetadataItem3Schema.array()

export const AnnotationBody3Schema = z.object({
  type: z.literal('Image'),
  width: z.number().int(),
  height: z.number().int(),
  service: ImageServiceSchema.array().length(1)
})

const Annotation3Schema = z.object({
  type: z.literal('Annotation'),
  body: AnnotationBody3Schema
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
  items: AnnotationPage3Schema.array().length(1),
  label: StringValue3Schema.optional(),
  metadata: Metadata3Schema.optional()
})

export const Manifest3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Manifest'),
  items: Canvas3Schema.array().nonempty(),
  label: StringValue3Schema.optional(),
  description: StringValue3Schema.optional(),
  metadata: Metadata3Schema.optional()
})
