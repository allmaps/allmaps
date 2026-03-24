import { z } from 'zod'

const booleanValues = {
  true: true,
  false: false
} as const

// TODO: use Zod 4 z.stringbool()
export const envBoolean = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized in booleanValues) {
      return booleanValues[normalized as keyof typeof booleanValues]
    }
  }

  return value
}, z.boolean())

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
