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

  PRECHANGE = 'prechange',
  OPTIONSCHANGED = 'optionschanged',
  ZINDICESCHANGED = 'zindiceschanged',
  RESOURCEMASKCHANGED = 'resourcemaskchanged',
  GCPSCHANGED = 'gcpschanged',
  VISIBILITYCHANGED = 'visibilitychanged',
  TRANSFORMATIONCHANGED = 'transformationchanged',
  DISTORTIONCHANGED = 'distortionchanged',
  INTERNALPROJECTIONCHANGED = 'internalprojectionchanged',
  PROJECTIONCHANGED = 'projectionchanged',

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
