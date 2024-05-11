import { AutoRouter, error, cors, json } from 'itty-router'

import { optionsFromQuery } from './options.js'
// import { generateImage } from './image.js'
import { generateCard } from './card.js'
import { match, put, headers } from './cache.js'

const { preflight, corsify } = cors()

const router = AutoRouter({
  before: [preflight],
  finally: [corsify, headers, put]
})

type Env = {
  USE_CACHE: boolean
  API_BASE_URL: string
}

const width = 1200
const height = 600

// router.get('/maps/:mapId.png', (req, env) => {
//   const mapId = req.params?.mapId
//   return generateImage(mapId, [width, height])
// })

router.get('/maps/:mapId.png', (req) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return generateCard(mapId, [width, height], options)
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
