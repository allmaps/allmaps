import type { Gcp, Point } from '@allmaps/types'

import type {
  GeneralGcp,
  GeneralGcpAndDistortions,
  GcpAndDistortions
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
