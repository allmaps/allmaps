import { z } from 'zod'

import { workerEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export type WorkerEnv = z.infer<typeof workerEnvSchema>

export function parseWorkerEnv(value: unknown): WorkerEnv {
  return parseEnvSchema(workerEnvSchema, value, 'worker env vars')
}
