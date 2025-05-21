import { z } from 'zod'

export function ensureArray<T>(val: T | T[]): T[] | undefined {
  if (val) {
    return Array.isArray(val) ? val : [val]
  }
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

// partOf can recursively contain nested partOfs
// From: https://github.com/colinhacks/zod#recursive-types
const basePartOfItemSchema = z.object({
  id: z.string().url(),
  type: z.string(),
  label: LanguageValueSchema.optional()
})

type PartOfItem = z.infer<typeof basePartOfItemSchema> & {
  partOf?: PartOfItem[]
}

export const PartOfItemSchema: z.ZodType<PartOfItem> =
  basePartOfItemSchema.extend({
    partOf: z.lazy(() => PartOfItemSchema.array()).optional()
  })

export const PartOfSchema = z
  .union([PartOfItemSchema.array(), PartOfItemSchema])
  .transform(ensureArray)

const ValidTransformationSchema = z.object({
  type: z.enum(['helmert', 'polynomial', 'thinPlateSpline', 'projective']),
  options: z.object({}).passthrough().optional()
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

export const TransformationSchema = z
  .union([
    ValidTransformationSchema,

    // Catchall for unknown transformation types
    z.unknown()
  ])
  .transform((val) => {
    const { success, data } = ValidTransformationSchema.safeParse(val)
    if (success) {
      return data
    } else if (val === 'string') {
      return parseInvalidTransformation(val)
    } else if (
      val &&
      typeof val === 'object' &&
      'type' in val &&
      typeof val.type === 'string'
    ) {
      return parseInvalidTransformation(val.type)
    }
  })

export const ProjectionSchema = z.object({
  name: z.string().optional(),
  definition: z.union([z.string(), z.unknown()])
})

export const ContextSchema = z.union([
  z.string().url().array(),
  z.string().url()
])
