import { GcpTransformer } from '@allmaps/transform'

import type { GeoreferencedMap } from '@allmaps/annotation'

import { parseMap, parseGcps, parseTransformationType } from './parse.js'

export function getTransformerFromOptions(options: {
  annotation?: string
  gcps?: string
  transformationType: string
  polynomialOrder: number
}) {
  let map: GeoreferencedMap | undefined

  try {
    map = parseMap(options)
  } catch {
    // If no map is found, try parsing GCPs from options instead of a map
  }

  const gcps = parseGcps(options, map)
  const transformationType = parseTransformationType(options, map)
  const transformer = new GcpTransformer(gcps, transformationType)

  return transformer
}
