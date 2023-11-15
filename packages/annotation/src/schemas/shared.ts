import { z } from 'zod'

// Copied from presentation.3.ts in @allmaps/iiif-parser
const SingleValueSchema = z.string().or(z.number()).or(z.boolean())
export const LanguageValueSchema = z.record(
  z.string(),
  SingleValueSchema.array()
)

export const PointSchema = z.tuple([z.number(), z.number()])

export const PointGeometrySchema = z.object({
  type: z.literal('Point'),
  coordinates: PointSchema
})

export const ResourceMaskSchema = PointSchema.array().min(3)

export const ImageServiceSchema = z.enum([
  'ImageService1',
  'ImageService2',
  'ImageService3'
])

// partOf can recursively contain nested partOfs
// From: https://github.com/colinhacks/zod#recursive-types
const basePartOfSchema = z.object({
  id: z.string().url(),
  type: z.string(),
  label: LanguageValueSchema.optional()
})

type PartOf = z.infer<typeof basePartOfSchema> & {
  partOf?: PartOf[]
}

export const PartOfSchema: z.ZodType<PartOf> = basePartOfSchema.extend({
  partOf: z.lazy(() => PartOfSchema.array()).optional()
})

const PolynomialTransformationSchema = z.object({
  type: z.literal('polynomial'),
  options: z
    .object({
      order: z.number().min(1).max(3)
    })
    .optional()
})

const ThinPlateSplineTransformationSchema = z.object({
  type: z.literal('thinPlateSpline')
})

// TODO: add more transformation types, and also allow invalid types
export const TransformationSchema = PolynomialTransformationSchema.or(
  ThinPlateSplineTransformationSchema
)
