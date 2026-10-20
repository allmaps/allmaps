import type { Server } from 'node:http'
import { createServer } from 'node:net'
import { Elysia } from 'elysia'
import type { AnyElysia } from 'elysia'
import { nodeAdapter } from './node-adapter.ts'
import { createLiveServer } from '@allmaps/api-live'
import { getIiifFixtureResponse } from '@allmaps/tools-iiif-server'
import type { RunningContext } from './context.ts'

type NodeServer = {
  ready: () => Promise<unknown>
  close: () => Promise<void>
  node: { server: Server }
}

// @elysia/node exposes its underlying srvx server as `raw`. Await readiness:
// the Elysia listen callback itself runs before the socket has bound.
export async function listenElysia(
  app: AnyElysia,
  port: number,
  hostname = 'localhost'
) {
  let server: NodeServer | undefined
  const options = { port, hostname, reusePort: false, gracefulShutdown: false }
  app.listen(options, (info) => {
    server = (info as unknown as { raw: NodeServer }).raw
  })
  if (!server)
    throw new Error('The Elysia Node adapter did not create a server')
  try {
    await server.ready()
  } catch (error) {
    await server.close()
    throw error
  }
  return server
}

export async function assertAvailable(port: number, hostname = 'localhost') {
  const socket = createServer()
  await new Promise<void>((resolve, reject) => {
    socket.once('error', () =>
      reject(
        new Error(
          `Port ${port} is in use. Stop the API already using it before starting this runner.`
        )
      )
    )
    socket.listen({ port, host: hostname, exclusive: true }, () =>
      socket.close(() => resolve())
    )
  })
}

export async function fixtureAvailable(port: number) {
  if (port === 0) return false
  try {
    for (const hostname of ['localhost', '127.0.0.1']) {
      const url = `http://${hostname}:${port}/cors/iiif/3/level2/4f4a289db37a73f2/info.json`
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) })
      const expected = await (await getIiifFixtureResponse(url)).json()
      const actual = await response.json()
      if (!response.ok || JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error('incompatible')
    }
    return true
  } catch {
    for (const hostname of ['localhost', '127.0.0.1'])
      await assertAvailable(port, hostname)
    return false
  }
}

function drainHttp(server: Server) {
  // Existing handlers finish; further requests on a keep-alive socket get 503.
  server.removeAllListeners('request')
  server.on('request', (_request, response) => {
    response.writeHead(503, { Connection: 'close' }).end('API restarting')
  })
  return new Promise<void>((resolve, reject) => {
    if (!server.listening) return resolve()
    server.close((error) => (error ? reject(error) : resolve()))
    server.closeIdleConnections()
  })
}

export async function openServers(
  context: RunningContext,
  fixturePort?: number,
  reuseFixture = false
) {
  const servers: NodeServer[] = []
  const live = createLiveServer(context.shareDb)
  let closing: Promise<void> | undefined
  function close() {
    return (closing ??= (async () => {
      const http = [
        ...servers.map((server) => drainHttp(server.node.server)),
        drainHttp(live.server)
      ]
      live.server.removeAllListeners('upgrade')
      const websocket = new Promise<void>((resolve, reject) =>
        live.wss.close((error) => (error ? reject(error) : resolve()))
      )
      for (const client of live.wss.clients)
        client.close(1012, 'API restarting')
      const timeout = setTimeout(() => {
        for (const client of live.wss.clients) client.terminate()
      }, 5000)
      try {
        await Promise.all([...http, websocket])
      } finally {
        clearTimeout(timeout)
      }
    })())
  }
  try {
    for (const [app, value] of [
      [context.rest, context.env.PUBLIC_REST_BASE_URL],
      [context.annotations, context.env.PUBLIC_ANNOTATIONS_BASE_URL]
    ] as const) {
      const url = new URL(value)
      servers.push(
        await listenElysia(
          app,
          Number(url.port || 80),
          url.hostname.replace(/^\[|\]$/g, '')
        )
      )
    }
    const liveUrl = new URL(context.env.PUBLIC_LIVE_BASE_URL)
    await new Promise<void>((resolve, reject) => {
      live.server.once('error', reject)
      live.server.listen(
        Number(liveUrl.port || 80),
        liveUrl.hostname.replace(/^\[|\]$/g, ''),
        resolve
      )
    })
    if (fixturePort !== undefined && !reuseFixture) {
      const fixtures = new Elysia({ adapter: nodeAdapter() }).all(
        '/*',
        async ({ request }) => getIiifFixtureResponse(request.url)
      )
      // Both seeded hostnames resolve to IPv4 loopback. Keep the fixture
      // listener local and avoid @elysia/node's unbracketed IPv6 URL handling.
      servers.push(await listenElysia(fixtures, fixturePort, '127.0.0.1'))
    }
    return { close, live, servers }
  } catch (error) {
    await close()
    throw error
  }
}
