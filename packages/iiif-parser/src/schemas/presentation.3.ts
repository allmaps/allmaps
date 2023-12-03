// Presentation API 3.0 - Manifest
// https://iiif.io/api/presentation/3.0/#52-manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'

export const SingleValue3Schema = z.string().or(z.number()).or(z.boolean())
export const LanguageValue3Schema = z.record(
  z.string(),
  SingleValue3Schema.array()
)

export const MetadataItem3Schema = z.object({
  label: LanguageValue3Schema.optional(),
  value: LanguageValue3Schema.optional()
})

export const Metadata3Schema = MetadataItem3Schema.array()

export const AnnotationBody3Schema = z.object({
  type: z.literal('Image'),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  service: ImageServiceSchema.array()
})

const Annotation3Schema = z.object({
  type: z.literal('Annotation'),
  body: AnnotationBody3Schema.or(AnnotationBody3Schema.array().length(1))
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
  label: LanguageValue3Schema.optional(),
  metadata: Metadata3Schema.optional()
})

export const Manifest3Schema = z.object({
  id: z.string().url(),
  type: z.literal('Manifest'),
  items: Canvas3Schema.array().nonempty(),
  label: LanguageValue3Schema.optional(),
  description: LanguageValue3Schema.optional(),
  metadata: Metadata3Schema.optional()
})

export type EmbeddedManifest3 = {
  id: string
  type: 'Manifest'
  label?: z.infer<typeof LanguageValue3Schema>
}

export type Collection3 = {
  id: string
  type: 'Collection'
  label?: z.infer<typeof LanguageValue3Schema>
  items: (EmbeddedManifest3 | Collection3)[]
}

export const EmbeddedManifest3Schema: z.ZodType<EmbeddedManifest3> = z.lazy(
  () =>
    z.object({
      id: z.string().url(),
      type: z.literal('Manifest'),
      label: LanguageValue3Schema.optional()
    })
)

// TODO: introduce embedded collection without items
export const Collection3Schema: z.ZodType<Collection3> = z.lazy(() =>
  z.object({
    id: z.string().url(),
    type: z.literal('Collection'),
    label: LanguageValue3Schema.optional(),
    items: EmbeddedManifest3Schema.or(Collection3Schema).array()
  })
)
