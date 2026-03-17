import { queryMaps } from '@allmaps/api-shared/db'

import { createElysia, RegExpRoute } from '../elysia.js'

// Matches: imageId  OR  imageId@imageChecksum  OR  imageId.geojson etc.
const imageRoute = new RegExpRoute<{
  imageId: string
  imageChecksum?: string
  ext?: string
}>(
  'imageId',
  /^(?<imageId>[0-9a-f]+)(@(?<imageChecksum>[0-9a-f]+))?(\.(?<ext>\w+))?$/
)

export const images = createElysia({ name: 'images' }).get(
  `/images/${imageRoute.path}`,
  ({ env, db, params }) => {
    const { imageId, imageChecksum, ext } = imageRoute.parse(params)
    const format = ext === 'geojson' ? 'geojson' : 'annotation'
    return queryMaps(
      env.PUBLIC_ANNOTATIONS_BASE_URL,
      db,
      {
        imageId,
        ...(imageChecksum ? { imageChecksum } : {})
      },
      { format, expectRows: true, singular: false }
    )
  },
  {
    params: imageRoute.params,
    detail: {
      summary: 'Get annotations for an image (with optional version)',
      tags: ['Images']
    }
  }
)
