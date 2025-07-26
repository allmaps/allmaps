<script lang="ts">
  import { Helmert, Polynomial1, ThinPlateSpline } from '@allmaps/ui'
  import {
    CircleHalf,
    CompassTool,
    Eye,
    EyeClosed,
    EyeSlash,
    Globe,
    LineSegment,
    Square,
    SquareLogo
  } from 'phosphor-svelte'

  import ProjectionPicker from './ProjectionPicker.svelte'
  import Kbd from '../Kbd.svelte'
  import * as ToggleGroup from '../ui/toggle-group/index.js'
  import * as Popover from '../ui/popover/index.js'
  import Slider from '../ui/slider/slider.svelte'
  import Switch from '../ui/switch/switch.svelte'
  import Toggle from '../ui/toggle/toggle.svelte'
  import Menubar from '../ui/menubar/menubar.svelte'

  import type { Bbox } from '@allmaps/types'

  import type { PickerProjection } from '$lib/shared/projections/projections'
  import type { OptionsState } from './OptionsState.svelte'
  import type { TransformationType } from '@allmaps/transform'

  let {
    optionsState = $bindable(),
    projections,
    searchProjections,
    geoBbox = undefined,
    suggestProjections = undefined
  }: {
    optionsState: OptionsState
    projections: PickerProjection[]
    searchProjections?: (s: string) => PickerProjection[]
    geoBbox?: Bbox
    suggestProjections?: (b: Bbox) => PickerProjection[]
  } = $props()
</script>

<div class="flex select-none w-fit">
  <Toggle
    class="cursor-pointer"
    bind:pressed={
      () => !optionsState.visible,
      (v) => {
        optionsState.visible = !v
      }
    }
    aria-label="Hide"
    title="Hide (h)"
  >
    {#if optionsState.visible}
      <Eye />
    {/if}
    {#if !optionsState.visible}
      <EyeSlash />
    {/if}
  </Toggle>
  <Toggle
    class="cursor-pointer"
    bind:pressed={
      () => !optionsState.applyMask,
      (v) => {
        optionsState.applyMask = !v
      }
    }
    aria-label="Show full image"
    title="Show full image (f)"
  >
    <SquareLogo />
  </Toggle>

  <Toggle
    class="cursor-pointer"
    bind:pressed={optionsState.renderAppliableMask}
    aria-label="Show mask"
    title="Show mask (m)"
  >
    <Square />
  </Toggle>

  <Toggle
    class="cursor-pointer"
    bind:pressed={optionsState.renderGcps}
    aria-label="Show GCPs"
    title="Show GCPs (p)"
  >
    <LineSegment />
  </Toggle>

  <ToggleGroup.Root
    class="cursor-pointer"
    type="single"
    bind:value={
      () => optionsState.transformationType,
      (value: string | undefined) => {
        optionsState.transformationType =
          value == '' ? undefined : (value as TransformationType)
      }
    }
  >
    <ToggleGroup.Item
      value="helmert"
      aria-label="Use Helmert transformation"
      title="Use Helmert transformation (t)"
    >
      <div class="size-5">
        <Helmert />
      </div>
    </ToggleGroup.Item>
    <ToggleGroup.Item
      value="polynomial"
      aria-label="Use polynomial transformation"
      title="Use polynomial transformation (t)"
    >
      <div class="size-5">
        <Polynomial1 />
      </div>
    </ToggleGroup.Item>
    <ToggleGroup.Item
      value="thinPlateSpline"
      aria-label="Use Thin-Plate-Spline transformation"
      title="Use Thin-Plate-Spline transformation (t)"
    >
      <div class="size-5">
        <ThinPlateSpline />
      </div>
    </ToggleGroup.Item>
  </ToggleGroup.Root>

  <Popover.Root>
    <Popover.Trigger>
      <Toggle
        class="cursor-pointer"
        bind:pressed={
          () => optionsState.internalProjection != undefined, (v) => {}
        }
        aria-label="Use projection"
        title="Use projection"
      >
        <Globe weight="light" />
      </Toggle>
    </Popover.Trigger>
    <Popover.Content
      sideOffset={10}
      class="w-60 p-0 border-none bg-transparent shadow-none"
    >
      <ProjectionPicker
        {projections}
        bind:selectedProjection={optionsState.internalProjection}
        {searchProjections}
        {geoBbox}
        {suggestProjections}
      ></ProjectionPicker>
    </Popover.Content>
  </Popover.Root>

  <Toggle
    class="cursor-pointer"
    bind:pressed={optionsState.renderGrid}
    aria-label="Show grid"
    title="Show grid (g)"
  >
    <CompassTool />
  </Toggle>

  <Popover.Root>
    <Popover.Trigger>
      <Toggle
        class="cursor-pointer"
        bind:pressed={
          () =>
            optionsState.opacity !== 1 ||
            optionsState.removeColorThreshold !== 0 ||
            optionsState.colorize,
          (v) => {}
        }
        aria-label="Opacity, remove background, colorize"
        title="Opacity (o), remove background (b), colorize (c)"
      >
        <CircleHalf />
      </Toggle>
    </Popover.Trigger>
    <Popover.Content class="w-90" sideOffset={10}>
      <div class="grid grid-cols-6 gap-4">
        <h4 class="text-sm col-span-3">Opacity<Kbd key="o" /></h4>
        <Slider
          bind:value={optionsState.opacity}
          type="single"
          min={0}
          max={1}
          step={0.01}
          class="col-span-2"
        />
        <div></div>
        <h4 class="text-sm col-span-3">
          Remove background<Kbd key="b" />
        </h4>
        <Slider
          bind:value={optionsState.removeColorThreshold}
          type="single"
          min={0}
          max={1}
          step={0.01}
          class="col-span-2"
        />
        <input type="color" bind:value={optionsState.removeColorColor} />
        <h4 class="text-sm col-span-3">
          Colorize<Kbd key="c" />
        </h4>
        <Switch bind:checked={optionsState.colorize} class="col-span-2"
        ></Switch>
        <input type="color" bind:value={optionsState.colorizeColor} />
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
