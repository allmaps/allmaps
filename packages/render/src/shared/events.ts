import { AnimationOptions, SpritesInfo } from './types.js'

export const WarpedMapEventType = {
  // WarpedMapList > ...
  IMAGEINFOSADDED: 'imageinfosadded',
  WARPEDMAPADDED: 'warpedmapadded',
  WARPEDMAPREMOVED: 'warpedmapremoved',

  // Renderer > ...
  WARPEDMAPENTERED: 'warpedmapentered',
  WARPEDMAPLEFT: 'warpedmapleft',

  // WarpedMap > WarpedMapList > Renderer > ...
  IMAGELOADED: 'imageloaded',

  // Tile > TileCache
  TILEFETCHED: 'tilefetched',
  TILEFETCHERROR: 'tilefetcherror',

  // Tile > TileCache > Renderer
  TILESFROMSPRITETILE: 'tilesfromspritetile',

  // TileCache > Renderer > ...
  MAPTILELOADED: 'maptileloaded',
  MAPTILESLOADEDFROMSPRITES: 'maptilesloadedfromsprites',
  MAPTILEDELETED: 'maptiledeleted',
  FIRSTMAPTILELOADED: 'firstmaptileloaded',
  ALLREQUESTEDTILESLOADED: 'allrequestedtilesloaded',

  // WebGL2WarpedMap > WebGL2Renderer
  TEXTURESUPDATED: 'texturesupdated',

  // WarpedMapList > ...
  CLEARED: 'cleared',
  PREPARECHANGE: 'preparechange',
  IMMEDIATECHANGE: 'immediatechange',
  ANIMATEDCHANGE: 'animatedchange',

  // Renderer
  CHANGED: 'changed',
  ERROR: 'error'
} as const

export type WarpedMapEventType =
  (typeof WarpedMapEventType)[keyof typeof WarpedMapEventType]

export type WarpedMapEventData = {
  mapIds: string[]
  tileUrl: string
  optionKeys: string[]
  animationOptions: Partial<AnimationOptions>
  spritesInfo: SpritesInfo
}

export class WarpedMapEvent extends Event {
  data?: Partial<WarpedMapEventData>
  error?: Error

  constructor(type: WarpedMapEventType, data?: Partial<WarpedMapEventData>) {
    super(type)

    this.data = data
  }
}

// Similar to https://maplibre.org/maplibre-gl-js/docs/API/interfaces/MapEventType/#error
export class WarpedMapErrorEvent extends WarpedMapEvent {
  error: Error

  constructor(error: Error, data?: Partial<WarpedMapEventData>) {
    super(WarpedMapEventType.ERROR, data)

    this.error = error
  }
}
