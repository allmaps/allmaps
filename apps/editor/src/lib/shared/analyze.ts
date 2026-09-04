import type { GeoreferencedMap } from '@allmaps/annotation'
import type { DbTransformation } from '$lib/types/maps.js'

type GeoreferencedMapTransformation = NonNullable<
  GeoreferencedMap['transformation']
>

type MapTransformation = DbTransformation | GeoreferencedMapTransformation

function getPolynomialGcpMinimum(order = 1) {
  if (order === 2) {
    return 6
  }

  if (order === 3) {
    return 10
  }

  return 3
}

function getTransformationOrder(
  transformation: GeoreferencedMapTransformation
) {
  const order = transformation.options?.order

  return typeof order === 'number' ? order : 1
}

export function getTransformationGcpMinimum(
  transformation?: MapTransformation
) {
  if (!transformation) {
    return 3
  }

  if (typeof transformation === 'string') {
    if (transformation === 'helmert' || transformation === 'straight') {
      return 2
    }

    if (transformation === 'polynomial2') {
      return 6
    }

    if (transformation === 'polynomial3') {
      return 10
    }

    if (transformation === 'projective') {
      return 4
    }

    return 3
  }

  if (transformation.type === 'helmert' || transformation.type === 'straight') {
    return 2
  }

  if (transformation.type === 'projective') {
    return 4
  }

  if (transformation.type === 'polynomial') {
    return getPolynomialGcpMinimum(getTransformationOrder(transformation))
  }

  return 3
}

export function isComplete(map: GeoreferencedMap): boolean {
  return map.gcps.length >= getTransformationGcpMinimum(map.transformation)
}
