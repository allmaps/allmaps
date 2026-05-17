import { env as publicEnv } from '$env/dynamic/public'

import { parseEditorPublicEnv } from '@allmaps/env/editor'

import type { LayoutServerLoad } from './$types'

const editorPublicEnv = parseEditorPublicEnv(publicEnv)

export const load: LayoutServerLoad = () => {
  return {
    env: editorPublicEnv
  }
}
