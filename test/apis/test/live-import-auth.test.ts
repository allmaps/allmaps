import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { WebSocket } from 'ws'
import { afterEach, expect, test, vi } from 'vitest'
import { createLiveServer } from '../../../apis/live/src/app.ts'
import type AllmapsShareDB from '../../../apis/live/src/sharedb/sharedb.ts'
import { fixtureMap } from './fixtures/map.ts'
import { allowTestPort } from './helpers/isolation.ts'

const importSecret = 'test-live-import-secret-never-use-in-production'
const importRoutes = [
  ['/maps', 'POST'],
  ['/maps/map-id', 'PATCH']
] as const
const cleanups: (() => Promise<void>)[] = []

async function startLive(secret?: string) {
  const shareDb = {
    saveMaps: vi.fn(async () => ({ saved: true })),
    updateMap: vi.fn(async () => ({ updated: true })),
    onWebSocketConnection: vi.fn()
  }
  const { server, wss } = createLiveServer(
    shareDb as unknown as AllmapsShareDB,
    {
      LIVE_IMPORT_SECRET: secret
    }
  )
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const port = (server.address() as AddressInfo).port
  allowTestPort(port)
  cleanups.push(async () => {
    for (const client of wss.clients) client.terminate()
    await Promise.all([
      new Promise<void>((resolve, reject) =>
        wss.close((error) => (error ? reject(error) : resolve()))
      ),
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
        server.closeAllConnections()
      })
    ])
  })
  return { url: `http://127.0.0.1:${port}`, shareDb }
}

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()))
})

test.each([
  undefined,
  'Bearer wrong-secret',
  `Bearer ${'x'.repeat(importSecret.length)}`,
  `Basic ${importSecret}`
])(
  'rejects direct imports with invalid authorization: %s',
  async (authorization) => {
    const { url, shareDb } = await startLive(importSecret)
    for (const [path, method] of importRoutes) {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(authorization ? { Authorization: authorization } : {})
        },
        // Invalid JSON proves authentication runs before body parsing.
        body: '{'
      })
      expect(response.status).toBe(401)
      expect(response.headers.get('cache-control')).toContain('no-store')
    }
    expect(shareDb.saveMaps).not.toHaveBeenCalled()
    expect(shareDb.updateMap).not.toHaveBeenCalled()
  }
)

test.each(['', undefined])(
  'disables direct imports when the secret is missing: %s',
  async (secret) => {
    const { url, shareDb } = await startLive(secret)
    for (const [path, method] of importRoutes) {
      expect(
        (
          await fetch(`${url}${path}`, {
            method,
            headers: {
              Authorization: `Bearer ${importSecret}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(fixtureMap)
          })
        ).status
      ).toBe(503)
    }
    expect(shareDb.saveMaps).not.toHaveBeenCalled()
    expect(shareDb.updateMap).not.toHaveBeenCalled()
  }
)

test('accepts authenticated imports and preserves map validation', async () => {
  const { url, shareDb } = await startLive(importSecret)
  const headers = {
    Authorization: `Bearer ${importSecret}`,
    'Content-Type': 'application/json'
  }
  for (const [path, method] of importRoutes) {
    expect(
      (
        await fetch(`${url}${path}`, {
          method,
          headers,
          body: JSON.stringify(fixtureMap)
        })
      ).status
    ).toBe(200)
  }
  expect(shareDb.saveMaps).toHaveBeenCalledWith([fixtureMap])
  expect(shareDb.updateMap).toHaveBeenCalledWith('map-id', fixtureMap)
  expect(
    (
      await fetch(`${url}/maps/map-id`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify([fixtureMap])
      })
    ).status
  ).toBe(400)
  expect(shareDb.updateMap).toHaveBeenCalledOnce()
})

test.each([importSecret, ''])(
  'keeps health checks and WebSockets public',
  async (secret) => {
    const { url, shareDb } = await startLive(secret)
    expect((await fetch(url)).status).toBe(200)
    const socket = new WebSocket(url.replace('http:', 'ws:'))
    await once(socket, 'open')
    expect(shareDb.onWebSocketConnection).toHaveBeenCalledOnce()
    socket.close()
    await once(socket, 'close')
  }
)
