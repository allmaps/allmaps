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
  const status = 500
  const statusText = 'Internal Server Error'

  let error = String(err)

  if (err instanceof Error) {
    error = err.message
  }

  return createJsonResponse(
    {
      error,
      status
    },
    status,
    statusText
  )
}
