import { z } from 'zod'

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

export const PartOfSchema = z.object({
  id: z.string().url(),
  type: z.string(),
  label: z.string().optional()
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
