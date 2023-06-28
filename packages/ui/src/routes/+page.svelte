<script lang="ts">
  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Dial from '$lib/components/Dial.svelte'

  import Color from '$lib/components/styleguide/Color.svelte'

  import { shades, originalColorIndex } from '@allmaps/tailwind'

  const backgroundColors = Object.keys(shades).map((color) => `bg-${color}`)

  let opacity = 1
</script>

<Header appName="Style Guide">
  <URLInput />
</Header>

<main class="container mx-auto p-4 space-y-8">
  <section>
    <h1>Colors:</h1>
    <ul class="flex flex-row basis-full	 gap-2">
      {#each Object.entries(shades) as [color, colorShades]}
        <li><Color {color} shades={colorShades} {originalColorIndex} /></li>
      {/each}
    </ul>
  </section>
  <section>
    <h1>Controls:</h1>
    <!-- svelte-ignore a11y-label-has-associated-control -->
    <label class="flex items-center gap-2">
      <Dial bind:value={opacity} keyCode="Space" label="Opacity" />
      <span>{Math.round(opacity * 100)}%</span>
    </label>
  </section>
</main>
