import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'

import { createElysia } from '../elysia.js'

export const canvases = createElysia({ name: 'canvases' }).get(
  '/canvases/:canvasId',
  ({ env, db, params }) =>
    queryMaps(
      env.PUBLIC_ANNOTATIONS_BASE_URL,
      db,
      { canvasId: params.canvasId },
      { format: 'annotation', expectRows: true, singular: false }
    ),
  {
    params: t.Object({ canvasId: t.String() }),
    detail: {
      summary: 'Get annotations for a canvas',
      tags: ['Canvases']
    }
  }
)
