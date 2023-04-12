import { writable } from 'svelte/store'

export type View = 'map' | 'list' | 'image'

let initialView: View = 'map'

export const view = writable<View>(initialView)
