import { t } from 'elysia'

import { queryMaps } from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'
import { createAuth } from '@allmaps/db/auth'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia } from '../elysia.js'

export function createManifestsRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  void betterAuth

  return createElysia({ name: 'manifests' }).get(
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
}
