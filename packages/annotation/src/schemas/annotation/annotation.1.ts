import { z } from 'zod'

import {
  PointSchema,
  ImageServiceSchema,
  PartOfSchema,
  PointGeometrySchema,
  TransformationSchema
} from '../shared.js'

const polygonRegex =
  /<polygon\s+points="\s*(-?\d+(\.\d+)?,-?\d+(\.\d+)?\s+){2,}-?\d+(\.\d+)?,-?\d+(\.\d+)?\s*"\s*\/>/

const svgWidthHeightRegex = new RegExp(
  `^<svg\\s+width="\\d+"\\s+height="\\d+"\\s*>\\s*${polygonRegex.source}\\s*</svg>$`
)
const svgHeightWidthRegex = new RegExp(
  `^<svg\\s+height="\\d+"\\s+width="\\d+"\\s*>\\s*${polygonRegex.source}\\s*</svg>$`
)
const svgRegex = new RegExp(`^<svg\\s*>\\s*${polygonRegex.source}\\s*</svg>$`)

const SvgRegexSchema = z.string().regex(svgRegex)
const SvgWidthHeightRegexSchema = z.string().regex(svgWidthHeightRegex)
const SvgHeightWidthRegexSchema = z.string().regex(svgHeightWidthRegex)

export const SvgSelectorSchema = z.object({
  type: z.literal('SvgSelector'),
  value: SvgRegexSchema.or(SvgWidthHeightRegexSchema).or(
    SvgHeightWidthRegexSchema
  )
})

// const regionRegex = /^\d+,\d+,\d+,\d+$/
// const sizeRegex = /^\d+,\d+$/

// export const ImageApiSelectorSchema = z.object({
//   type: z.literal('ImageApiSelector'),
//   region: z.string().regex(regionRegex),
//   size: z.string().regex(sizeRegex)
// })

export const SourceSchema = z.object({
  id: z.string().url(),
  type: ImageServiceSchema,
  height: z.number().positive(),
  width: z.number().positive(),
  partOf: PartOfSchema.array().optional()
})

export const TargetSchema = z.object({
  id: z.string().url().optional(),
  type: z.literal('SpecificResource'),
  source: SourceSchema,
  // selector: SvgSelectorSchema.or(ImageApiSelectorSchema)
  selector: SvgSelectorSchema
})

export const FeaturePropertiesSchema = z.object({
  resourceCoords: PointSchema
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
