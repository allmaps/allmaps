import { writable } from 'svelte/store'

export type View = 'map' | 'image'

let initialView: View = 'map'

export const view = writable<View>(initialView)
