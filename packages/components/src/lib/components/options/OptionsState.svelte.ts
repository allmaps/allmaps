import { mergeOptions, mergeOptionsUnlessUndefined } from '@allmaps/stdlib'
import { WebGL2WarpedMap } from '@allmaps/render'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'

import type { PickerProjection } from '$lib/shared/projections/projections.js'
import type { MapLibreWarpedMapLayerOptions } from '@allmaps/maplibre'

export const OPTIONS_NOT_TO_GET_FROM_REFERENCE = {
  opacity: undefined,
  saturation: undefined,
  removeColorHardness: undefined,
  removeColorThreshold: undefined
}
export const OPTIONS_NOT_TO_GET_FROM_DEFAULT = {
  transformationType: undefined,
  internalProjection: undefined
}
// See also in @allmaps/render: UNDEFINED_GEOREFERENCED_MAP_OPTIONS

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
 * This serves the following purposes:
 *
 * 1) Manage 'view options':
 *
 * One could set individual options on the warpedMapLayer in every component where options are set
 * (and this pass a reference to the warpedMapLayer to every such component),
 * but it's often useful to keep track of 'view options' that are temporary and set by the view state
 * (like applying a Helmert transform when mapOrImage = 'image') and normal options that are set by the user.
 * Therefore, we keep track of both in instances of this class and can pass them between components.
 *
 * View options should be merged before set options on the warped map layer.
 *
 * 2) Have both a reactive 'options' object and reactive individual options:
 *
 * One might think a simpler approach is to express all options in a reactive 'options' object
 * and pass this between components, but this doesn't work:
 * in a component were options are set (like 'Options') we can't have
 * sub-components (like checkboxes) bind to separate properties (like 'options.visible'),
 * while at the same time gathering the results back into one object (like 'options')
 * and passing that throught to the parent component (like 'Viewer') that binds to it.
 *
 * See also https://github.com/sveltejs/svelte/issues/12451
 *
 * Therefore instances of this class have reactive properties that keep track of the options
 * using individual bindable state properties and a derived 'options' property
 * that can be passed upwards and bound to.
 *
 * The individual properties are set from defaults and constructor input
 * and can be altered by the user in components, the latter are derived from the former.
 *
 * 3) Show correct starting and evolving map and layer options in components
 *
 * In a component showing layer options, we want to see the 'starting' layer options reflected,
 * but options that could be defined in an annotation (like transformationType) should be undefined.
 * We acchieve this by passing the 'starting' options at construnction (which can be gotten from the warpedMapLayer),
 * merging with WebGL2WarpedMapOptions as default,
 * and processing these default options by omitting the selected ones.
 *
 * In a component showing map options, we want to see the 'starting' map options reflected,
 * and once layer options change, we want these to be reflected in the map options,
 * while still be able to change individual map options later.
 * We also don't want to inherit options that are multiplied when merged, so these sliders stay independent.
 * We acchieve this by passing the 'starting' options at construnction (which can be gotten from the warpedMapLayer),
 * merging with WebGL2WarpedMapOptions as default (without omiting like above),
 * and then infering from a reference optionsState of the layer,
 * and processing these inherited options by omitting the selected ones.
 * */
export class OptionsState {
  defaultOptions: Options
  reference: Options

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

  viewOptions: Partial<Options>

  constructor(
    options: Partial<BindableOptions> = {},
    viewOptions: Partial<Options> = {},
    reference?: OptionsState
  ) {
    this.defaultOptions = mergeOptions(
      WebGL2WarpedMap.getDefaultOptions(),
      options
    )
    this.reference = $derived(
      mergeOptionsUnlessUndefined(
        this.processDefaultOptions(this.defaultOptions),
        this.processReferenceOptions(reference?.options)
      )
    )
    this.visible = $derived(this.reference.visible)
    this.opacity = $derived(this.reference.opacity)
    this.transformationType = $derived(this.reference.transformationType)
    this.internalProjection = $derived(this.reference.internalProjection)
    this.renderGcps = $derived(this.reference.renderGcps)
    this.renderTransformedGcps = $derived(this.reference.renderTransformedGcps)
    this.renderVectors = $derived(this.reference.renderVectors)
    this.renderAppliableMask = $derived(this.reference.renderAppliableMask)
    this.renderMask = $derived(this.reference.renderMask)
    this.distortionMeasure = $derived(this.reference.distortionMeasure)
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
  }

  processDefaultOptions(options: Partial<Options>): Partial<Options> {
    mergeOptions(options, OPTIONS_NOT_TO_GET_FROM_DEFAULT)
  }

  processReferenceOptions(options: Partial<Options>): Partial<Options> {
    mergeOptions(options, OPTIONS_NOT_TO_GET_FROM_REFERENCE)
  }
}

export class MapOptionsState extends OptionsState {
  constructor(
    options: Partial<BindableOptions> = {},
    viewOptions: Partial<Options> = {},
    reference?: OptionsState
  ) {
    super(options, viewOptions, reference)
  }

  processDefaultOptions(options: Partial<Options>): Partial<Options> {
    options
  }
}
