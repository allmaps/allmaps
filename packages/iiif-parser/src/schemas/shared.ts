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
