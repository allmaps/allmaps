import { writable } from 'svelte/store'

export type View = 'map' | 'list' | 'image'

export const view = writable<View>('map')
export const mobile = writable<boolean>(false)