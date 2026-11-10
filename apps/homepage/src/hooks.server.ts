import type { HandleFetch } from '@sveltejs/kit'

export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
  const requestUrl = new URL(request.url)
  if (
    requestUrl.origin !== event.url.origin &&
    (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:')
  ) {
    const headers = new Headers(request.headers)
    headers.set('User-Agent', 'Allmaps Homepage (+https://allmaps.org/)')
    request = new Request(request, { headers })
  }

  return fetch(request)
}
