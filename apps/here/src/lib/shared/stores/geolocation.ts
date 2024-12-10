import { browser } from '$app/environment'
import { writable } from 'svelte/store'

export const position = writable<GeolocationPosition>()

import { error } from '$lib/shared/stores/error.js'

const options: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 30000,
  timeout: 27000
}

function handlePosition(newPosition: GeolocationPosition) {
  position.set(newPosition)
}

function handleError(err: GeolocationPositionError) {
  error.set(err)
}

if (browser && 'geolocation' in navigator) {
  // TODO: cancel watch on destroy
  navigator.geolocation.watchPosition(handlePosition, handleError, options)
} else {
  error.set(new Error('Geolocation API is not available'))
}
