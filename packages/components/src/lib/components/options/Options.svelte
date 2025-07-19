<script lang="ts">
  import { Slider, Checkbox, Label } from 'bits-ui'
  import Check from 'phosphor-svelte/lib/Check'

  import TransformationTypePicker from './TransformationTypePicker.svelte'
  import DistortionMeasurePicker from './DistortionMeasurePicker.svelte'
  import ProjectionPicker from './ProjectionPicker.svelte'
  import projectionsData from '$lib/shared/projections/projections.json' with { type: 'json' }
  import {
    createSearchProjectionsWithFuse,
    createSuggestProjectionsWithFlatbush
  } from '$lib/shared/projections/projections.js'

  import type { Bbox } from '@allmaps/types'

  import type { OptionsState } from './OptionsState.svelte'

  let {
    optionsState = $bindable(),
    bbox = undefined
  }: {
    optionsState: OptionsState
    bbox?: Bbox | undefined
  } = $props()

  const projections = projectionsData.map((projectionData) => {
    return {
      code: projectionData.code,
      name: 'EPSG:' + projectionData.code + ' - ' + projectionData.name,
      definition: projectionData.definition,
      bbox: projectionData.bbox as [number, number, number, number]
    }
  })

  const searchProjectionsWithFuse = createSearchProjectionsWithFuse(projections)
  const suggestProjectionsWithFlatbush =
    createSuggestProjectionsWithFlatbush(projections)
</script>

<div class="grid grid-cols-2 gap-4">
  <Label.Root
    id="visible-label"
    for="visible"
    class="text-sm content-center leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    Visible
  </Label.Root>
  <Checkbox.Root
    id="visible"
    aria-labelledby="visible-label"
    class="border-muted bg-white data-[state=unchecked]:border-border-input data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-white data-[state=unchecked]:hover:border-dark-40 peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]"
    name="visible"
    bind:checked={optionsState.visible}
  >
    {#snippet children({ checked })}
      <div class="text-white inline-flex items-center justify-center">
        {#if checked}
          <Check class="size-[15px] " weight="bold" />
        {/if}
      </div>
    {/snippet}
  </Checkbox.Root>
  <div class="text-sm content-center">
    Opacity<kbd
      class="ml-1 min-h-6 inline-flex justify-center items-center py-1 px-1.5 bg-white border border-gray-200 font-mono text-xs text-gray-800 shadow-[0px_2px_0px_0px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-md"
      >o</kbd
    >
  </div>
  <Slider.Root
    type="single"
    bind:value={optionsState.opacity}
    min={0}
    max={1}
    step={0.01}
    class="relative flex w-full touch-none select-none items-center"
  >
    <span
      class="bg-pink-200 relative h-2 grow cursor-pointer overflow-hidden rounded-full"
    >
      <Slider.Range class="bg-pink-500 absolute h-full" />
    </span>
    <Slider.Thumb
      index={0}
      class="border-border-input bg-white hover:border-pink-40 focus-visible:ring-foreground focus-visible:outline-hidden data-active:scale-[0.98] block size-[25px] cursor-pointer rounded-full border shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
    />
  </Slider.Root>
  <div class="text-sm content-center">
    Transformation Type<kbd
      class="ml-1 min-h-6 inline-flex justify-center items-center py-1 px-1.5 bg-white border border-gray-200 font-mono text-xs text-gray-800 shadow-[0px_2px_0px_0px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-md"
      >t</kbd
    >
  </div>
  <TransformationTypePicker
    bind:selectedTransformationType={optionsState.transformationType}
  ></TransformationTypePicker>
  <div class="text-sm content-center">Internal Projection</div>
  <ProjectionPicker
    {projections}
    bind:selectedProjection={optionsState.internalProjection}
    searchProjections={searchProjectionsWithFuse}
    {bbox}
    suggestProjections={suggestProjectionsWithFlatbush}
  ></ProjectionPicker>
  <div class="text-sm content-center">
    Distortion Measure<kbd
      class="ml-1 min-h-6 inline-flex justify-center items-center py-1 px-1.5 bg-white border border-gray-200 font-mono text-xs text-gray-800 shadow-[0px_2px_0px_0px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-md"
      >d</kbd
    >
  </div>
  <DistortionMeasurePicker
    bind:selectedDistortionMeasure={optionsState.distortionMeasure}
  ></DistortionMeasurePicker>
  <Label.Root
    id="render-gcps-label"
    for="render-gcps"
    class="text-sm content-center leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    Render GCPs
  </Label.Root>
  <Checkbox.Root
    id="render-gcps"
    aria-labelledby="render-gcps-label"
    class="border-muted bg-white data-[state=unchecked]:border-border-input data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-white data-[state=unchecked]:hover:border-dark-40 peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]"
    name="render-gcps"
    bind:checked={optionsState.renderGcps}
  >
    {#snippet children({ checked })}
      <div class="text-white inline-flex items-center justify-center">
        {#if checked}
          <Check class="size-[15px] " weight="bold" />
        {/if}
      </div>
    {/snippet}
  </Checkbox.Root>
  <Label.Root
    id="render-transformer-gcps-label"
    for="render-transformer-gcps"
    class="text-sm content-center leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    Render Transformed GCPs<kbd
      class="ml-1 min-h-6 inline-flex justify-center items-center py-1 px-1.5 bg-white border border-gray-200 font-mono text-xs text-gray-800 shadow-[0px_2px_0px_0px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-md"
      >p</kbd
    >
  </Label.Root>
  <Checkbox.Root
    id="render-transformer-gcps"
    aria-labelledby="render-transformer-gcps-label"
    class="border-muted bg-white data-[state=unchecked]:border-border-input data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-white data-[state=unchecked]:hover:border-dark-40 peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]"
    name="render-transformer-gcps"
    bind:checked={optionsState.renderTransformedGcps}
  >
    {#snippet children({ checked })}
      <div class="text-white inline-flex items-center justify-center">
        {#if checked}
          <Check class="size-[15px] " weight="bold" />
        {/if}
      </div>
    {/snippet}
  </Checkbox.Root>
  <Label.Root
    id="render-mask-label"
    for="render-mask"
    class="text-sm content-center leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    Render Mask
  </Label.Root>
  <Checkbox.Root
    id="render-mask"
    aria-labelledby="render-mask-label"
    class="border-muted bg-white data-[state=unchecked]:border-border-input data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-white data-[state=unchecked]:hover:border-dark-40 peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]"
    name="render-mask"
    bind:checked={optionsState.renderMask}
  >
    {#snippet children({ checked })}
      <div class="text-white inline-flex items-center justify-center">
        {#if checked}
          <Check class="size-[15px] " weight="bold" />
        {/if}
      </div>
    {/snippet}
  </Checkbox.Root>
  <Label.Root
    id="render-appliable-mask-label"
    for="render-appliable-mask"
    class="text-sm content-center leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    Render Appliable Mask<kbd
      class="ml-1 min-h-6 inline-flex justify-center items-center py-1 px-1.5 bg-white border border-gray-200 font-mono text-xs text-gray-800 shadow-[0px_2px_0px_0px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-md"
      >m</kbd
    >
  </Label.Root>
  <Checkbox.Root
    id="render-appliable-mask"
    aria-labelledby="render-appliable-mask-label"
    class="border-muted bg-white data-[state=unchecked]:border-border-input data-[state=checked]:bg-pink-500 data-[state=unchecked]:bg-white data-[state=unchecked]:hover:border-dark-40 peer inline-flex size-[25px] items-center justify-center rounded-md border transition-all duration-150 ease-in-out active:scale-[0.98]"
    name="render-appliable-mask"
    bind:checked={optionsState.renderAppliableMask}
  >
    {#snippet children({ checked })}
      <div class="text-white inline-flex items-center justify-center">
        {#if checked}
          <Check class="size-[15px] " weight="bold" />
        {/if}
      </div>
    {/snippet}
  </Checkbox.Root>
</div>
