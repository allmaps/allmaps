import { handleFixtureRequest } from './server.ts'

// Exercise the same handlers as the IIIF test server without opening a socket.
export function getIiifFixtureResponse(uri: string) {
  const url = new URL(uri)
  const [, corsMode, ...pathSegments] = url.pathname.split('/')
  return handleFixtureRequest(
    new Request(uri),
    corsMode,
    pathSegments.join('/')
  )
}

export async function getIiifFixtureJson(uri: string) {
  const response = await getIiifFixtureResponse(uri)
  if (!response.ok) {
    throw new Error(
      `Failed to load IIIF fixture ${uri}: ${await response.text()}`
    )
  }
  return (await response.json()) as Record<string, unknown>
}
