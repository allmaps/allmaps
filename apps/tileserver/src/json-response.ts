export function createJsonResponse(data: any, status = 200, statusText = 'OK') {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export function createErrorResponse(
  message: string,
  status = 500,
  statusText = 'Internal Server Error'
) {
  return createJsonResponse(
    {
      error: message
    },
    status,
    statusText
  )
}
