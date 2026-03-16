import { ResponseError } from '../shared/errors.js'

type OnErrorParams = {
  error: unknown
  set: {
    status?: number | string
  }
  request?: Request
}

export function handleApiError({ error, set, request }: OnErrorParams) {
  if (request) {
    console.error(`Error on ${request.method} ${request.url}:`, error)
  } else {
    console.error(error)
  }

  const message =
    error instanceof Error ? error.message : 'Internal server error'
  let status = 500

  if (error instanceof ResponseError) {
    status = error.status
    set.status = status
    return { status, error: message }
  }

  if (
    typeof error === 'object' &&
    error &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    status = error.status
    set.status = status
    return { status, error: message }
  }

  set.status = status
  return { status, error: message }
}
