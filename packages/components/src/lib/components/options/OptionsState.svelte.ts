import { supportedtransformationTypes } from '@allmaps/transform'
import { mergeOptions, mergePartialOptions } from '@allmaps/stdlib'

import type { TransformationType } from '@allmaps/transform'

import type { ViewerComponentOptions } from '../Viewer.svelte'
import type { Projection } from '$lib/shared/projections/projections.js'
// TODO Load Project from Project and handle fromAnnotation in Picker?

export type TransformationTypeWithFromAnnotation =
  | TransformationType
  | 'fromAnnotation'
export type OptionsWithFromAnnotation = Omit<
  ViewerComponentOptions,
  'transformationType'
> & {
  transformationType: TransformationTypeWithFromAnnotation
}

// There options must be present for the individual reactive state variables be bindable (not undefined)
export type BindableOptions = {
  visible: boolean
  opacity: number
  transformationType: TransformationTypeWithFromAnnotation
  internalProjection: Projection
}

export type Options = Partial<OptionsWithFromAnnotation> & BindableOptions

const transformationTypesWithFromAnnotation = [
  ...supportedtransformationTypes,
  'fromAnnotation'
] as TransformationTypeWithFromAnnotation[]

let defaultOptions: Options = {
  visible: true,
  opacity: 1,
  transformationType: 'fromAnnotation',
  internalProjection: {
    definition: 'fromAnnotation',
    code: 'fromAnnotation',
    name: 'fromAnnotation'
  }
}

export function deleteFromAnnotationOptions(
  optionsWithFromAnnotation: Partial<OptionsWithFromAnnotation>
): Partial<ViewerComponentOptions> {
  if (!optionsWithFromAnnotation) {
    return {}
  }
  const options = optionsWithFromAnnotation
  if (options.transformationType === 'fromAnnotation') {
    delete options.transformationType
  }
  if (options.internalProjection?.definition === 'fromAnnotation') {
    delete options.internalProjection
  }
  return options as Partial<ViewerComponentOptions>
}

export class OptionsState {
  options: Options

  visible: boolean
  opacity: number
  transformationType: TransformationTypeWithFromAnnotation
  internalProjection: Projection

  viewOptions = $state<Partial<OptionsWithFromAnnotation>>()
  mergedOptions

  constructor(
    options: Partial<OptionsWithFromAnnotation> = {},
    viewOptions: Partial<OptionsWithFromAnnotation> = {}
  ) {
    defaultOptions = mergeOptions(defaultOptions, options)

    this.visible = $derived(defaultOptions.visible)
    this.opacity = $derived(defaultOptions.opacity)
    this.transformationType = $derived(defaultOptions.transformationType)
    this.internalProjection = $derived(defaultOptions.internalProjection)
    this.options = $derived({
      visible: this.visible,
      opacity: this.opacity,
      transformationType: this.transformationType,
      internalProjection: this.internalProjection
    })

    this.viewOptions = viewOptions
    this.mergedOptions = $derived(
      mergePartialOptions(this.options, this.viewOptions)
    )
  }

  nextTransformationType(): void {
    this.transformationType =
      transformationTypesWithFromAnnotation[
        (transformationTypesWithFromAnnotation.findIndex(
          (transformationType) => transformationType === this.transformationType
        ) +
          1) %
          transformationTypesWithFromAnnotation.length
      ]
  }
}
