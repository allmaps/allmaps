export enum WarpedMapEventType {
  WARPEDMAPADDED = 'warpedmapadded',
  WARPEDMAPREMOVED = 'warpedmapremoved',

  // TODO: Maybe have one MAPSCHANGED event?
  ZINDICESCHANGES = 'zindiceschanged',
  RESOURCEMASKUPDATED = 'resourcemaskupdated',
  VISIBILITYCHANGED = 'visibilitychanged',
  TRANSFORMATIONCHANGED = 'transformationchanged',

  GEOREFERENCEANNOTATIONADDED = 'georeferenceannotationadded',
  GEOREFERENCEANNOTATIONREMOVED = 'georeferenceannotationremoved',

  WARPEDMAPENTER = 'warpedmapenter',
  WARPEDMAPLEAVE = 'warpedmapleave',

  IMAGEINFONEEDED = 'imageinfoneeded',
  IMAGEINFOLOADED = 'imageinfoloaded',

  TILEFETCHED = 'tilefetched',
  TILEFETCHERROR = 'tilefetcherror',
  MAPTILELOADED = 'maptileloaded',
  MAPTILEREMOVED = 'maptileremoved',
  FIRSTMAPTILELOADED = 'firstmaptileloaded',
  ALLREQUESTEDTILESLOADED = 'allrequestedtilesloaded',

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
