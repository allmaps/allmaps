import { supportedtransformationTypes } from '@allmaps/transform'
import {
  mergeOptions,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'

import type { TransformationType } from '@allmaps/transform'

import type { PickerProjection } from '$lib/shared/projections/projections.js'
import type { MapLibreWarpedMapLayerOptions } from '@allmaps/maplibre'
// TODO Load Project from Project and handle fromAnnotation in Picker?

// There options must be present for the individual reactive state variables be bindable (not undefined)
export type Options = {
  visible: boolean
  opacity: number
  transformationType: TransformationType | undefined
  internalProjection: PickerProjection | undefined
  renderGcps: boolean
  renderTransformedGcps: boolean
  renderClipMask: boolean
} & Partial<MapLibreWarpedMapLayerOptions>

let defaultOptions: Options = {
  visible: true,
  opacity: 1,
  transformationType: undefined,
  internalProjection: undefined,
  renderGcps: false,
  renderTransformedGcps: false,
  renderClipMask: false
}

export class OptionsState {
  options: Options

  visible: boolean
  opacity: number
  transformationType: TransformationType | undefined
  internalProjection: PickerProjection | undefined
  renderGcps: boolean
  renderTransformedGcps: boolean
  renderClipMask: boolean

  viewOptions: Partial<Options>
  mergedOptions: Options

  constructor(
    options: Partial<Options> = {},
    viewOptions: Partial<Options> = {}
  ) {
    defaultOptions = mergeOptions(defaultOptions, options)

    this.visible = $derived(defaultOptions.visible)
    this.opacity = $derived(defaultOptions.opacity)
    this.transformationType = $derived(defaultOptions.transformationType)
    this.internalProjection = $derived(defaultOptions.internalProjection)
    this.renderGcps = $derived(defaultOptions.renderGcps)
    this.renderTransformedGcps = $derived(defaultOptions.renderTransformedGcps)
    this.renderClipMask = $derived(defaultOptions.renderClipMask)
    this.options = $derived({
      visible: this.visible,
      opacity: this.opacity,
      transformationType: this.transformationType,
      internalProjection: this.internalProjection,
      renderGcps: this.renderGcps,
      renderTransformedGcps: this.renderTransformedGcps,
      renderClipMask: this.renderClipMask
    })

    this.viewOptions = $state(viewOptions)
    this.mergedOptions = $derived(
      mergeOptionsUnlessUndefined(this.options, this.viewOptions)
    )
  }

  nextTransformationType(): void {
    this.transformationType =
      supportedtransformationTypes[
        (supportedtransformationTypes.findIndex(
          (transformationType) => transformationType === this.transformationType
        ) +
          1) %
          supportedtransformationTypes.length
      ]
  }
}
