import { makeProjectionUrl } from '../shared/urls.js'

import projectionsData from './projections.json' with { type: 'json' }

type Projection = {
  id: string
  definition: string
  name: string
  epsg: number
  bbox: number[]
}

type ProjectionsByDbId = Record<string, Projection>

export function getProjectionsByDbId(): ProjectionsByDbId {
  return Object.fromEntries(
    (projectionsData as Projection[]).map((projection) => [
      projection.id,
      projection
      // { ...projection, id: `${baseUrl}/projections/${projection.id}` }
    ])
  )
}

export function getProjectionByDbId(
  projectionsByDbId: ProjectionsByDbId,
  id: string
): Projection | undefined {
  return projectionsByDbId[id]
}

// import { makeProjectionUrl } from './urls.js'
// export function getProjectionsById(apiBaseUrl: string) {
// }

// const projectionsById = Object.fromEntries(
//   projections.map((projection) => [
//     projection.id,
//     { ...projection, id: makeProjectionUrl(projection.id) }
//   ])
// )

export function getProjectionDbId(projectionId: string) {
  // projectionId has form https://api.allmaps.org/projections/81959313a5c376fc
  // This function returns the hash
  return projectionId.split('/').slice(-1)[0]
}

// export function getProjections() {
//   return Object.values(projectionsById)
// }

// export function getProjectionById(projectionId?: string) {
//   if (!projectionId) {
//     return
//   }

//   return projectionsById[projectionId]
// }

export function getProjectionWithFullId(
  projection: Projection,
  baseUrl: string
) {
  return {
    ...projection,
    id: makeProjectionUrl(baseUrl, projection.id)
  }
}

export function getProjectionByDefinitionAndName(
  projectionsByDbId: ProjectionsByDbId,
  definition?: string,
  name?: string
) {
  if (!definition || !name) {
    return
  }

  return Object.values(projectionsByDbId).find(
    (projection) =>
      projection.definition === definition && projection.name === name
  )
}
