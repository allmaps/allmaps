import type { LayoutReply, LayoutRequest, LayoutResult } from './layout-task.ts'

/** Termination cancels the synchronous solver immediately. Always discard late
 * replies, and clean up the worker on success, failure, timeout or navigation. */
export function requestLayout(
  worker: Worker,
  request: LayoutRequest,
  signal: AbortSignal
): Promise<LayoutResult> {
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (error?: Error, result?: LayoutResult) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      signal.removeEventListener('abort', cancel)
      worker.onmessage = worker.onerror = worker.onmessageerror = null
      worker.terminate()
      if (error) reject(error)
      else resolve(result!)
    }
    const cancel = () =>
      finish(new DOMException('Arrangement cancelled.', 'AbortError'))
    const timeout = setTimeout(
      () =>
        finish(new Error('Arranging maps timed out. Try a smaller selection.')),
      30000
    )
    if (signal.aborted) {
      cancel()
      return
    }
    signal.addEventListener('abort', cancel, { once: true })
    worker.onmessage = ({ data }: MessageEvent<LayoutReply>) => {
      if ('error' in data) finish(new Error(data.error))
      else finish(undefined, data.result)
    }
    worker.onerror = () => finish(new Error('Could not arrange these maps.'))
    worker.onmessageerror = () =>
      finish(new Error('Could not read the arranged maps.'))
    try {
      worker.postMessage(request)
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)))
    }
  })
}
