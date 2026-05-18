import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'

import { createElysia } from '../elysia.js'

export const canvases = createElysia({ name: 'canvases' }).get(
  '/canvases/:canvasId',
  ({ request, env, db, params, set }) => {
    setCacheControl(set, 'public-medium')
    return queryMaps(
      env.PUBLIC_ANNOTATIONS_BASE_URL,
      db,
      { canvasId: params.canvasId },
      {
        id: request.url,
        format: 'annotation',
        expectRows: true,
        singular: false
      }
    )
  },
  {
    params: t.Object({ canvasId: t.String() }),
    detail: {
      summary: 'Get Georeference Annotations for a single IIIF Canvas',
      tags: ['Canvases']
    }
  }
)
