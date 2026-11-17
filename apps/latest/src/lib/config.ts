import * as publicEnv from '$env/static/public'

const environment = publicEnv as Record<string, string>

export const mapsApiBaseUrl =
  environment.PUBLIC_REST_BASE_URL ?? 'https://api.allmaps.org'

export const annotationsApiBaseUrl =
  environment.PUBLIC_ANNOTATIONS_BASE_URL ?? 'https://annotations.allmaps.org'
