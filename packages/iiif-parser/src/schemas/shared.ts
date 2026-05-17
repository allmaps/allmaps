import { z } from 'zod'

export const SizeSchema = z.object({
  width: z.number().int(),
  height: z.number().int()
})

export const TilesetSchema = z.object({
  width: z.number().int(),
  height: z.number().int().optional(),
  scaleFactors: z.array(z.number().int())
})

const imageServiceTypes = [
  'ImageService1',
  'ImageService2',
  'ImageService3'
] as const

export const ImageServiceTypesSchema = z.enum(imageServiceTypes)

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

export function filterValidItems<T extends z.ZodTypeAny>(schema: T) {
  return z.array(z.unknown()).transform<z.infer<T>[]>((values) =>
    values.flatMap((value) => {
      const result = schema.safeParse(value)

      return result.success ? [result.data] : []
    })
  )
}

// https://iiif.io/api/presentation/3.0/#navdate
const ValidNavDateSchema = z.coerce.date()

// Invalid navDate values are intentionally treated as absent.
export const NavDateSchema = parseIfValid(ValidNavDateSchema)

// For now, Allmaps does not parse GeoJSON values
// This is left to clients consuming this data
export const NavPlaceSchema = z.looseObject({})
