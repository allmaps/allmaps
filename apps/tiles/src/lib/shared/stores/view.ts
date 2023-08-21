import { writable } from 'svelte/store'

import type View from 'ol/View.js'

export const view = writable<View>()
