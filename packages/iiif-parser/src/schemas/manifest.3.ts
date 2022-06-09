// Presentation API 3.0 - Manifest
// https://iiif.io/api/presentation/3.0/#52-manifest

import { z } from 'zod'

import { ImageServiceSchema } from './image-service.js'

// const StringValue3Schema = z.map(z.string(), z.string().array())
const StringValue3Schema = z.record(z.string().array())

// Example:
// {
//   "label": {
//     "en": [
//       "Whistler's Mother",
//       "Arrangement in Grey and Black No. 1: The Artist's Mother"
//     ],
//     "fr": [
//       "Arrangement en gris et noir no 1",
//       "Portrait de la mère de l'artiste",
//       "La Mère de Whistler"
//     ],
//     "none": [ "Whistler (1871)" ]
//   }
// }

const MetadataEntry3Schema = z.object({
  label: StringValue3Schema,
  value: StringValue3Schema
})

// Example:
// {
//   "metadata": [
//     {
//       "label": { "en": [ "Creator" ] },
//       "value": { "en": [ "Anne Artist (1776-1824)" ] }
//     }
//   ]
// }

const AnnotationBody3Schema = z.object({
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
  metadata: MetadataEntry3Schema.array().optional()
})

export const Manifest3Schema = z.object({
  // Of array met deze als eerste
  // '@context': z.literal('http://iiif.io/api/presentation/2/context.json'),
  id: z.string().url(),
  type: z.literal('Manifest'),
  items: Canvas3Schema.array().nonempty(),
  label: StringValue3Schema,
  metadata: MetadataEntry3Schema.array().optional()
})
