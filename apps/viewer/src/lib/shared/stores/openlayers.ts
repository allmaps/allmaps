import { writable } from 'svelte/store'

import type Map from 'ol/Map.js'

let initialOl: Map | undefined

export const ol = writable<Map | undefined>(initialOl)
