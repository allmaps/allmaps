export enum WarpedMapEventType {
  WARPEDMAPADDED = 'warpedmapadded',
  WARPEDMAPREMOVED = 'warpedmapremoved',

  // TODO: Maybe have one MAPSCHANGED event?
  ZINDICESCHANGES = 'zindiceschanged',
  PIXELMASKUPDATED = 'pixelmaskupdated',
  VISIBILITYCHANGED = 'visibilitychanged',

  GEOREFERENCEANNOTATIONADDED = 'georeferenceannotationadded',
  GEOREFERENCEANNOTATIONREMOVED = 'georeferenceannotationremoved',

  WARPEDMAPENTER = 'warpedmapenter',
  WARPEDMAPLEAVE = 'warpedmapleave',

  TILENEEDED = 'tileneeded',
  TILEADDED = 'tileadded',
  TILEREMOVED = 'tileremoved',

  // Emits when the first tile of a map is added
  FIRSTTILEADDED = 'firsttileadded',

  TILEFETCHED = 'tilefetched',
  TILEFETCHERROR = 'tilefetcherror',
  ALLTILESLOADED = 'alltilesloaded',

  CLEARED = 'cleared',
  CHANGED = 'changed'
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
