import Layer from 'ol7/layer/Layer.js'

import type { FrameState } from 'ol7/Map.js'
import ViewHint from 'ol7/ViewHint.js'

import { WarpedMapSource } from './WarpedMapSource7.js'
import { OLWarpedMapEvent } from './OLWarpedMapEvent7.js'

import createWarpedMapLayerClass from '../shared/WarpedMapLayer.js'

export const WarpedMapLayer = createWarpedMapLayerClass<FrameState>(
  Layer,
  ViewHint,
  WarpedMapSource,
  OLWarpedMapEvent
)
