import { z } from 'zod'

import { PointSchema, ImageServiceSchema } from './shared.js'

const svg =
  /^<svg\s+width="\d+"\s+height="\d+"\s*>\s*<polygon\s+points="(\d+,\d+\s+){2,}\d+,\d+"\s*\/>\s*<\/svg>$/

export const SvgSelectorSchema = z.object({
  type: z.literal('SvgSelector'),
  value: z.string().regex(svg)
})

export const TargetSchema = z.object({
  source: z.string().url(),
  service: z
    .array(
      z.object({
        '@id': z.string().url(),
        type: ImageServiceSchema
      })
    )
    .length(1),
  selector: SvgSelectorSchema
})

export const BodySchema = z.object({
  type: z.literal('FeatureCollection'),
  purpose: z.string().default('gcp-georeferencing').optional(),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: z.object({
        pixelCoords: PointSchema
      }),
      geometry: z.object({
        type: z.literal('Point'),
        coordinates: PointSchema
      })
    })
  )
})

export const AnnotationSchema = z.object({
  id: z.string().optional(),
  type: z.literal('Annotation'),
  '@context': z.string().url().array().optional(),
  motivation: z.string().default('georeferencing').optional(),
  target: TargetSchema,
  body: BodySchema
})

export const AnnotationPageSchema = z.object({
  id: z.string().optional(),
  type: z.literal('AnnotationPage'),
  '@context': z.string().url().array().optional(),
  items: z.array(AnnotationSchema)
})
