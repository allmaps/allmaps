import Layer from 'ol6/layer/Layer.js'

import type { FrameState } from 'ol6/PluggableMap.js'
import ViewHint from 'ol6/ViewHint.js'

import { WarpedMapSource } from './WarpedMapSource6.js'
import { OLWarpedMapEvent } from './OLWarpedMapEvent6.js'

import createWarpedMapLayerClass from '../shared/WarpedMapLayer.js'

export const WarpedMapLayer = createWarpedMapLayerClass<FrameState>(
  Layer,
  ViewHint,
  WarpedMapSource,
  OLWarpedMapEvent
)
