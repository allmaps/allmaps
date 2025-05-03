// import { GcpTransformer } from '@allmaps/transform'

// import type { GeoreferencedMap } from '@allmaps/annotation'

import type { BaseTransformation, TransformationType } from '@allmaps/transform'

import type { MapsStaple as MapsStaples, MapStaple } from './types'

export class StapledTransformation {
  transformations: BaseTransformation[]
  mapStaples: MapStaple[]

  mapsStaples: MapsStaples = new Map()

  type: TransformationType

  /**
   * Create a StapledTransformation
   */ constructor(
    transformations: BaseTransformation[],
    staples: MapStaple[],
    type: TransformationType = 'thinPlateSpline'
  ) {
    this.transformations = transformations
    this.mapStaples = staples
    this.type = type

    for (const mapStaple of this.mapStaples) {
      if (!this.mapsStaples.has(mapStaple.stapleId)) {
        this.mapsStaples.set(mapStaple.stapleId, [])
      }
      this.mapsStaples.get(mapStaple.stapleId)?.push(mapStaple)
    }

    this.mapsStaples.forEach((mapsStaple, stapleId) => {
      if (mapsStaple.length < 2) this.mapsStaples.delete(stapleId)
    })
  }

  // static fromGeoreferencedMaps(
  //   georeferencedMaps: GeoreferencedMap[],
  //   type: TransformationType
  // ): StapledTransformation {
  //   const mapStaples: mapStaple[] = []

  //   for (const georeferencedMap of georeferencedMaps) {
  //     mapStaples.push(georeferencedMap.staple)
  //   }

  //   // TODO: check if ok to assume forward
  //   // TODO: pass type but don't overwrite if undefined
  //   const transformations = georeferencedMaps.map((georeferencedMap) =>
  //     GcpTransformer.fromGeoreferencedMap(
  //       georeferencedMap
  //     ).getToGeoTransformation()
  //   )

  //   return new StapledTransformation(transformations, mapStaples, type)
  // }
}
