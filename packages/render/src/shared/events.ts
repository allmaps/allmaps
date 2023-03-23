export enum WarpedMapEventType {
  WARPEDMAPADDED = 'warpedmapadded',
  WARPEDMAPREMOVED = 'warpedmapremoved',

  ZINDICESCHANGES = 'zindiceschanged',

  GEOREFANNOTATIONADDED = 'georefannotationadded',
  GEOREFANNOTATIONREMOVED = 'georefannotationremoved',

  WARPEDMAPENTER = 'warpedmapenter',
  WARPEDMAPLEAVE = 'warpedmapleave',

  TILELOADED = 'tileloaded',
  TILEREMOVED = 'tileremoved',
  TILELOADINGERROR = 'tileloadingerror',
  ALLTILESLOADED = 'alltilesloaded',

  CHANGED = 'changed'
}

export class WarpedMapEvent extends Event {
  data: any

  constructor(type: WarpedMapEventType, data?: any) {
    super(type)

    this.data = data
  }
}
