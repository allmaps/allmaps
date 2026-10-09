import { solveLayout } from './layout-task.ts'
import type { LayoutRequest, LayoutReply } from './layout-task.ts'

self.onmessage = ({ data }: MessageEvent<LayoutRequest>) => {
  let reply: LayoutReply
  try {
    reply = { result: solveLayout(data) }
  } catch (error) {
    reply = { error: error instanceof Error ? error.message : String(error) }
  }
  self.postMessage(reply)
}
