<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  export function formatUsage(opacity = 1, disabled = false) {
    return svelteExample(
      [
        "import { OpacitySlider } from '@allmaps/ui/opacity-slider'",
        '',
        `let opacity = $state(${opacity})`
      ],
      `<div class="size-10">\n  <OpacitySlider bind:opacity${disabled ? ' disabled' : ''} />\n</div>`
    )
  }
</script>

<script lang="ts">
  import { Checkbox } from '$lib/checkbox.js'
  import { OpacitySlider } from '$lib/opacity-slider.js'
  import mapCrop from '../../../../../apps/docs/public/examples/ocr/san-francisco-crop.jpg?url'
  import Playground from './Playground.svelte'

  let opacity = $state(1)
  let disabled = $state(false)
</script>

<Playground usage={formatUsage(opacity, disabled)}>
  {#snippet preview()}
    <figure
      class="m-0 w-full max-w-md overflow-hidden rounded-lg border border-border"
    >
      <div
        class="relative bg-white bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)] bg-size-[20px_20px]"
      >
        <img
          src={mapCrop}
          alt="Detail of a 1905 San Francisco fire insurance map"
          class="block aspect-video w-full object-cover"
          style:opacity
        />
        <div class="absolute right-3 bottom-3 size-10 rounded-full shadow-md">
          <OpacitySlider bind:opacity {disabled} />
        </div>
      </div>
      <figcaption
        class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-border bg-white px-3 py-2 text-xs text-black"
      >
        <span
          >Source: <a
            href="https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~214142~5501497"
            class="text-inherit underline">David Rumsey Map Collection</a
          ></span
        >
        <span class="whitespace-nowrap tabular-nums"
          >Opacity {Math.round(opacity * 100)}%</span
        >
      </figcaption>
    </figure>
  {/snippet}
  {#snippet controls()}
    <Checkbox bind:checked={disabled}>Disabled</Checkbox>
  {/snippet}
</Playground>
