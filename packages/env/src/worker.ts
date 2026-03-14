import { z } from 'zod'

import { workerEnvSchema } from './fragments.js'

export type WorkerEnv = z.infer<typeof workerEnvSchema>

export function parseWorkerEnv(value: unknown): WorkerEnv {
  return workerEnvSchema.parse(value)
}
