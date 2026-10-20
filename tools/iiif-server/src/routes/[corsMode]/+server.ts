import type { RequestHandler } from './$types'

import { handleFixtureOptions, handleFixtureRequest } from '../../lib/server.ts'

export const GET: RequestHandler = ({ params, request }) => {
  return handleFixtureRequest(request, params.corsMode)
}

export const OPTIONS: RequestHandler = ({ params }) => {
  return handleFixtureOptions(params.corsMode)
}
