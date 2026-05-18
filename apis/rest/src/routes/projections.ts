import {
  getProjectionByDbId,
  getProjectionsByDbId,
  getProjectionWithFullId
} from '@allmaps/api-shared/projections'
import { setCacheControl } from '@allmaps/api-shared'

import { createElysia, error } from '../elysia.js'

export const projections = createElysia({ name: 'projections' })
  .decorate('projectionsById', getProjectionsByDbId())
  .get(
    '/projections',
    ({ env, projectionsById, set }) => {
      setCacheControl(set, 'public-long')
      return (
        // TODO: can't we cache this instead of recomputing it on every request?
        Object.values(projectionsById).map((projection) =>
          getProjectionWithFullId(projection, env.PUBLIC_REST_BASE_URL)
        )
      )
    },
    {
      detail: {
        summary: 'Get all projections',
        tags: ['Projections']
      }
    }
  )
  .get(
    '/projections/:projectionId',
    ({ env, params, projectionsById, set }) => {
      setCacheControl(set, 'public-long')
      const projection = getProjectionByDbId(
        projectionsById,
        params.projectionId
      )
      if (projection) {
        return getProjectionWithFullId(projection, env.PUBLIC_REST_BASE_URL)
      } else {
        return error(404, 'Projection not found')
      }
    },
    {
      detail: {
        summary: 'Get a single projection',
        tags: ['Projections']
      }
    }
  )
