import { FetchError } from './fetch.js'

export function createJsonResponse(
  data: unknown,
  status = 200,
  statusText = 'OK'
) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function createErrorResponse(err: unknown) {
  let status = 500
  const statusText = 'Internal Server Error'

  let error = String(err)
  let body: unknown = {}

  if (err instanceof Error) {
    error = err.message
  }

  if (err instanceof FetchError) {
    status = err.status
    body = err.body
  }

  return createJsonResponse(
    {
      error,
      status,
      body
    },
    status,
    statusText
  )
}
