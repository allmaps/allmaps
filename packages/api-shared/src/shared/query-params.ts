import { ResponseError } from './errors.js'

import type { ContainedBy, IntersectsWith, MapsQueryParams } from '../types.js'

type MapsQueryParamName =
  | 'limit'
  | 'imageServiceDomain'
  | 'manifestDomain'
  | 'intersectsWith'
  | 'containedBy'
  | 'minScale'
  | 'maxScale'
  | 'minArea'
  | 'maxArea'

const mapsQueryParamNames: Record<string, MapsQueryParamName> = {
  limit: 'limit',
  imageservicedomain: 'imageServiceDomain',
  manifestdomain: 'manifestDomain',
  intersects: 'intersectsWith',
  containedby: 'containedBy',
  minscale: 'minScale',
  maxscale: 'maxScale',
  minarea: 'minArea',
  maxarea: 'maxArea'
}

function parseNumberParam(name: string, value: string) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    throw new ResponseError(`Invalid query parameter ${name}: ${value}`, 400)
  }

  return number
}

function parseNumberArrayParam(name: string, values: string[]) {
  return values
    .flatMap((value) => value.split(','))
    .filter((value) => value !== '')
    .map((value) => parseNumberParam(name, value))
}

function parseIntersects(intersects?: number[]): IntersectsWith | undefined {
  if (intersects && (intersects.length === 2 || intersects.length === 4)) {
    return intersects as IntersectsWith
  }
}

function parseContainedBy(containedBy?: number[]): ContainedBy | undefined {
  if (containedBy && containedBy.length === 4) {
    return containedBy as ContainedBy
  }
}

export function normalizeMapsQueryParams(
  request: Request
): Partial<MapsQueryParams> {
  const searchParams = new URL(request.url).searchParams
  const valuesByName = new Map<MapsQueryParamName, string[]>()

  for (const [key, value] of searchParams) {
    const name = mapsQueryParamNames[key.toLowerCase()]

    if (name) {
      valuesByName.set(name, [...(valuesByName.get(name) ?? []), value])
    }
  }

  const params: Partial<MapsQueryParams> = {}

  for (const [name, values] of valuesByName) {
    const lastValue = values.at(-1)

    if (lastValue === undefined) {
      continue
    }

    switch (name) {
      case 'limit':
        params.limit = parseNumberParam(name, lastValue)
        break
      case 'imageServiceDomain':
        params.imageServiceDomain = lastValue
        break
      case 'manifestDomain':
        params.manifestDomain = lastValue
        break
      case 'intersectsWith':
        params.intersectsWith = parseIntersects(
          parseNumberArrayParam('intersects', values)
        )
        break
      case 'containedBy':
        params.containedBy = parseContainedBy(
          parseNumberArrayParam('containedBy', values)
        )
        break
      case 'minScale':
        params.minScale = parseNumberParam(name, lastValue)
        break
      case 'maxScale':
        params.maxScale = parseNumberParam(name, lastValue)
        break
      case 'minArea':
        params.minArea = parseNumberParam(name, lastValue)
        break
      case 'maxArea':
        params.maxArea = parseNumberParam(name, lastValue)
        break
    }
  }

  return params
}
