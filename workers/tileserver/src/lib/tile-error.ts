export type TileErrorCode =
  | 'invalid-data'
  | 'no-maps'
  | 'map-data'
  | 'source-info'
  | 'source-image'
  | 'render-failed'

const messages: Record<TileErrorCode, string> = {
  'invalid-data': 'Invalid map data',
  'no-maps': 'No maps with enough control points',
  'map-data': 'Could not load map data',
  'source-info': 'Could not load source metadata',
  'source-image': 'Could not load or decode source image',
  'render-failed': 'Could not render map'
}

export class TileError extends Error {
  code: TileErrorCode
  status: number
  upstreamStatus?: number

  constructor(code: TileErrorCode, status = 500, options?: ErrorOptions) {
    super(messages[code], options)
    this.code = code
    this.status = status
  }
}
