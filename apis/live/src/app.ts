import express from 'express'
import http from 'node:http'
import cors from 'cors'
import { WebSocketServer } from 'ws'

import { validateGeoreferencedMap } from '@allmaps/annotation'
import AllmapsShareDB from './sharedb/sharedb.ts'

import packageJson from '../package.json' with { type: 'json' }

export { AllmapsShareDB }

export function createLiveServer(shareDb: AllmapsShareDB) {
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

  return { server, wss }
}
