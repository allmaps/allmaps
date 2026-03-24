import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const editorEnvSchema = appEnvSchema
export const editorPublicEnvSchema = appPublicEnvSchema

export type EditorEnv = z.infer<typeof editorEnvSchema>
export type EditorPublicEnv = z.infer<typeof editorPublicEnvSchema>

export function parseEditorEnv(value: unknown): EditorEnv {
  return parseEnvSchema(editorEnvSchema, value, 'editor env vars')
}

export function parseEditorPublicEnv(value: unknown): EditorPublicEnv {
  return parseEnvSchema(
    editorPublicEnvSchema,
    value,
    'editor public env vars'
  )
}
