import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'

import { createElysia } from '../elysia.js'

export const manifests = createElysia({ name: 'manifests' }).get(
  '/manifests/:manifestId',
  ({ env, db, params }) =>
    queryMaps(
      env.PUBLIC_ANNOTATIONS_BASE_URL,
      db,
      { manifestId: params.manifestId },
      { format: 'annotation', expectRows: true, singular: false }
    ),
  {
    params: t.Object({ manifestId: t.String() }),
    detail: {
      summary: 'Get annotations for a manifest',
      tags: ['Manifests']
    }
  }
)
