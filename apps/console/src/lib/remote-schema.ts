type StandardIssue = {
  message: string
  path?: (string | number | symbol)[]
}

type StandardResult<Output> =
  | {
      value: Output
      issues?: undefined
    }
  | {
      issues: StandardIssue[]
      value?: undefined
    }

export type RemoteSchema<Input, Output = Input> = {
  '~standard': {
    version: 1
    vendor: 'allmaps'
    types?: {
      input: Input
      output: Output
    }
    validate(value: unknown): StandardResult<Output>
  }
}

function issue(message: string, path?: (string | number | symbol)[]) {
  return { issues: [{ message, path }] }
}

export function schema<Input>(
  validate: (value: unknown) => Input
): RemoteSchema<Input> {
  return {
    '~standard': {
      version: 1,
      vendor: 'allmaps',
      validate(value) {
        try {
          return { value: validate(value) }
        } catch (error) {
          return issue(
            error instanceof Error ? error.message : 'Invalid request'
          )
        }
      }
    }
  }
}

export function stringSchema(name: string) {
  return schema<string>((value) => {
    assertString(value, name)
    return value
  })
}

export function optionalNumberSchema(name: string) {
  return schema<number | undefined>((value) => {
    if (value === undefined) {
      return undefined
    }

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Invalid ${name}`)
    }

    return value
  })
}

export function assertString(
  value: unknown,
  name: string
): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${name}`)
  }
}

export function assertNonEmptyString(
  value: unknown,
  name: string
): asserts value is string {
  assertString(value, name)

  if (!value.trim()) {
    throw new Error(`Invalid ${name}`)
  }
}

export function assertObject(
  value: unknown,
  name: string
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid ${name}`)
  }
}
