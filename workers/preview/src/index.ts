import { AutoRouter, error, cors, json, IRequestStrict } from 'itty-router'

import { optionsFromQuery } from './shared/options.js'
import { match, put, headers } from './shared/cache.js'

import type { CFArgs, Env } from './shared/types.js'

import type { Size } from '@allmaps/types'

// Cards

// Warped Map:
import { generateWarpedMapCard } from './cards/warped-map.js'

// Apps:
import { generateEditorCard } from './cards/editor.js'
import { generateHereCard } from './cards/here.js'
import { generateLatestCard } from './cards/latest.js'
import { generateViewerCard } from './cards/viewer.js'

const { preflight, corsify } = cors()

const router = AutoRouter<IRequestStrict, CFArgs>({
  before: [preflight],
  finally: [corsify, headers, put]
})

const ogImageSize: Size = [1200, 630]

router.get('/apps/latest.png', (req, env) => {
  return generateLatestCard(req, env, ogImageSize)
})

router.get('/apps/editor/maps/:imageId.png', (req, env, ctx) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)

  return generateEditorCard(imageId, ogImageSize, options)
})

router.get('/apps/viewer/maps/:imageId.png', (req) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)

  return generateViewerCard(imageId, ogImageSize, options)
})

router.get('/apps/here/maps/:mapId.png', (req, env, ctx) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return generateHereCard(mapId, ogImageSize, options)
})

router.get('/maps/:mapId.png', (req, env, ctx) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return generateWarpedMapCard(mapId, ogImageSize, options)
})

router.get('/', () => json({ name: 'Allmaps Preview' }))

export default {
  fetch: async (request: Request, env, ctx) => {
    return (
      (env.USE_CACHE && (await match(request.url))) ||
      router.fetch(request, env, ctx).catch(error)
    )
  }
} satisfies ExportedHandler<Env>
