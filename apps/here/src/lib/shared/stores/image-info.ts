import { writable } from 'svelte/store'

import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

export const imageInfo = writable<ImageInformationResponse | undefined>()
