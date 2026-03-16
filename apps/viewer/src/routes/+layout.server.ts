import { env as publicEnv } from '$env/dynamic/public'

import { parseViewerPublicEnv } from '@allmaps/env/viewer'

import type { LayoutServerLoad } from './$types'

const viewerPublicEnv = parseViewerPublicEnv(publicEnv)

export const load: LayoutServerLoad = () => {
  return {
    env: viewerPublicEnv
  }
}
