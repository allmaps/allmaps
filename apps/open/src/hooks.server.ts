import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)
  const headers = new Headers(response.headers)
  headers.set('Referrer-Policy', 'no-referrer')

  if (
    event.url.searchParams.has('url') ||
    event.url.searchParams.has('iiif-content')
  ) {
    headers.set('Cache-Control', 'private, no-store')
  }

  return new Response(response.body, { status: response.status, headers })
}
