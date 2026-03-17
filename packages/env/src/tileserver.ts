import { z } from 'zod'

import { workerEnvSchema } from './fragments.js'

export const tileServerEnvSchema = workerEnvSchema

export type TileServerEnv = z.infer<typeof tileServerEnvSchema>

export function parseTileServerEnv(value: unknown): TileServerEnv {
  return tileServerEnvSchema.parse(value)
}
