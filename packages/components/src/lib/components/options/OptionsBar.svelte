<script lang="ts">
  import { Helmert, Polynomial1, ThinPlateSpline } from '@allmaps/ui'
  import {
    CircleDashed,
    CircleHalf,
    CompassTool,
    Crop,
    Eye,
    Eyedropper,
    FrameCorners,
    Globe,
    LineSegment,
    PaintBucket,
    Resize,
    Square
  } from 'phosphor-svelte'

  import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js'
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
  import Toggle from '../ui/toggle/toggle.svelte'

  import { buttonVariants } from '$lib/components/ui/button/index.js'
  import * as Popover from '$lib/components/ui/popover/index.js'
  import Slider from '../ui/slider/slider.svelte'
  import Kbd from '../Kbd.svelte'
  import Checkbox from '../ui/checkbox/checkbox.svelte'
  import Switch from '../ui/switch/switch.svelte'

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

<div class="flex space-x-1 select-none">
  <Toggle
    class="bg-primary-foreground cursor-pointer"
    variant="outline"
    bind:pressed={optionsState.visible}
    aria-label="Visible"
    title="Make visible (v)"
  >
    <Eye />
  </Toggle>
  <Toggle
    class="bg-primary-foreground cursor-pointer"
    variant="outline"
    bind:pressed={optionsState.applyMask}
    aria-label="Crop using mask"
    title="Crop using mask (k)"
  >
    <Crop />
  </Toggle>

  <Toggle
    class="bg-primary-foreground cursor-pointer"
    variant="outline"
    bind:pressed={optionsState.renderAppliableMask}
    aria-label="Render mask"
    title="Render mask (m)"
  >
    <Square />
  </Toggle>

  <Toggle
    class="bg-primary-foreground cursor-pointer"
    variant="outline"
    bind:pressed={optionsState.renderGcps}
    aria-label="Render GCPs"
    title="Render GCPs (p)"
  >
    <LineSegment />
  </Toggle>

  <ToggleGroup.Root
    class="bg-primary-foreground cursor-pointer"
    variant="outline"
    type="single"
    bind:value={
      () => optionsState.transformationType,
      (value) => {
        optionsState.transformationType = value === '' ? undefined : value
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
        class="bg-primary-foreground cursor-pointer"
        variant="outline"
        bind:pressed={
          () => optionsState.internalProjection != undefined, (v) => {}
        }
        aria-label="Projection"
        title="Projection"
      >
        <Globe />
      </Toggle>
    </Popover.Trigger>
    <Popover.Content class="w-60">
      <ProjectionPicker />
    </Popover.Content>
  </Popover.Root>

  <Toggle
    class="bg-primary-foreground cursor-pointer"
    variant="outline"
    bind:pressed={optionsState.renderGrid}
    aria-label="Render grid"
    title="Render Grid (g)"
  >
    <CompassTool />
  </Toggle>

  <Popover.Root>
    <Popover.Trigger>
      <Toggle
        class="bg-primary-foreground cursor-pointer"
        variant="outline"
        bind:pressed={
          () =>
            optionsState.opacity != 1 ||
            optionsState.removeColorHardness != 0 ||
            optionsState.colorize,
          (v) => {}
        }
        aria-label="Opacity, remove background, colorize"
        title="Opacity (o), remove background (b), colorize (c)"
      >
        <CircleHalf />
      </Toggle>
    </Popover.Trigger>
    <Popover.Content class="w-60">
      <div class="grid grid-cols-2 gap-4">
        <h4 class="text-sm col-span-2">Opacity<Kbd key="o" /></h4>
        <Slider
          bind:value={optionsState.opacity}
          type="single"
          min={0}
          max={1}
          step={0.01}
        />
        <h4 class="text-sm col-span-2">
          Remove background<Kbd key="b" />
        </h4>
        <Slider
          bind:value={optionsState.removeColorThreshold}
          type="single"
          min={0}
          max={1}
          step={0.01}
        />
        <input type="color" bind:value={optionsState.removeColorColor} />
        <h4 class="text-sm col-span-2">
          Colorize<Kbd key="c" />
        </h4>
        <Switch bind:checked={optionsState.colorize}></Switch>
        <input type="color" bind:value={optionsState.colorizeColor} />
      </div>
    </Popover.Content>
  </Popover.Root>
</div>
