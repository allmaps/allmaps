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

  TILEFETCHED = 'tilefetched',
  TILEFETCHERROR = 'tilefetcherror',
  ALLTILESLOADED = 'alltilesloaded',

  CLEARED = 'cleared',
  CHANGED = 'changed'
}

export class WarpedMapEvent extends Event {
  data: any

  constructor(type: WarpedMapEventType, data?: any) {
    super(type)

    this.data = data
  }
}
