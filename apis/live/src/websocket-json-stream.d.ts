declare module '@teamwork/websocket-json-stream' {
  import { Duplex } from 'stream'
  import type { WebSocket } from 'ws'
  export default class WebSocketJSONStream extends Duplex {
    constructor(ws: WebSocket)
  }
}
