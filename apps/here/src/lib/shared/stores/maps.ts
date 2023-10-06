import { writable } from 'svelte/store'

import type { Map } from '@allmaps/annotation'

export const map = writable<Map | undefined>()
