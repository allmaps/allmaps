export type Destination = 'viewer' | 'editor'

export type Handoff = {
  destination: Destination
  source: string
}

export function parseResourceUrl(value: string | null) {
  if (!value || !/^https?:\/\//i.test(value)) return

  try {
    const url = new URL(value)
    if (!url.username && !url.password) return url
  } catch {
    return
  }
}

export function handoffUrl(
  {
    viewerBaseUrl,
    editorBaseUrl
  }: {
    viewerBaseUrl: string
    editorBaseUrl: string
  },
  { destination, source }: Handoff
) {
  const target = new URL(
    '/',
    destination === 'viewer' ? viewerBaseUrl : editorBaseUrl
  )
  target.searchParams.set('url', source)
  return target.href
}
