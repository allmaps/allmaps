import { z } from 'zod'

export function oneOrMany<T extends z.ZodTypeAny>(schema: T) {
  return z
    .union([z.array(schema), schema])
    .transform((value) => (Array.isArray(value) ? value : [value]))
}

export function parseIfValid<T extends z.ZodTypeAny>(schema: T) {
  return z.unknown().transform<z.infer<T> | undefined>((value) => {
    const result = schema.safeParse(value)

    if (result.success) {
      return result.data
    }
  })
}

// Copied from presentation.3.ts in @allmaps/iiif-parser
const SingleValueSchema = z.union([z.string(), z.number(), z.boolean()])
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

const ImageServices = [
  'ImageService1',
  'ImageService2',
  'ImageService3'
] as const

const ResourceTypes = [...ImageServices, ...['Canvas' as const]] as const

export const ImageServiceSchema = z.enum(ImageServices)
export const ResourceTypeSchema = z.enum(ResourceTypes)

export const PartOfItemSchema = z.object({
  id: z.string().url(),
  type: z.string(),
  label: LanguageValueSchema.optional(),
  get partOf() {
    return z.array(PartOfItemSchema).optional()
  }
})

export const PartOfSchema = oneOrMany(PartOfItemSchema)

export const HomepageItemSchema = z.object({
  id: z.string().url(),
  type: z.string().optional(),
  label: LanguageValueSchema.optional(),
  format: z.string().optional(),
  language: z.union([z.string(), z.array(z.string())]).optional()
})

const OptionalHomepageItemSchema = z.union([
  HomepageItemSchema,
  z.unknown().transform(() => undefined)
])

export const HomepageSchema = oneOrMany(OptionalHomepageItemSchema).transform(
  (values) =>
    values.filter(
      (value): value is z.infer<typeof HomepageItemSchema> =>
        value !== undefined
    )
)

export const ProviderItemSchema = z.object({
  id: z.string().url().optional(),
  label: LanguageValueSchema.optional(),
  homepage: HomepageSchema.transform((values) =>
    values.length > 0 ? values : undefined
  ).optional()
})

export const ProviderSchema = oneOrMany(ProviderItemSchema)

const ValidTransformationSchema = z.object({
  type: z.enum([
    'helmert',
    'polynomial',
    'thinPlateSpline',
    'projective',
    'straight',
    'linear'
  ]),
  options: z.looseObject({}).optional()
})

type Transformation = z.infer<typeof ValidTransformationSchema>

function parseInvalidTransformation(val: string): Transformation | undefined {
  // Also allow values like:
  // - thin-plate-spline
  // - thinplatespline
  // - polynomial1

  const valLowerCase = val.toLowerCase()

  if (
    valLowerCase === 'thinplatespline' ||
    valLowerCase === 'thin-plate-spline'
  ) {
    return {
      type: 'thinPlateSpline'
    }
  } else if (valLowerCase === 'polynomial1') {
    return {
      type: 'polynomial',
      options: { order: 1 }
    }
  } else if (valLowerCase === 'polynomial2') {
    return {
      type: 'polynomial',
      options: { order: 2 }
    }
  }
}

export const TransformationSchema = parseIfValid(ValidTransformationSchema).or(
  z.unknown().transform<Transformation | undefined>((val) => {
    if (typeof val === 'string') {
      return parseInvalidTransformation(val)
    }

    if (
      val &&
      typeof val === 'object' &&
      'type' in val &&
      typeof val.type === 'string'
    ) {
      return parseInvalidTransformation(val.type)
    }
  })
)

export const ProjectionSchema = z.object({
  id: z.string().url().optional(),
  name: z.string().optional(),
  definition: z.union([z.string(), z.unknown()])
})

export const ContextSchema = z.union([
  z.string().url().array(),
  z.string().url()
])
