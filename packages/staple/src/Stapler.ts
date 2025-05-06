import { GcpTransformer } from '@allmaps/transform'

import type { TransformationType } from '@allmaps/transform'

import type { GeoreferencedMapWithRcps, Staple, Staples } from './types'

export class Stapler {
  staples: Staples[]

  type: TransformationType

  /**
   * Create a StapledTransformation
   */ constructor(
    staples: Staples[],
    type: TransformationType = 'thinPlateSpline'
  ) {
    this.staples = staples
    this.type = type

    // Check type baselinearweightstransformation
  }

  static fromGeoreferencedMaps(
    georeferencedMaps: GeoreferencedMapWithRcps[],
    type?: TransformationType
  ): Stapler {
    const staplesById = new Map<string, Staple[]>()

    for (const georeferencedMap of georeferencedMaps) {
      if (!georeferencedMap.rcps) {
        continue
      }
      georeferencedMap.rcps.forEach((rcp) => {
        // TODO: check if ok to assume forward transformation
        // TODO: pass transformation type but don't overwrite if undefined
        if (!staplesById.has(rcp.id)) {
          staplesById.set(rcp.id, [])
        }
        staplesById.get(rcp.id)?.push({
          id: rcp.id,
          source: rcp.resource,
          transformation:
            GcpTransformer.fromGeoreferencedMap(
              georeferencedMap
            ).getToGeoTransformation()
        })
      })
    }

    // TODO: deal with length > 2
    // Then we should take mapId into account, and add it for every two mapId's
    staplesById.forEach((mapStaple, index) => {
      if (mapStaple.length !== 2) staplesById.delete(index)
    })

    const staples: Staples[] = []
    Array.from(staplesById.values()).forEach((mapStaples) =>
      staples.push({
        staple0: mapStaples[0],
        staple1: mapStaples[1]
      })
    )

    return new Stapler(staples, type)
  }
}
