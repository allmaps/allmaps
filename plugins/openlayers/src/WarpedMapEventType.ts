export enum WarpedMapEventTypes {
  ADDMAP = 'addmap',
  WARPEDMAPADDED = 'warpedmapadded',

  UPDATENEEDEDTILES =  'updateneededtiles',

  WARPEDMAPENTEREXTENT = 'warpedmapenterextent',
  WARPEDMAPLEAVEEXTENT = 'warpedmapleaveextent',

  TILENEEDED = 'tileneeded',
  TILEUNNEEDED = 'tileunneeded',
  TILELOADED = 'tileloaded',
  TILELOADINGERROR = 'tileloadingerror',

  TILESCHANGED = 'tileschanged'
}
