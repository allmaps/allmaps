import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'

import { createElysia } from '../elysia.js'

export const manifests = createElysia({ name: 'manifests' }).get(
  '/manifests/:manifestId',
  ({ request, env, db, params, set }) => {
    setCacheControl(set, 'public-medium')
    return queryMaps(
      env.PUBLIC_ANNOTATIONS_BASE_URL,
      db,
      { manifestId: params.manifestId },
      {
        id: request.url,
        format: 'annotation',
        expectRows: true,
        singular: false
      }
    )
  },
  {
    params: t.Object({ manifestId: t.String() }),
    detail: {
      summary: 'Get Georeference Annotations for a single IIIF Manifest',
      tags: ['Manifests']
    }
  }
)
