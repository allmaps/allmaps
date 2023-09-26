import Layer from 'ol8/layer/Layer.js'

import type { FrameState } from 'ol8/Map.js'
import ViewHint from 'ol8/ViewHint.js'

import { WarpedMapSource } from './WarpedMapSource8.js'
import { OLWarpedMapEvent } from './OLWarpedMapEvent8.js'

import createWarpedMapLayerClass from '../shared/WarpedMapLayer.js'

export const WarpedMapLayer = createWarpedMapLayerClass<FrameState>(
  Layer,
  ViewHint,
  WarpedMapSource,
  OLWarpedMapEvent
)
