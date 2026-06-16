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
  IMAGEINFOFETCHERROR: 'imageinfofetcherror',

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
  REQUESTEDTILESLOADING: 'requestedtilesloading',
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
  imageId: string
  imageInfoUrl: string
  errorKind: string
  corsLikely: boolean
  status: number
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

  constructor(
    error: Error,
    data?: Partial<WarpedMapEventData>,
    type: WarpedMapEventType = WarpedMapEventType.ERROR
  ) {
    super(type, data)

    this.error = error
  }
}
