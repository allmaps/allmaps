/** Model Cache API expiration and Age independently of the request wrapper. */
export function createResponseCache(now: () => number) {
  const entries = new Map<
    string,
    { body: string; headers: Headers; storedAt: number; ttl: number }
  >()
  return {
    entries,
    async match(request: Request) {
      const stored = entries.get(request.url)
      if (!stored) return
      const age = Math.floor((now() - stored.storedAt) / 1000)
      if (age >= stored.ttl) return
      const headers = new Headers(stored.headers)
      headers.set('Age', String(age))
      return new Response(stored.body, { headers })
    },
    async put(request: Request, response: Response) {
      const ttl = Number(
        response.headers.get('Cache-Control')?.match(/s-maxage=(\d+)/)?.[1]
      )
      entries.set(request.url, {
        body: await response.text(),
        headers: new Headers(response.headers),
        storedAt: now(),
        ttl
      })
    }
  }
}
