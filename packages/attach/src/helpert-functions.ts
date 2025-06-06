import { ProjectedGcpTransformer } from '@allmaps/project'
import { deepClone, flipY } from '@allmaps/stdlib'
import { GeneralGcpTransformerOptions } from '@allmaps/transform'

import type { Point } from '@allmaps/types'

export function resourceToSource(
  { resource }: { resource: Point },
  transformerOptions: GeneralGcpTransformerOptions
): { source: Point } {
  // Same process from {resource, geo} to {source, destination}
  // as in BaseGcpTransformer's constructor

  let source = transformerOptions.differentHandedness
    ? flipY(resource)
    : resource
  source = transformerOptions.preForward(source)
  return { source }
}

export function sourceDestinationToResourceGeo(
  { source, destination }: { source: Point; destination: Point },
  transformerOptions: GeneralGcpTransformerOptions,
  projectedGcpTransformer: ProjectedGcpTransformer
): { resource: Point; geo: Point } {
  // Same process from {source, destination} to {resource, geo}
  // as in BaseGcpTransformer's transformPointForwardInternal()

  source = transformerOptions.differentHandedness ? flipY(source) : source

  destination = transformerOptions.postForward(destination as Point)
  destination = projectedGcpTransformer.projectionToLatLon(destination)

  return { resource: source, geo: destination }
}

export function deepCloneMap<K, V>(inputMap: Map<K, V>): Map<K, V> {
  const deepClonedMap = new Map(inputMap)
  Array.from(deepClonedMap).forEach(([key, value]) =>
    deepClonedMap.set(key, deepClone(value))
  )
  return deepClonedMap
}
