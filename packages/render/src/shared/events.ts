export enum WarpedMapEventType {
  GEOREFERENCEANNOTATIONADDED = 'georeferenceannotationadded',
  GEOREFERENCEANNOTATIONREMOVED = 'georeferenceannotationremoved',

  WARPEDMAPADDED = 'warpedmapadded',
  WARPEDMAPREMOVED = 'warpedmapremoved',

  WARPEDMAPENTER = 'warpedmapenter',
  WARPEDMAPLEAVE = 'warpedmapleave',

  IMAGEINFOLOADED = 'imageinfoloaded',

  TILEFETCHED = 'tilefetched',
  TILEFETCHERROR = 'tilefetcherror',
  MAPTILELOADED = 'maptileloaded',
  MAPTILEREMOVED = 'maptileremoved',
  FIRSTMAPTILELOADED = 'firstmaptileloaded',
  ALLREQUESTEDTILESLOADED = 'allrequestedtilesloaded',

  TEXTURESUPDATED = 'texturesupdated',

  // TODO: Maybe have one OPTIONSCHANGED event?
  ZINDICESCHANGES = 'zindiceschanged',
  RESOURCEMASKUPDATED = 'resourcemaskupdated',
  VISIBILITYCHANGED = 'visibilitychanged',
  TRANSFORMATIONCHANGED = 'transformationchanged',
  DISTORTIONCHANGED = 'distortionchanged',

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
