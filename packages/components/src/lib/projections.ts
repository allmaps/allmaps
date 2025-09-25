import type { PickerProjection } from '$lib/shared/projections/projections.js'

import {
  createBboxIndex,
  createFullTextIndex
} from '$lib/shared/projections/projections.js'

export { createFullTextIndex, createBboxIndex }

export type { PickerProjection }
