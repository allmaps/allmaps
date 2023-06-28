<script lang="ts">
  import type { Shades } from '@allmaps/tailwind'

  export let color: string
  export let shades: Shades
  export let originalColorIndex: number

  function colorName(index: number) {
    if (index === originalColorIndex) {
      return color
    }

    return `${color}-${(index + 1) * 100}`
  }
</script>

<div class="flex flex-col gap-2">
  {#each shades as shade, index}
    <div
      style:background-color={shade}
      class="rounded p-4 font-mono"
      class:text-white={index > 5}
    >
      <div>{colorName(index)}</div>
      <div>{shade}</div>
    </div>
  {/each}
</div>
