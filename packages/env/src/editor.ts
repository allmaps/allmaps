import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'

export const editorEnvSchema = appEnvSchema
export const editorPublicEnvSchema = appPublicEnvSchema

export type EditorEnv = z.infer<typeof editorEnvSchema>
export type EditorPublicEnv = z.infer<typeof editorPublicEnvSchema>

export function parseEditorEnv(value: unknown): EditorEnv {
  return editorEnvSchema.parse(value)
}

export function parseEditorPublicEnv(value: unknown): EditorPublicEnv {
  return editorPublicEnvSchema.parse(value)
}
