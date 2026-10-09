<script lang="ts">
  import type { Snippet } from 'svelte'
  import { hueColor } from './control-layout'
  import type { Rail } from './control-layout'

  let {
    position,
    label,
    children,
    active = false,
    pressed,
    disabled = false,
    value,
    sliderValue,
    rail,
    hueScale = false,
    onpointerdown,
    onclick,
    ondblclick,
    onkeydown
  }: {
    position: [number, number]
    label: string
    children: Snippet
    active?: boolean
    pressed?: boolean
    disabled?: boolean
    value?: string
    sliderValue?: number
    rail?: Rail
    hueScale?: boolean
    onpointerdown?: (event: PointerEvent) => void
    onclick?: (event: MouseEvent) => void
    ondblclick?: (event: MouseEvent) => void
    onkeydown?: (event: KeyboardEvent) => void
  } = $props()
</script>

<div
  class="map-control"
  class:active
  class:hue-control={hueScale}
  style:transform={'translate3d(' +
    position[0] +
    'px, ' +
    position[1] +
    'px, 0)'}
  class:disabled
  style:--hue-color={hueColor(sliderValue ?? 0)}
>
  {#if rail}
    <div
      class="control-track"
      class:hue-track={hueScale}
      aria-hidden="true"
      style:left={rail.start[0] - position[0] + 'px'}
      style:top={rail.start[1] - position[1] - 2 + 'px'}
      style:width={Math.hypot(
        rail.end[0] - rail.start[0],
        rail.end[1] - rail.start[1]
      ) + 'px'}
      style:transform={'rotate(' +
        Math.atan2(rail.end[1] - rail.start[1], rail.end[0] - rail.start[0]) +
        'rad)'}
    ></div>
  {/if}
  <button
    class="map-control-button"
    class:pressed
    title={label}
    aria-label={label}
    aria-pressed={sliderValue === undefined ? pressed : undefined}
    role={sliderValue !== undefined ? 'slider' : undefined}
    aria-valuemin={sliderValue !== undefined ? 0 : undefined}
    aria-valuemax={sliderValue !== undefined ? 1 : undefined}
    aria-valuenow={sliderValue}
    aria-valuetext={sliderValue !== undefined ? value : undefined}
    {disabled}
    {onpointerdown}
    {onclick}
    {ondblclick}
    {onkeydown}>{@render children()}</button
  >
  {#if value}<output class="control-value">{value}</output>{/if}
</div>
