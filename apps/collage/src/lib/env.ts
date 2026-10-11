import * as publicEnv from '$env/static/public'

import { appPublicEnvSchema } from '@allmaps/env'

const collagePublicEnvSchema = appPublicEnvSchema
  .pick({
    PUBLIC_GEOCODE_EARTH_KEY: true,
    PUBLIC_VIEWER_BASE_URL: true
  })
  .partial()

export const env = collagePublicEnvSchema.parse(publicEnv)
