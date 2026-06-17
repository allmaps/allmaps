type ZodIssueLike = {
  code?: string
  errors?: unknown
  expected?: unknown
  inclusive?: boolean
  message?: string
  minimum?: unknown
  origin?: string
  path?: unknown[]
  unionErrors?: unknown
}

export type FormattedValidationIssue = {
  code?: string
  message: string
  path: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function isZodIssueLike(value: unknown): value is ZodIssueLike {
  return isObject(value)
}

function formatPathSegment(segment: unknown, isFirstSegment: boolean) {
  if (typeof segment === 'number') {
    return `[${segment}]`
  }

  const stringSegment = String(segment)

  if (/^[A-Za-z_$][\w$]*$/.test(stringSegment)) {
    return isFirstSegment ? stringSegment : `.${stringSegment}`
  }

  return `[${JSON.stringify(stringSegment)}]`
}

function formatPath(path: unknown[]) {
  if (path.length === 0) {
    return 'root'
  }

  return path
    .map((segment, index) => formatPathSegment(segment, index === 0))
    .join('')
}

function formatMessage(issue: ZodIssueLike) {
  if (
    issue.code === 'too_small' &&
    issue.origin === 'number' &&
    typeof issue.minimum === 'number'
  ) {
    return issue.inclusive
      ? `Expected number greater than or equal to ${issue.minimum}`
      : `Expected number greater than ${issue.minimum}`
  }

  if (typeof issue.message === 'string' && issue.message.length > 0) {
    return issue.message
      .replace(/^Invalid input: expected /, 'Expected ')
      .replace(/^Too small: expected /, 'Expected ')
  }

  return 'Invalid input'
}

function getIssuePath(issue: ZodIssueLike) {
  return Array.isArray(issue.path) ? issue.path : []
}

function getUnionBranches(issue: ZodIssueLike) {
  if (Array.isArray(issue.errors)) {
    return issue.errors.filter(Array.isArray)
  }

  if (Array.isArray(issue.unionErrors)) {
    return issue.unionErrors.flatMap((unionError) => {
      if (isObject(unionError) && Array.isArray(unionError.issues)) {
        return [unionError.issues]
      }

      return []
    })
  }

  return []
}

function dedupeIssues(issues: FormattedValidationIssue[]) {
  const seen = new Set<string>()

  return issues.filter((issue) => {
    const key = `${issue.path}\n${issue.message}\n${issue.code ?? ''}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function formatIssue(
  issue: ZodIssueLike,
  parentPath: unknown[]
): FormattedValidationIssue[] {
  const issuePath = [...parentPath, ...getIssuePath(issue)]

  if (issue.code === 'invalid_union') {
    const branches = getUnionBranches(issue)
    const formattedBranches = branches
      .map((branch) => formatIssues(branch, issuePath))
      .filter((branch) => branch.length > 0)

    if (formattedBranches.length > 0) {
      const fewestIssues = Math.min(
        ...formattedBranches.map((branch) => branch.length)
      )

      return dedupeIssues(
        formattedBranches
          .filter((branch) => branch.length === fewestIssues)
          .flat()
      )
    }
  }

  return [
    {
      code: issue.code,
      message: formatMessage(issue),
      path: formatPath(issuePath)
    }
  ]
}

export function formatIssues(
  issues: unknown,
  parentPath: unknown[] = []
): FormattedValidationIssue[] {
  if (!Array.isArray(issues)) {
    return []
  }

  return dedupeIssues(
    issues.flatMap((issue) =>
      isZodIssueLike(issue) ? formatIssue(issue, parentPath) : []
    )
  )
}

export function formatValidationIssuesFromMessage(message: string) {
  try {
    return formatIssues(JSON.parse(message))
  } catch {
    return []
  }
}
