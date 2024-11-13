import { writable, derived } from 'svelte/store'

type Orientation = {
  alpha: number | null
  beta: number | null
  gamma: number | null
  absolute: boolean
}

export const orientation = writable<Orientation | undefined>()
export const hasOrientation = derived(
  orientation,
  ($orientation) => $orientation !== undefined && $orientation.alpha !== null
)

export const orientationAlpha = derived(orientation, ($orientation) => {
  if ($orientation !== undefined && $orientation.alpha !== null) {
    return $orientation.alpha
  }
})

function handleDeviceOrientation(event: DeviceOrientationEvent) {
  orientation.set({
    alpha: event.alpha,
    beta: event.beta,
    gamma: event.gamma,
    absolute: event.absolute
  })
}

if (window.DeviceOrientationEvent) {
  window.addEventListener('deviceorientation', handleDeviceOrientation)
}
