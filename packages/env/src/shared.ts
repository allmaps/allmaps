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
