export enum WarpedMapEventType {
  // WarpedMapList > ...
  GEOREFERENCEANNOTATIONADDED = 'georeferenceannotationadded',
  GEOREFERENCEANNOTATIONREMOVED = 'georeferenceannotationremoved',
  WARPEDMAPADDED = 'warpedmapadded',
  WARPEDMAPREMOVED = 'warpedmapremoved',

  // Renderer > ...
  WARPEDMAPENTERED = 'warpedmapentered',
  WARPEDMAPLEFT = 'warpedmapleft',

  // WarpedMap > WarpedMapList > Renderer > ...
  IMAGELOADED = 'imageloaded',

  // Tile > TileCache
  TILEFETCHED = 'tilefetched',
  TILEFETCHERROR = 'tilefetcherror',
  SPRITESAPPLIED = 'spritesapplied',

  // TileCache > Renderer > ...
  MAPTILELOADED = 'maptileloaded',
  MAPTILEDELETED = 'maptiledeleted',
  FIRSTMAPTILELOADED = 'firstmaptileloaded',
  ALLREQUESTEDTILESLOADED = 'allrequestedtilesloaded',

  // WebGL2WarpedMap > WebGL2Renderer
  TEXTURESUPDATED = 'texturesupdated',

  // WarpedMapList > ...
  CLEARED = 'cleared',
  PREPARECHANGE = 'preparechange',
  IMMEDIATECHANGE = 'immediatechange',
  ANIMATEDCHANGE = 'animatedchange',

  // Renderer
  CHANGED = 'changed'
}

export type WarpedMapEventData = {
  mapIds: string[]
  tileUrl: string
  optionKeys: string[]
}

export class WarpedMapEvent extends Event {
  data?: Partial<WarpedMapEventData>

  constructor(type: WarpedMapEventType, data?: Partial<WarpedMapEventData>) {
    super(type)

    this.data = data
  }
}
