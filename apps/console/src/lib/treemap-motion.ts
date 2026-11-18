import { cubicInOut } from 'svelte/easing'

// Coordinates are fractions of the parent, so resizing does not change the zoom.
export type ZoomBox = { x: number; y: number; width: number; height: number }
export const fullZoomBox: ZoomBox = { x: 0, y: 0, width: 1, height: 1 }
type ZoomOptions = {
  box: ZoomBox
  direction: 'forward' | 'back' | 'reset'
  reducedMotion: boolean
}

function inverse(box: ZoomBox): ZoomBox {
  return {
    x: -box.x / box.width,
    y: -box.y / box.height,
    width: 1 / box.width,
    height: 1 / box.height
  }
}

function zoom(options: ZoomOptions, entering: boolean) {
  const box =
    options.direction === 'reset'
      ? fullZoomBox
      : entering === (options.direction === 'forward')
        ? options.box
        : inverse(options.box)
  return {
    duration: options.reducedMotion
      ? 0
      : options.direction === 'reset'
        ? 160
        : 360,
    easing: cubicInOut,
    css: (t: number) => {
      const progress = 1 - t
      return `transform-origin:0 0;transform:translate(${box.x * progress * 100}%,${box.y * progress * 100}%) scale(${1 + (box.width - 1) * progress},${1 + (box.height - 1) * progress});opacity:${t}`
    }
  }
}

export const zoomEnter = (_node: Element, options: ZoomOptions) =>
  zoom(options, true)
export const zoomExit = (_node: Element, options: ZoomOptions) =>
  zoom(options, false)
