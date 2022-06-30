import Source from 'ol/source/Source.js'
import SourceState from 'ol/source/State.js'
import Event from 'ol/events/Event.js'

import Worker from './worker.ts?worker&inline'

import { generateChecksum } from '@allmaps/id/browser'

import { WarpedMapEventTypes } from './WarpedMapEventType.js'

type Size = [number, number]
type Extent = [number, number, number, number]

export class WarpedMapSourceEvent extends Event {
  data: any

  constructor(type: string, data: any) {
    super(type)

    this.data = data
  }
}

export class WarpedMapSource extends Source {
  worker: Worker

  tileUrls: Set<string> = new Set()

  constructor() {
    super({
      interpolate: true,
      projection: undefined,
      state: SourceState.READY,
      wrapX: true
    })

    this.worker = new Worker()
    // console.log(import.meta.url, new URL('worker.ts', import.meta.url))
    // console.log(import.meta.url)
    // this.worker = new Worker(new URL('./worker.ts', import.meta.url))

    // this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
    //   type: 'module'
    // })

    // @ts-ignore
    this.worker.onmessage = this.onWorkerMessage.bind(this)
  }

  onWorkerMessage(event: WarpedMapSourceEvent): any {
    const { type, data } = event.data
    if (type === WarpedMapEventTypes.WARPEDMAPADDED) {
      this.dispatchEvent(
        new WarpedMapSourceEvent(WarpedMapEventTypes.WARPEDMAPADDED, data)
      )
      this.changed()
    } else if (type === WarpedMapEventTypes.WARPEDMAPENTEREXTENT) {
      this.dispatchEvent(
        new WarpedMapSourceEvent(WarpedMapEventTypes.WARPEDMAPENTEREXTENT, data)
      )
    } else if (type === WarpedMapEventTypes.WARPEDMAPLEAVEEXTENT) {
      this.dispatchEvent(
        new WarpedMapSourceEvent(WarpedMapEventTypes.WARPEDMAPLEAVEEXTENT, data)
      )
    } else if (type === WarpedMapEventTypes.TILENEEDED) {
      this.dispatchEvent(
        new WarpedMapSourceEvent(WarpedMapEventTypes.TILENEEDED, data)
      )

      const { url } = data
      this.tileUrls.add(url)

      this.dispatchEvent(
        new WarpedMapSourceEvent(WarpedMapEventTypes.TILESCHANGED, [
          ...this.tileUrls
        ])
      )
    } else if (type === WarpedMapEventTypes.TILEUNNEEDED) {
      this.dispatchEvent(
        new WarpedMapSourceEvent(WarpedMapEventTypes.TILEUNNEEDED, data)
      )

      const { url } = data
      this.tileUrls.delete(url)

      this.dispatchEvent(
        new WarpedMapSourceEvent(WarpedMapEventTypes.TILESCHANGED, [
          ...this.tileUrls
        ])
      )
    }
  }

  sendWorkerMessage(type: string, data: any) {
    console.log('Send to worker', type, data)
    this.worker.postMessage({
      type,
      data
    })
  }

  updateNeededTiles(
    size: Size,
    extent: Extent,
    coordinateToPixelTransform: number[]
  ) {
    this.sendWorkerMessage(WarpedMapEventTypes.UPDATENEEDEDTILES, {
      size,
      extent,
      coordinateToPixelTransform
    })
  }

  async addMap(map: any) {
    const mapId = await generateChecksum(map)
    this.sendWorkerMessage(WarpedMapEventTypes.ADDMAP, { mapId, map })
  }
}
