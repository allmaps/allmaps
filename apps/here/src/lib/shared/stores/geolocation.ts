import { browser } from '$app/environment'
import { writable } from 'svelte/store'

export const position = writable<GeolocationPosition>()
export const positionError = writable<GeolocationPositionError | Error>()

const options: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 27000
}

function handlePosition(newPosition: GeolocationPosition) {
  position.set(newPosition)
}

function handleError(error: GeolocationPositionError) {
  positionError.set(error)
}

if (browser && 'geolocation' in navigator) {
  // TODO: cancel watch on destroy
  navigator.geolocation.watchPosition(handlePosition, handleError, options)
} else {
  positionError.set(new Error('Geolocation API is not available'))
}
