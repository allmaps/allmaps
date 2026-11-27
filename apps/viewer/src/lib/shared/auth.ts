import { env } from '$env/dynamic/public'
import { parseViewerPublicEnv } from '@allmaps/env/viewer'
import { createAllmapsAuthClient } from '@allmaps/ui/auth-client'

export const {
  PUBLIC_REST_BASE_URL: restBaseUrl,
  PUBLIC_ANNOTATIONS_BASE_URL: annotationsBaseUrl
} = parseViewerPublicEnv(env)

export const authClient = createAllmapsAuthClient(restBaseUrl)
