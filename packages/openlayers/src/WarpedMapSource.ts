import Source from 'ol/source/Source.js'

import { RTree, World } from '@allmaps/render'

import type { BBox } from '@allmaps/render'
import type { Annotation } from '@allmaps/annotation'

export class WarpedMapSource extends Source {
  rtree: RTree
  world: World

  constructor() {
    super({
      interpolate: true,
      projection: undefined,
      state: 'ready',
      wrapX: true
    })

    this.rtree = new RTree()
    this.world = new World(this.rtree)
  }

  async addGeorefAnnotation(annotation: Annotation): Promise<(string | Error)[]> {
    return this.world.addGeorefAnnotation(annotation)
  }

  getWorld() {
    return this.world
  }

  getWarpedMap(mapId: string) {
    return this.world.getWarpedMap(mapId)
  }

  getExtent(): BBox | undefined {
    return this.world.getBBox()
  }
}
