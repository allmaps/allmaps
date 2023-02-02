import { writable } from 'svelte/store'

export const error = writable<Error | null>(null)
