<script lang="ts">
  import { Slider, Checkbox, Label } from 'bits-ui'
  import Check from 'phosphor-svelte/lib/Check'

  import TransformationTypePicker from './TransformationTypePicker.svelte'
  import DistortionMeasurePicker from './DistortionMeasurePicker.svelte'
  import ProjectionPicker from './ProjectionPicker.svelte'
  import Kbd from '../Kbd.svelte'

  import type { Bbox } from '@allmaps/types'

  import type { PickerProjection } from '$lib/shared/projections/projections'
  import type { LayerOptionsState } from './OptionsState.svelte'

  let {
    optionsState = $bindable(),
    projections,
    searchProjections,
    geoBbox = undefined,
    suggestProjections = undefined
  }: {
    optionsState: LayerOptionsState
    projections: PickerProjection[]
    searchProjections?: (s: string) => PickerProjection[]
    geoBbox?: Bbox
    suggestProjections?: (b: Bbox) => PickerProjection[]
  } = $props()
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
    Opacity<Kbd key="o"></Kbd>
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
    Transformation Type<Kbd key="t"></Kbd>
  </div>
  <TransformationTypePicker
    bind:selectedTransformationType={optionsState.transformationType}
  ></TransformationTypePicker>
  <div class="text-sm content-center">Internal Projection</div>
  <ProjectionPicker
    {projections}
    bind:selectedProjection={optionsState.internalProjection}
    {searchProjections}
    {geoBbox}
    {suggestProjections}
  ></ProjectionPicker>
  <div class="text-sm content-center">
    Distortion Measure<Kbd key="d"></Kbd>
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
    Render Transformed GCPs<Kbd key="p"></Kbd>
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
    Render Appliable Mask<Kbd key="m"></Kbd>
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
