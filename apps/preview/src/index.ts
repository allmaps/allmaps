import { AutoRouter, error, cors, json } from 'itty-router'

// import { generateImage } from './image.js'
import { generateCard } from './card.js'
import { match, put, headers } from './cache.js'

const { preflight, corsify } = cors()

const router = AutoRouter({
  before: [preflight],
  finally: [corsify, headers, put]
})

const width = 1200
const height = 600

// router.get('/maps/:mapId.png', (req, env) => {
//   const mapId = req.params?.mapId
//   return generateImage(mapId, [width, height])
// })

router.get('/maps/:mapId.png', (req, env) => {
  const mapId = req.params?.mapId
  return generateCard(mapId, [width, height])
})

router.get('/', () => json({ name: 'Allmaps Preview' }))

export default {
  fetch: async (request: Request, ...args: unknown[]) => {
    const cachedResponse = await match(request.url)
    if (cachedResponse) {
      return cachedResponse
    } else {
      return router.fetch(request, ...args).catch(error)
    }
  }
}
