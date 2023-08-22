import { z } from 'zod'

import {
  PointSchema,
  ImageServiceSchema,
  PointGeometrySchema,
  TransformationSchema
} from '../shared.js'

const svg =
  /^<svg\s+width="\d+"\s+height="\d+"\s*>\s*<polygon\s+points="\s*(-?\d+(\.\d+)?,-?\d+(\.\d+)?\s+){2,}-?\d+(\.\d+)?,-?\d+(\.\d+)?\s*"\s*\/>\s*<\/svg>$/

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

export const FeaturePropertiesSchema = z.object({
  pixelCoords: PointSchema
})

export const BodySchema = z.object({
  type: z.literal('FeatureCollection'),
  transformation: TransformationSchema.optional(),
  features: z.array(
    z.object({
      type: z.literal('Feature'),
      properties: FeaturePropertiesSchema,
      geometry: PointGeometrySchema
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
