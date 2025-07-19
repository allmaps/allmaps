import { supportedtransformationTypes } from '@allmaps/transform'
import { mergeOptions, mergeOptionsUnlessUndefined } from '@allmaps/stdlib'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'

import type { PickerProjection } from '$lib/shared/projections/projections.js'
import type { MapLibreWarpedMapLayerOptions } from '@allmaps/maplibre'

export type BindableOptions = {
  visible: boolean
  opacity: number
  transformationType: TransformationType | undefined
  internalProjection: PickerProjection | undefined
  renderGcps: boolean
  renderTransformedGcps: boolean
  renderAppliableMask: boolean
  renderMask: boolean
  distortionMeasure: DistortionMeasure | undefined
}
export type Options = BindableOptions & Partial<MapLibreWarpedMapLayerOptions>

let defaultOptions: Options = {
  visible: true,
  opacity: 1,
  transformationType: undefined,
  internalProjection: undefined,
  renderGcps: false,
  renderTransformedGcps: false,
  renderAppliableMask: false,
  renderMask: false,
  distortionMeasure: undefined
}

const usedDistortionMeasures: Array<DistortionMeasure | undefined> = [
  undefined,
  'log2sigma',
  'twoOmega'
]

export class OptionsState {
  options: Options

  visible: boolean
  opacity: number
  transformationType: TransformationType | undefined
  internalProjection: PickerProjection | undefined
  renderGcps: boolean
  renderTransformedGcps: boolean
  renderAppliableMask: boolean
  renderMask: boolean
  distortionMeasure: DistortionMeasure | undefined

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
    this.renderAppliableMask = $derived(defaultOptions.renderAppliableMask)
    this.renderMask = $derived(defaultOptions.renderMask)
    this.distortionMeasure = $derived(defaultOptions.distortionMeasure)
    this.options = $derived({
      visible: this.visible,
      opacity: this.opacity,
      transformationType: this.transformationType,
      internalProjection: this.internalProjection,
      renderGcps: this.renderGcps,
      renderTransformedGcps: this.renderTransformedGcps,
      renderAppliableMask: this.renderAppliableMask,
      renderAppliableMaskSize: this.renderAppliableMask ? 4 : undefined,
      renderMask: this.renderMask,
      renderMaskSize: this.renderMask ? 4 : undefined,
      distortionMeasure: this.distortionMeasure
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

  nextDistortionMeasure(): void {
    this.distortionMeasure =
      usedDistortionMeasures[
        (usedDistortionMeasures.findIndex(
          (distortionMeasure) => distortionMeasure === this.distortionMeasure
        ) +
          1) %
          usedDistortionMeasures.length
      ]
  }
}
