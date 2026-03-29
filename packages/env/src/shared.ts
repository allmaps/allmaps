import { z } from 'zod'

export const envBoolean = z.union([
  z.boolean(),
  z.string().trim().pipe(z.stringbool())
])

function formatEnvIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const key = issue.path.join('.') || '(root)'
      return `${key}: ${issue.message}`
    })
    .join('; ')
}

export function parseEnvSchema<T extends z.ZodType>(
  schema: T,
  value: unknown,
  envName: string
): z.infer<T> {
  const result = schema.safeParse(value)

  if (!result.success) {
    throw new Error(`Invalid ${envName}: ${formatEnvIssues(result.error)}`)
  }

  return result.data
}
