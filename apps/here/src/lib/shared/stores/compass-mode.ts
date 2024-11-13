import { writable, get } from 'svelte/store'

import { hasOrientation } from './orientation.js'

type CompassMode = 'image' | 'north' | 'follow-orientation' | 'custom'

export const compassMode = writable<CompassMode>('image')

export function nextCompassMode() {
  const $compassMode = get(compassMode)

  if ($compassMode === 'image') {
    compassMode.set('north')
  } else if ($compassMode === 'north') {
    if (get(hasOrientation)) {
      compassMode.set('follow-orientation')
    } else {
      compassMode.set('image')
    }
  } else {
    compassMode.set('image')
  }
}
