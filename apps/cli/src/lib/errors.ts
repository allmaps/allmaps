import type { ZodError } from 'zod'

type Key = string | number

interface Issue {
  path: Key[]
  errors: string[]
}

function parseFormatted(data: any, formatted: any, path: Key[] = []): Issue[] {
  let errors = []

  if (formatted._errors.length) {
    errors.push({
      path,
      errors: formatted._errors
    })
  }

  const deeper = Object.keys(formatted)
    .filter((key) => key !== '_errors')
    .map((key) => {
      let dataKey
      if (Array.isArray(data)) {
        dataKey = parseInt(key)
      } else {
        dataKey = key
      }

      return parseFormatted(data[dataKey], formatted[key], [...path, dataKey])
    })

  if (deeper.length) {
    errors = [...errors, ...deeper.flat()]
  }

  return errors
}

export function getIssues(data: any, zodError: ZodError): Issue[] {
  const formatted = zodError.format()
  return parseFormatted(data, formatted)
}

export function formatIssue(issue: Issue): string {
  const path = issue.path.join('.')
  const separator = ' → '

  const firstLine = `${path}${separator}${issue.errors[0]}`
  const otherLines = issue.errors
    .slice(1)
    .map((error) => ' '.repeat(path.length + separator.length) + error)

  return [firstLine, ...otherLines].join('\n')
}
