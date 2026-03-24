import { z } from 'zod'

import { workerEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const tileServerEnvSchema = workerEnvSchema

export type TileServerEnv = z.infer<typeof tileServerEnvSchema>

export function parseTileServerEnv(value: unknown): TileServerEnv {
  return parseEnvSchema(tileServerEnvSchema, value, 'tileserver env vars')
}
