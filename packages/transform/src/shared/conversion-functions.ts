import type { Gcp, Point } from '@allmaps/types'

import type {
  GeneralGcp,
  GeneralGcpAndDistortions,
  GcpAndDistortions,
  TransformationType
} from './types.js'

// Invert

export function invertGeneralGcp(generalGcp: GeneralGcp): GeneralGcp {
  return { source: generalGcp.destination, destination: generalGcp.source }
}

export function invertGcp(gcp: Gcp): Gcp {
  return { resource: gcp.geo, geo: gcp.resource }
}

// Select

export function generalGcpToPointForForward(generalGcp: GeneralGcp): Point {
  return generalGcp.destination
}

export function generalGcpToPointForBackward(generalGcp: GeneralGcp): Point {
  return generalGcp.source
}

export function gcpToPointForToGeo(gcp: Gcp): Point {
  return gcp.geo
}

export function gcpToPointForToResource(gcp: Gcp): Point {
  return gcp.resource
}

// GeneralGcp <> G

export function generalGcpToGcp(
  generalGcp: GeneralGcpAndDistortions
): GcpAndDistortions {
  return {
    resource: generalGcp.source,
    geo: generalGcp.destination,

    partialDerivativeX: generalGcp.partialDerivativeX,
    partialDerivativeY: generalGcp.partialDerivativeY,
    distortions: generalGcp.distortions,
    distortion: generalGcp.distortion
  }
}

export function gcpToGeneralGcp(
  gcp: GcpAndDistortions
): GeneralGcpAndDistortions {
  return {
    source: gcp.resource,
    destination: gcp.geo,

    partialDerivativeX: gcp.partialDerivativeX,
    partialDerivativeY: gcp.partialDerivativeY,
    distortions: gcp.distortions,
    distortion: gcp.distortion
  }
}

// TransformationType

// TODO: implement this as a separate, callable function in @allmaps/annotation?
export function transformationTypeToTypeAndOrder(
  transformationType?: TransformationType
): { type?: string; options?: { order: number } } {
  if (
    transformationType === 'polynomial' ||
    transformationType === 'polynomial1'
  ) {
    return {
      type: 'polynomial',
      options: {
        order: 1
      }
    }
  } else if (transformationType === 'polynomial2') {
    return {
      type: 'polynomial',
      options: {
        order: 2
      }
    }
  } else if (transformationType === 'polynomial3') {
    return {
      type: 'polynomial',
      options: {
        order: 3
      }
    }
  } else {
    return {
      type: transformationType
    }
  }
}

export function typeAndOrderToTransformationType(transformation: {
  type?: string
  options?: { order?: number }
}): TransformationType {
  const type = transformation.type
  const order = transformation.options?.order
  let transformationType: TransformationType
  if (type == 'polynomial1' || type === 'polynomial') {
    transformationType = 'polynomial1'
  } else if (type == 'polynomial2' || (type === 'polynomial' && order === 2)) {
    transformationType = 'polynomial2'
  } else if (type == 'polynomial3' || (type === 'polynomial' && order === 3)) {
    transformationType = 'polynomial3'
  } else if (type === 'thinPlateSpline') {
    transformationType = type
  } else if (type === 'linear') {
    transformationType = type
  } else if (type === 'helmert') {
    transformationType = type
  } else if (type === 'projective') {
    transformationType = type
  } else {
    throw new Error('Unrecognised transformationType.')
  }
  return transformationType
}
