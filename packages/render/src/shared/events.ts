export enum WarpedMapEventType {
  GEOREFERENCEANNOTATIONADDED = 'georeferenceannotationadded',
  GEOREFERENCEANNOTATIONREMOVED = 'georeferenceannotationremoved',

  WARPEDMAPADDED = 'warpedmapadded',
  WARPEDMAPREMOVED = 'warpedmapremoved',

  WARPEDMAPENTERED = 'warpedmapentered',
  WARPEDMAPLEFT = 'warpedmapleft',

  IMAGEINFOLOADED = 'imageinfoloaded',

  TILEFETCHED = 'tilefetched',
  TILEFETCHERROR = 'tilefetcherror',
  MAPTILELOADED = 'maptileloaded',
  MAPTILEREMOVED = 'maptileremoved',
  FIRSTMAPTILELOADED = 'firstmaptileloaded',
  ALLREQUESTEDTILESLOADED = 'allrequestedtilesloaded',

  TEXTURESUPDATED = 'texturesupdated',

  ZINDICESCHANGED = 'zindiceschanged',
  VISIBILITYCHANGED = 'visibilitychanged',

  PREPARECHANGE = 'preparechange',
  ANIMATEDCHANGE = 'animatedchange',
  IMMEDIATECHANGE = 'immediatechange',
  CHANGED = 'changed',

  CLEARED = 'cleared'
}

export type WarpedMapTileEventDetail = {
  mapId: string
  tileUrl: string
}

export class WarpedMapEvent extends Event {
  data?: unknown

  constructor(type: WarpedMapEventType, data?: unknown) {
    super(type)

    this.data = data
  }
}
