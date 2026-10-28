import { WarpedMapEventType } from '@allmaps/render'
import type { Page } from 'playwright'

export const SETTLE_TIME = 1000

type RenderState = {
  observedLoading: boolean
  loadedTiles: number
  pendingCaches: number
  revision: number
  quietFor: number
  error?: string
}

type ObserverWindow = Window & {
  __allmapsScreenshotRender?: { snapshot: () => RenderState }
}

/** Serialized by Playwright: keep all browser-side dependencies in this function. */
function trackRenderEvents(events: typeof WarpedMapEventType) {
  const originalDispatch = EventTarget.prototype.dispatchEvent
  const loadingCaches = new Set<EventTarget & { readonly finished?: boolean }>()
  let observedLoading = false
  let loadedTiles = 0
  let revision = 0
  let lastActivity = performance.now()
  let error: string | undefined
  const activityEvents = new Set<string>([
    events.IMAGEINFOSADDED,
    events.IMAGELOADED,
    events.WARPEDMAPADDED,
    events.WARPEDMAPREMOVED,
    events.PREPARECHANGE,
    events.IMMEDIATECHANGE,
    events.ANIMATEDCHANGE,
    events.CHANGED,
    events.CLEARED
  ])

  function changed() {
    revision++
    lastActivity = performance.now()
  }

  EventTarget.prototype.dispatchEvent = function (event: Event) {
    // Observe before forwarding: listeners may synchronously dispatch more
    // events. Preserve their ordering, receiver, event object and return value.
    if (event instanceof Event) {
      try {
        switch (event.type) {
          case events.REQUESTEDTILESLOADING:
            observedLoading = true
            loadingCaches.add(this)
            changed()
            break
          case events.ALLREQUESTEDTILESLOADED:
            loadingCaches.delete(this)
            changed()
            break
          case events.MAPTILELOADED:
          case events.MAPTILESLOADEDFROMSPRITES:
            loadedTiles++
            changed()
            break
          case events.TILEFETCHERROR:
          case events.IMAGEINFOFETCHERROR: {
            const failure = event as Event & { error?: Error }
            error ??= `${event.type}: ${failure.error?.message ?? 'Loading failed'}`
            changed()
            break
          }
          default:
            if (activityEvents.has(event.type)) changed()
        }
      } catch {
        // Instrumentation must never prevent the application's own dispatch.
        error ??= 'Could not observe render event'
      }
    }
    return originalDispatch.call(this, event)
  }

  ;(window as ObserverWindow).__allmapsScreenshotRender = {
    snapshot() {
      // TileCache.clear()/destroy() resets the public finished state without
      // emitting ALLREQUESTEDTILESLOADED. Do not retain a cancelled old view.
      for (const cache of loadingCaches) {
        if (cache.finished === true) {
          loadingCaches.delete(cache)
          changed()
        }
      }
      return {
        observedLoading,
        loadedTiles,
        pendingCaches: loadingCaches.size,
        revision,
        quietFor: performance.now() - lastActivity,
        ...(error ? { error } : {})
      }
    }
  }
}

/** Install before navigation; no application changes or network inspection. */
export async function observeRenderEvents(page: Page) {
  await page.addInitScript(trackRenderEvents, WarpedMapEventType)
}

export async function readRenderState(page: Page): Promise<RenderState> {
  const state = await page.evaluate(() =>
    (window as ObserverWindow).__allmapsScreenshotRender?.snapshot()
  )
  if (!state) throw new Error('Screenshot render observer is not installed')
  if (state.error) throw new Error(`Screenshot render failed: ${state.error}`)
  return state
}

export function renderSettled(state: RenderState) {
  return (
    state.observedLoading &&
    state.loadedTiles > 0 &&
    state.pendingCaches === 0 &&
    state.quietFor >= SETTLE_TIME
  )
}
