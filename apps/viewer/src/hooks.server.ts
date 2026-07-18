import type { HandleFetch } from '@sveltejs/kit'

const allmapsViewerUserAgent = 'AllmapsViewer (+https://viewer.allmaps.org/)'

function isExternalHttpRequest(request: Request, appUrl: URL) {
  const requestUrl = new URL(request.url)

  return (
    requestUrl.origin !== appUrl.origin &&
    (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:')
  )
}

export const handleFetch: HandleFetch = ({ event, request, fetch }) => {
  if (isExternalHttpRequest(request, event.url)) {
    const headers = new Headers(request.headers)
    headers.set('User-Agent', allmapsViewerUserAgent)
    request = new Request(request, { headers })
  }

  return fetch(request)
}
