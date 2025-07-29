<script lang="ts">
  import {
    CircleHalf,
    CompassTool,
    Eye,
    EyeSlash,
    Globe,
    LineSegment,
    Square,
    SquareLogo
  } from 'phosphor-svelte'
  import { Helmert, Polynomial1, ThinPlateSpline } from '@allmaps/ui'
  import { WebGL2WarpedMap } from '@allmaps/render'

  import ProjectionPicker from './ProjectionPicker.svelte'
  import Kbd from './Kbd.svelte'
  import * as ToggleGroup from '../ui/toggle-group/index.js'
  import * as Tooltip from '../ui/tooltip/index.js'
  import * as Popover from '../ui/popover/index.js'
  import Slider from '../ui/slider/slider.svelte'
  import Switch from '../ui/switch/switch.svelte'
  import Toggle from '../ui/toggle/toggle.svelte'

  import type { Bbox } from '@allmaps/types'

  import type { PickerProjection } from '$lib/shared/projections/projections'
  import type { LayerOptionsState } from './OptionsState.svelte'
  import type { TransformationType } from '@allmaps/transform'

  let defaultWebGL2Options = WebGL2WarpedMap.getDefaultOptions()

  let {
    optionsState = $bindable(),
    projections,
    searchProjections,
    geoBbox = undefined,
    suggestProjections = undefined,
    showTooltips = true,
    showKeys = false
  }: {
    optionsState: LayerOptionsState
    projections: PickerProjection[]
    searchProjections?: (s: string) => PickerProjection[]
    geoBbox?: Bbox
    suggestProjections?: (b: Bbox) => PickerProjection[]
    showTooltips?: boolean
    showKeys?: boolean
  } = $props()
</script>

<div class="flex select-none w-fit">
  <Tooltip.Provider disabled={!showTooltips}>
    <Tooltip.Root>
      <Tooltip.Trigger>
        <Toggle
          class="cursor-pointer"
          bind:pressed={
            () => !(optionsState.visible ?? defaultWebGL2Options.visible),
            (v) => {
              optionsState.visible = !v
            }
          }
          aria-label="Hide"
        >
          {#if optionsState.visible ?? defaultWebGL2Options.visible}
            <Eye />
          {:else}
            <EyeSlash />
          {/if}
        </Toggle>
      </Tooltip.Trigger>
      <Tooltip.Content>
        Hide <Kbd show={showKeys} key="h" />
      </Tooltip.Content>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        <Toggle
          class="cursor-pointer"
          bind:pressed={
            () => !(optionsState.applyMask ?? defaultWebGL2Options.applyMask),
            (v) => {
              optionsState.applyMask = !v
            }
          }
          aria-label="Show full image"
        >
          <SquareLogo />
        </Toggle>
      </Tooltip.Trigger>
      <Tooltip.Content>
        Show full image <Kbd show={showKeys} key="f" />
      </Tooltip.Content>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        <Toggle
          class="cursor-pointer"
          bind:pressed={
            () =>
              optionsState.renderAppliableMask ??
              defaultWebGL2Options.renderAppliableMask,
            (v) => {
              optionsState.renderAppliableMask = v
            }
          }
          aria-label="Show mask"
        >
          <Square />
        </Toggle>
      </Tooltip.Trigger>
      <Tooltip.Content>
        Show mask <Kbd show={showKeys} key="m" />
      </Tooltip.Content>
    </Tooltip.Root>

    <Tooltip.Root>
      <Tooltip.Trigger>
        <Toggle
          class="cursor-pointer"
          bind:pressed={
            () => optionsState.renderGcps ?? defaultWebGL2Options.renderGcps,
            (v) => {
              optionsState.renderGcps = v
            }
          }
          aria-label="Show GCPs"
        >
          <LineSegment />
        </Toggle>
      </Tooltip.Trigger>
      <Tooltip.Content>
        Show GCPs <Kbd show={showKeys} key="p" />
      </Tooltip.Content>
    </Tooltip.Root>

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
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ToggleGroup.Item
            value="helmert"
            aria-label="Use Helmert transformation"
          >
            <div class="size-5">
              <Helmert />
            </div>
          </ToggleGroup.Item>
        </Tooltip.Trigger>
        <Tooltip.Content>
          Use Helmert transformation <Kbd show={showKeys} key="t" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ToggleGroup.Item
            value="polynomial"
            aria-label="Use polynomial transformation"
          >
            <div class="size-5">
              <Polynomial1 />
            </div>
          </ToggleGroup.Item>
        </Tooltip.Trigger>
        <Tooltip.Content>
          Use polynomial transformation <Kbd show={showKeys} key="t" />
        </Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ToggleGroup.Item
            value="thinPlateSpline"
            aria-label="Use Thin-Plate-Spline transformation"
          >
            <div class="size-5">
              <ThinPlateSpline />
            </div>
          </ToggleGroup.Item>
        </Tooltip.Trigger>
        <Tooltip.Content>
          Use Thin-Plate-Spline transformation <Kbd show={showKeys} key="t" />
        </Tooltip.Content>
      </Tooltip.Root>
    </ToggleGroup.Root>

    <Popover.Root>
      <Popover.Trigger>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Toggle
              class="cursor-pointer"
              bind:pressed={
                () => optionsState.internalProjection != undefined, () => {}
              }
              aria-label="Use projection"
            >
              <Globe weight="light" />
            </Toggle>
          </Tooltip.Trigger>
          <Tooltip.Content>Use projection</Tooltip.Content>
        </Tooltip.Root>
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

    <Tooltip.Root>
      <Tooltip.Trigger>
        <Toggle
          class="cursor-pointer"
          bind:pressed={
            () => optionsState.renderGrid ?? defaultWebGL2Options.renderGrid,
            (v) => {
              optionsState.renderGrid = v
            }
          }
          aria-label="Show grid"
        >
          <CompassTool />
        </Toggle>
      </Tooltip.Trigger>
      <Tooltip.Content>
        Show grid <Kbd show={showKeys} key="g" />
      </Tooltip.Content>
    </Tooltip.Root>

    <Popover.Root>
      <Popover.Trigger>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Toggle
              class="cursor-pointer"
              bind:pressed={
                () =>
                  (optionsState.opacity !== 1 &&
                    optionsState.opacity !== undefined) ||
                  (optionsState.removeColorThreshold !== 0 &&
                    optionsState.removeColorThreshold !== undefined) ||
                  optionsState.colorize === true,
                () => {}
              }
              aria-label="Opacity, remove background, colorize"
            >
              <CircleHalf />
            </Toggle>
          </Tooltip.Trigger>
          <Tooltip.Content>Opacity etc.</Tooltip.Content>
        </Tooltip.Root>
      </Popover.Trigger>
      <Popover.Content class="w-90" sideOffset={10}>
        <div class="grid grid-cols-6 gap-4">
          <h4 class="text-sm col-span-3">Opacity<Kbd key="space" /></h4>
          <Slider
            bind:value={
              () => optionsState.opacity ?? defaultWebGL2Options.opacity,
              (v) => {
                optionsState.opacity = v
              }
            }
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
            bind:value={
              () =>
                optionsState.removeColorThreshold ??
                defaultWebGL2Options.removeColorThreshold,
              (v) => {
                optionsState.removeColorThreshold = v
              }
            }
            type="single"
            min={0}
            max={1}
            step={0.01}
            class="col-span-2"
          />
          <input
            type="color"
            bind:value={
              () =>
                optionsState.removeColorColor ??
                defaultWebGL2Options.removeColorColor,
              (v) => {
                optionsState.removeColorColor = v
              }
            }
          />
          <h4 class="text-sm col-span-3">
            Colorize<Kbd key="c" />
          </h4>
          <Switch
            bind:checked={
              () => optionsState.colorize ?? defaultWebGL2Options.colorize,
              (v) => {
                optionsState.colorize = v
              }
            }
            class="col-span-2"
          ></Switch>
          <input
            type="color"
            bind:value={
              () =>
                optionsState.colorizeColor ??
                defaultWebGL2Options.colorizeColor,
              (v) => {
                optionsState.colorizeColor = v
              }
            }
          />
        </div>
      </Popover.Content>
    </Popover.Root>
  </Tooltip.Provider>
</div>
