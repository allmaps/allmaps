import { z } from 'zod'

function stringifyValue(value: unknown) {
  return typeof value === 'string' ? `"${value}"` : String(value)
}

function getReceivedType(value: unknown) {
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'array'
  }

  return typeof value
}

function formatPath(path: readonly PropertyKey[]) {
  if (path.length === 0) {
    return ''
  }

  return path.reduce((result: string, segment, index) => {
    if (typeof segment === 'number') {
      return `${result}[${segment}]`
    }

    if (index === 0) {
      return String(segment)
    }

    return `${result}.${String(segment)}`
  }, '')
}

function joinPath(message: string, path: readonly PropertyKey[]) {
  const formattedPath = formatPath(path)
  return formattedPath ? `${message} at "${formattedPath}"` : message
}

function getValueAtPath(input: unknown, path: readonly PropertyKey[]) {
  let current = input

  for (const segment of path) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof segment === 'number') {
      if (!Array.isArray(current)) {
        return undefined
      }

      current = current[segment]
      continue
    }

    if (typeof current !== 'object' || !(segment in current)) {
      return undefined
    }

    current = (current as Record<PropertyKey, unknown>)[segment]
  }

  return current
}

function formatIssue(issue: z.ZodIssue, input: unknown): string {
  const value = getValueAtPath(input, issue.path)

  switch (issue.code) {
    case 'invalid_type': {
      if (value === undefined) {
        const lastPathSegment = issue.path.at(-1)

        if (typeof lastPathSegment === 'number') {
          return joinPath(
            `Array must contain at least ${lastPathSegment + 1} element(s)`,
            issue.path.slice(0, -1)
          )
        }

        return joinPath('Required', issue.path)
      }

      const expected = issue.expected === 'tuple' ? 'array' : issue.expected

      return joinPath(
        `Expected ${expected}, received ${getReceivedType(value)}`,
        issue.path
      )
    }

    case 'invalid_value': {
      if (issue.values.length > 1 && value === undefined) {
        return joinPath('Required', issue.path)
      }

      if (issue.values.length === 1) {
        return joinPath(
          `Invalid literal value, expected ${stringifyValue(issue.values[0])}`,
          issue.path
        )
      }

      const expectedValues = issue.values
        .map((value) => `'${String(value)}'`)
        .join(' | ')

      return joinPath(
        `Invalid enum value. Expected ${expectedValues}, received '${String(value)}'`,
        issue.path
      )
    }

    case 'too_small': {
      if (issue.origin === 'array') {
        if (issue.exact) {
          return joinPath(
            `Array must contain exactly ${issue.minimum} element(s)`,
            issue.path
          )
        }

        return joinPath(
          `Array must contain at least ${issue.minimum} element(s)`,
          issue.path
        )
      }

      if (issue.origin === 'number' || issue.origin === 'int') {
        return joinPath(
          `Number must be greater than or equal to ${issue.minimum}`,
          issue.path
        )
      }

      break
    }

    case 'too_big': {
      if (issue.origin === 'array' && issue.exact) {
        return joinPath(
          `Array must contain exactly ${issue.maximum} element(s)`,
          issue.path
        )
      }

      break
    }

    case 'invalid_union': {
      const hasOnlyMissingObjectBranches = issue.errors.every((branchIssues) =>
        branchIssues.every(
          (branchIssue) =>
            branchIssue.code === 'invalid_type' &&
            branchIssue.expected === 'object' &&
            branchIssue.message.endsWith('received undefined')
        )
      )

      if (hasOnlyMissingObjectBranches) {
        return joinPath('Required', issue.path)
      }

      break
    }

    case 'invalid_format': {
      if (issue.format === 'url') {
        return joinPath('Invalid url', issue.path)
      }

      return joinPath('Invalid', issue.path)
    }
  }

  return joinPath(issue.message, issue.path)
}

export function formatZodError(error: z.ZodError, input: unknown) {
  const indexedIssues = error.issues.map((issue, index) => ({ issue, index }))
  const isArraySizeIssue = (issue: z.ZodIssue) =>
    (issue.code === 'too_small' || issue.code === 'too_big') &&
    issue.origin === 'array'
  const isPrefixPath = (
    possiblePrefix: readonly PropertyKey[],
    path: readonly PropertyKey[]
  ) =>
    possiblePrefix.length < path.length &&
    possiblePrefix.every((segment, index) => segment === path[index])

  const sortedIssues = [...indexedIssues]
    .sort((left, right) => {
      if (
        isArraySizeIssue(left.issue) &&
        isPrefixPath(left.issue.path, right.issue.path)
      ) {
        return -1
      }

      if (
        isArraySizeIssue(right.issue) &&
        isPrefixPath(right.issue.path, left.issue.path)
      ) {
        return 1
      }

      return left.index - right.index
    })
    .map(({ issue }) => issue)

  return `Validation error: ${sortedIssues
    .map((issue) => formatIssue(issue, input))
    .join('; ')}`
}
