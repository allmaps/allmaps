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

// https://iiif.io/api/presentation/3.0/#navdate
const ValidNavDateSchema = z.coerce.date()

export const NavDateSchema = z
  .union([
    ValidNavDateSchema,

    // Catchall for incorrect values
    z.any()
  ])
  .transform((val) => {
    const { success, data } = ValidNavDateSchema.safeParse(val)
    if (success) {
      return data
    }
  })

// For now, Allmaps does not parse GeoJSON values
// This is left to clients consuming this data
export const NavPlaceSchema = z.object({}).passthrough()
