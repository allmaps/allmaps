import express from 'express'
import type { RequestHandler } from 'express'
import { timingSafeEqual } from 'node:crypto'
import type { LiveEnv } from '@allmaps/env/live'
import http from 'node:http'
import cors from 'cors'
import { WebSocketServer } from 'ws'

import { validateGeoreferencedMap } from '@allmaps/annotation'
import AllmapsShareDB from './sharedb/sharedb.ts'

import packageJson from '../package.json' with { type: 'json' }

export { AllmapsShareDB }

export function createLiveServer(
  shareDb: AllmapsShareDB,
  env: Pick<LiveEnv, 'LIVE_IMPORT_SECRET'> = {}
) {
  const expectedAuthorization = env.LIVE_IMPORT_SECRET
    ? Buffer.from(`Bearer ${env.LIVE_IMPORT_SECRET}`)
    : undefined
  const requireImportSecret: RequestHandler = (request, response, next) => {
    response.set('Cache-Control', 'private, no-store')
    if (!expectedAuthorization) {
      response
        .status(503)
        .json({ error: 'Georeference imports are not configured' })
      return
    }

    const authorization = Buffer.from(request.get('authorization') ?? '')
    if (
      authorization.length !== expectedAuthorization.length ||
      !timingSafeEqual(authorization, expectedAuthorization)
    ) {
      response.status(401).json({ error: 'Unauthorized' })
      return
    }

    next()
  }

  const app = express()
  app.use(cors())
  // Authenticate HTTP imports before parsing their bodies. WebSocket upgrades
  // are handled separately by the WebSocket server below.
  app.use('/maps', requireImportSecret, express.json())
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

  return { server, wss }
}
