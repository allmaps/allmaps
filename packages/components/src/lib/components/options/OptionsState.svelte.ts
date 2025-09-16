import { pick } from 'lodash-es'

import { mergeOptionsUnlessUndefined } from '@allmaps/stdlib'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'
import type { WebGL2WarpedMapOptions } from '@allmaps/render'

import type { PickerProjection } from '$lib/shared/projections/projections.js'

export const OPTIONS_TO_GET_FROM_DEFAULT = [
  'transformationType',
  'internalProjection'
]
// See also in @allmaps/render: UNDEFINED_GEOREFERENCED_MAP_OPTIONS

/**
 * Option State class
 *
 * This serves the following purposes:
 *
 * 1) Manage 'view options':
 *
 * One could set individual options on the warpedMapLayer in every component where options are set
 * (and thus pass a reference to the warpedMapLayer to every such component),
 * but it's often useful to keep track of 'view options' that are temporary and set by the view state
 * (like applying a Helmert transform when mapOrImage = 'image') and normal options that are set by the user.
 * Therefore, we keep track of both selected options and view options
 * in instances of this class and can pass them between components.
 *
 * Selected options and view options should be merged before set options on the warped map layer.
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
 * In a component showing map or layer options, we want to see the 'starting' layer options reflected,
 * but options that could be defined in an annotation (like transformationType) should be undefined.
 * We acchieve this by passing setting the default toggle values from WebGL2WarpedMap's defaults
 * and passing the default map or layer options at construnction (which can be gotten from the warpedMapLayer),
 * and processing these default options by only keeping selected options, only for MapOptionStates.
 *
 * In a component showing map options, we also want the layer options to be reflected in the map options,
 * while still be able to change individual map options later.
 * We also don't want to inherit options that are multiplied when merged, so these sliders stay independent.
 * We acchieve this by infering from a layerOptionsState, except for selected options.
 * */
export abstract class BaseOptionsState {
  defaultOptions: Partial<WebGL2WarpedMapOptions>
  processedDefaultOptions: Partial<WebGL2WarpedMapOptions>

  selectedOptions: Partial<WebGL2WarpedMapOptions>

  visible?: boolean
  opacity?: number
  transformationType?: TransformationType
  internalProjection?: PickerProjection
  renderGcps?: boolean
  renderTransformedGcps?: boolean
  renderVectors?: boolean
  renderAppliableMask?: boolean
  renderMask?: boolean
  applyMask?: boolean
  renderGrid?: boolean
  distortionMeasure?: DistortionMeasure
  removeColor?: boolean
  removeColorColor?: string
  removeColorThreshold?: number
  removeColorHardness?: number
  colorize?: boolean
  colorizeColor?: string
  debugTiles?: boolean
  debugTriangles?: boolean

  viewOptions: Partial<WebGL2WarpedMapOptions>
  options: Partial<WebGL2WarpedMapOptions>

  constructor(
    options: Partial<WebGL2WarpedMapOptions> = {},
    viewOptions: Partial<WebGL2WarpedMapOptions> = {},
    layerOptionsState?: BaseOptionsState
  ) {
    this.defaultOptions = $state(options)
    this.processedDefaultOptions = $derived(
      this.processDefaultOptions(this.defaultOptions)
    )

    // Note: don't infere from layer:
    // 'opacity',
    // 'saturation',
    // 'removeColorHardness',
    // 'removeColorThreshold'
    this.visible = $derived(
      layerOptionsState?.visible ?? this.processedDefaultOptions.visible
    )
    this.opacity = $derived(this.processedDefaultOptions.opacity)
    this.transformationType = $derived(
      layerOptionsState?.transformationType ??
        this.processedDefaultOptions.transformationType
    )
    this.internalProjection = $derived(
      layerOptionsState?.internalProjection ??
        this.processedDefaultOptions.internalProjection
    )
    this.renderGcps = $derived(
      layerOptionsState?.renderGcps ?? this.processedDefaultOptions.renderGcps
    )
    this.renderTransformedGcps = $derived(
      layerOptionsState?.renderTransformedGcps ??
        this.processedDefaultOptions.renderTransformedGcps
    )
    this.renderVectors = $derived(
      layerOptionsState?.renderVectors ??
        this.processedDefaultOptions.renderVectors
    )
    this.renderAppliableMask = $derived(
      layerOptionsState?.renderAppliableMask ??
        this.processedDefaultOptions.renderAppliableMask
    )
    this.renderMask = $derived(
      layerOptionsState?.renderMask ?? this.processedDefaultOptions.renderMask
    )
    this.applyMask = $derived(
      layerOptionsState?.applyMask ?? this.processedDefaultOptions.applyMask
    )
    this.renderGrid = $derived(
      layerOptionsState?.renderGrid ?? this.processedDefaultOptions.renderGrid
    )
    this.distortionMeasure = $derived(
      layerOptionsState?.distortionMeasure ??
        this.processedDefaultOptions.distortionMeasure
    )
    this.removeColor = $derived(
      layerOptionsState?.removeColor ?? this.processedDefaultOptions.removeColor
    )
    this.removeColorColor = $derived(
      layerOptionsState?.removeColorColor ??
        this.processedDefaultOptions.removeColorColor
    )
    this.removeColorThreshold = $derived(
      this.processedDefaultOptions.removeColorThreshold
    )
    this.removeColorHardness = $derived(
      this.processedDefaultOptions.removeColorHardness
    )
    this.colorize = $derived(
      layerOptionsState?.colorize ?? this.processedDefaultOptions.colorize
    )
    this.colorizeColor = $derived(
      layerOptionsState?.colorizeColor ??
        this.processedDefaultOptions.colorizeColor
    )
    this.debugTiles = $derived(
      layerOptionsState?.debugTiles ?? this.processedDefaultOptions.debugTiles
    )
    this.debugTriangles = $derived(
      layerOptionsState?.debugTriangles ??
        this.processedDefaultOptions.debugTriangles
    )
    this.selectedOptions = $derived({
      visible: this.visible,
      opacity: this.opacity,
      transformationType: this.transformationType,
      internalProjection: this.internalProjection,
      renderGcps: this.renderGcps,
      renderTransformedGcps: this.renderGcps || this.renderTransformedGcps,
      renderVectors: this.renderGcps || this.renderVectors,
      renderAppliableMask: this.renderAppliableMask,
      renderAppliableMaskSize: this.renderAppliableMask ? 4 : undefined,
      renderMask: this.renderMask,
      renderMaskSize: this.renderMask ? 4 : undefined,
      applyMask: this.applyMask,
      renderGrid: this.renderGrid,
      distortionMeasure: this.renderGrid ? 'log2sigma' : this.distortionMeasure,
      removeColor: this.removeColor || this.removeColorHardness != 0,
      removeColorColor: this.removeColorColor,
      removeColorThreshold: this.removeColorThreshold,
      removeColorHardness: this.removeColorHardness,
      colorize: this.colorize,
      colorizeColor: this.colorizeColor,
      debugTiles: this.debugTiles,
      debugTriangles: this.debugTriangles
    })

    this.viewOptions = $state(viewOptions)

    // Merge options and viewOptions.
    // While inheriting options from layerOptionState is done above,
    // inheriting viewOptions is done here.
    this.options = $derived(
      mergeOptionsUnlessUndefined(
        this.selectedOptions,
        mergeOptionsUnlessUndefined(
          layerOptionsState?.viewOptions ?? {},
          this.viewOptions
        )
      )
    )
  }

  abstract processDefaultOptions(
    options: Partial<WebGL2WarpedMapOptions>
  ): Partial<WebGL2WarpedMapOptions>
}

export class LayerOptionsState extends BaseOptionsState {
  constructor(
    options: Partial<WebGL2WarpedMapOptions> = {},
    viewOptions: Partial<WebGL2WarpedMapOptions> = {}
  ) {
    super(options, viewOptions)
  }

  processDefaultOptions(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: Partial<WebGL2WarpedMapOptions>
  ): Partial<WebGL2WarpedMapOptions> {
    // Don't inherit default options
    return {}
  }
}

export class MapOptionsState extends BaseOptionsState {
  mapId: string

  constructor(
    mapId: string,
    options: Partial<WebGL2WarpedMapOptions> = {},
    viewOptions: Partial<WebGL2WarpedMapOptions> = {},
    reference?: BaseOptionsState
  ) {
    super(options, viewOptions, reference)

    this.mapId = mapId
  }

  processDefaultOptions(
    options: Partial<WebGL2WarpedMapOptions>
  ): Partial<WebGL2WarpedMapOptions> {
    // Only inherit allowed options from default
    return pick(options, OPTIONS_TO_GET_FROM_DEFAULT)
  }
}
