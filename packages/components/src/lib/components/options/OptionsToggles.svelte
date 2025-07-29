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
    layerOptionsState = $bindable(),
    projections,
    searchProjections,
    geoBbox = undefined,
    suggestProjections = undefined,
    showTooltips = true,
    showKeys = false
  }: {
    layerOptionsState: LayerOptionsState
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
            () => !(layerOptionsState.visible ?? defaultWebGL2Options.visible),
            (v) => {
              layerOptionsState.visible = !v
            }
          }
          aria-label="Hide"
        >
          {#if layerOptionsState.visible ?? defaultWebGL2Options.visible}
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
            () =>
              !(layerOptionsState.applyMask ?? defaultWebGL2Options.applyMask),
            (v) => {
              layerOptionsState.applyMask = !v
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
              layerOptionsState.renderAppliableMask ??
              defaultWebGL2Options.renderAppliableMask,
            (v) => {
              layerOptionsState.renderAppliableMask = v
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
            () =>
              layerOptionsState.renderGcps ?? defaultWebGL2Options.renderGcps,
            (v) => {
              layerOptionsState.renderGcps = v
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
        () => layerOptionsState.transformationType,
        (value: string | undefined) => {
          layerOptionsState.transformationType =
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
                () => layerOptionsState.internalProjection != undefined,
                () => {}
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
          bind:selectedProjection={layerOptionsState.internalProjection}
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
            () =>
              layerOptionsState.renderGrid ?? defaultWebGL2Options.renderGrid,
            (v) => {
              layerOptionsState.renderGrid = v
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
                  (layerOptionsState.opacity !== 1 &&
                    layerOptionsState.opacity !== undefined) ||
                  (layerOptionsState.removeColorThreshold !== 0 &&
                    layerOptionsState.removeColorThreshold !== undefined) ||
                  layerOptionsState.colorize === true,
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
              () => layerOptionsState.opacity ?? defaultWebGL2Options.opacity,
              (v) => {
                layerOptionsState.opacity = v
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
                layerOptionsState.removeColorThreshold ??
                defaultWebGL2Options.removeColorThreshold,
              (v) => {
                layerOptionsState.removeColorThreshold = v
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
                layerOptionsState.removeColorColor ??
                defaultWebGL2Options.removeColorColor,
              (v) => {
                layerOptionsState.removeColorColor = v
              }
            }
          />
          <h4 class="text-sm col-span-3">
            Colorize<Kbd key="c" />
          </h4>
          <Switch
            bind:checked={
              () => layerOptionsState.colorize ?? defaultWebGL2Options.colorize,
              (v) => {
                layerOptionsState.colorize = v
              }
            }
            class="col-span-2"
          ></Switch>
          <input
            type="color"
            bind:value={
              () =>
                layerOptionsState.colorizeColor ??
                defaultWebGL2Options.colorizeColor,
              (v) => {
                layerOptionsState.colorizeColor = v
              }
            }
          />
        </div>
      </Popover.Content>
    </Popover.Root>
  </Tooltip.Provider>
</div>
