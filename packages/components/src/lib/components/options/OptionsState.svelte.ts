import {
  mergeOptions,
  mergeOptionsUnlessUndefined,
  objectOmitDifference
} from '@allmaps/stdlib'
import { WebGL2WarpedMap } from '@allmaps/render'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'

import type { PickerProjection } from '$lib/shared/projections/projections.js'
import type { MapLibreWarpedMapLayerOptions } from '@allmaps/maplibre'
import { removeUndefinedOptions } from '../../../../../stdlib/src/options'

export type BindableOptions = {
  visible: boolean
  opacity: number
  transformationType: TransformationType | undefined
  internalProjection: PickerProjection | undefined
  renderGcps: boolean
  renderTransformedGcps: boolean
  renderVectors: boolean
  renderAppliableMask: boolean
  renderMask: boolean
  distortionMeasure: DistortionMeasure | undefined
}
export type Options = BindableOptions & Partial<MapLibreWarpedMapLayerOptions>

/**
 * Option State class
 *
 * Instances of this class are reactive objects that keep track of the options
 * using individual bindable state variables and a derived 'options' variable
 * that can be passed upwards.
 *
 * This mainly exists because in a component (like 'Options') we can't have
 * sub-components (like checkboxes) bind to separate properties (like 'visible'),
 * while at the same time gathering the results back into one object (like 'options')
 * and passing that throught to the parent component (like 'Viewer').
 *
 * See also https://github.com/sveltejs/svelte/issues/12451
 */
export class OptionsState {
  options: Options

  visible: boolean
  opacity: number
  transformationType: TransformationType | undefined
  internalProjection: PickerProjection | undefined
  renderGcps: boolean
  renderTransformedGcps: boolean
  renderVectors: boolean
  renderAppliableMask: boolean
  renderMask: boolean
  distortionMeasure?: DistortionMeasure | undefined

  // View options are temporary options
  viewOptions: Partial<Options>
  // Merged options include view options
  mergedOptions: Partial<Options>

  constructor(
    options: Partial<BindableOptions> = {},
    viewOptions: Partial<Options> = {}
  ) {
    const defaultOptions = mergeOptions(
      WebGL2WarpedMap.getDefaultOptions(),
      options
    )

    this.visible = $derived(defaultOptions.visible)
    this.opacity = $derived(defaultOptions.opacity)
    this.transformationType = $derived(defaultOptions.transformationType)
    this.internalProjection = $derived(defaultOptions.internalProjection)
    this.renderGcps = $derived(defaultOptions.renderGcps)
    this.renderTransformedGcps = $derived(defaultOptions.renderTransformedGcps)
    this.renderVectors = $derived(defaultOptions.renderVectors)
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
      renderVectors: this.renderVectors,
      renderAppliableMask: this.renderAppliableMask,
      renderAppliableMaskSize: this.renderAppliableMask ? 4 : undefined,
      renderMask: this.renderMask,
      renderMaskSize: this.renderMask ? 4 : undefined,
      distortionMeasure: this.distortionMeasure
    })

    this.viewOptions = $state(viewOptions)

    this.mergedOptions = $derived(
      objectOmitDifference(
        mergeOptionsUnlessUndefined(this.options, this.viewOptions),
        defaultOptions
      )
    )
  }

  /**
   * Set the options
   */
  setOptions(options: Partial<BindableOptions>) {
    // Note: set options like this to
    // 1) only set options that are present
    // 2) also set undefined options set options that are present
    // 3) maintain the reactive variables

    if (options.visible) {
      this.visible = options.visible
    }
    if (options.transformationType) {
      this.transformationType = options.transformationType
    }
    if (options.internalProjection) {
      this.internalProjection = options.internalProjection
    }
    if (options.renderGcps) {
      this.renderGcps = options.renderGcps
    }
    if (options.renderTransformedGcps) {
      this.renderTransformedGcps = options.renderTransformedGcps
    }
    if (options.renderVectors) {
      this.renderVectors = options.renderVectors
    }
    if (options.renderAppliableMask) {
      this.renderAppliableMask = options.renderAppliableMask
    }
    if (options.renderMask) {
      this.renderMask = options.renderMask
    }
    if (options.distortionMeasure) {
      this.distortionMeasure = options.distortionMeasure
    }
  }
}
