export function error(status: number, message: string): Response {
  const response = new Response(JSON.stringify({ message }), {
    status,
    statusText: message,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  return response
}

export function redirect(url: string): Response {
  const response = new Response(null, { status: 302 })
  response.headers.set('Location', url)
  return response
}
