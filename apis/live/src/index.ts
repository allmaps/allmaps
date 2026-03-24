import express from 'express'
import http from 'node:http'
import cors from 'cors'
import { WebSocketServer } from 'ws'

import AllmapsShareDB from './sharedb/sharedb.js'

import { getPostgresContext } from '@allmaps/db'
import { validateGeoreferencedMap } from '@allmaps/annotation'
import { parseLiveEnv } from '@allmaps/env/live'

import packageJson from '../package.json' with { type: 'json' }

const env = parseLiveEnv(process.env)

if (!env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL')
}

const postgresContext = getPostgresContext(env.DATABASE_URL)
const shareDb = new AllmapsShareDB(postgresContext)

const app = express()
app.use(cors())
app.use(express.json())
app.set('json spaces', 2)

app.get('/', (_req, res) => {
  res.send({
    name: 'Allmaps Live API',
    version: packageJson.version
  })
})

app.post('/maps', async (req, res) => {
  const mapOrMaps = validateGeoreferencedMap(req.body)
  const maps = Array.isArray(mapOrMaps) ? mapOrMaps : [mapOrMaps]
  res.send(await shareDb.saveMaps(maps))
})

app.patch('/maps/:mapId', async (req, res) => {
  const mapId = req.params.mapId
  const mapOrMaps = validateGeoreferencedMap(req.body)
  if (Array.isArray(mapOrMaps)) {
    res.status(400).send({ error: 'body must be a single map' })
    return
  }
  res.send(await shareDb.updateMap(mapId, mapOrMaps))
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server })

wss.on('connection', shareDb.onWebSocketConnection.bind(shareDb))

console.log(`⚡ Allmaps Live API starting...`)

const port = Number(process.env.PORT)

if (!Number.isInteger(port) || port <= 0) {
  throw new Error('Missing or invalid PORT')
}

server.listen(port, () => {
  console.log(`⚡ Allmaps Live API ready at: http://localhost:${port}`)
})

let isShuttingDown = false
let cleanupPromise: Promise<void> | undefined

function closeWebSocketServer() {
  return new Promise<void>((resolve, reject) => {
    wss.close((err) => {
      if (err) {
        reject(err)
        return
      }

      resolve()
    })
  })
}

function closeHttpServer() {
  return new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err)
        return
      }

      resolve()
    })
    server.closeIdleConnections()
    server.closeAllConnections()
  })
}

function cleanupResources() {
  if (!cleanupPromise) {
    cleanupPromise = (async () => {
      await shareDb.close()
      await postgresContext.sql.end({ timeout: 5 })
    })()
  }

  return cleanupPromise
}

server.on('close', () => {
  void cleanupResources().catch((err) => {
    console.error('Failed to cleanup Allmaps Live API resources', err)
  })
})

async function shutdown(signal: NodeJS.Signals) {
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true
  console.log(`Received ${signal}, shutting down Allmaps Live API...`)

  for (const client of wss.clients) {
    client.terminate()
  }

  const forceShutdownTimeout = setTimeout(() => {
    console.error(
      'Forcing shutdown of Allmaps Live API after waiting 10 seconds'
    )
    for (const client of wss.clients) {
      client.terminate()
    }
    server.closeAllConnections()
    process.exit(1)
  }, 10_000)
  forceShutdownTimeout.unref()

  try {
    await closeWebSocketServer()
    await closeHttpServer()
    await cleanupResources()
    process.exit(0)
  } catch (err) {
    console.error('Failed to shutdown Allmaps Live API cleanly', err)
    process.exit(1)
  } finally {
    clearTimeout(forceShutdownTimeout)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

export default server
