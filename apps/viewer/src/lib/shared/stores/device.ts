import { browser } from '$app/environment'
import { writable } from 'svelte/store'

export const hasTouch = writable<boolean | undefined>()

if (browser) {
  // See:
  //  - https://css-tricks.com/touch-devices-not-judged-size/
  //  - https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
  hasTouch.set(window.matchMedia('(pointer: coarse)').matches)
}
