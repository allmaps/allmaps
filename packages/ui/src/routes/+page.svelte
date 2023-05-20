<script lang="ts">
  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Dial from '$lib/components/Dial.svelte'

  import Color from '$lib/components/styleguide/Color.svelte'

  import colors from '$lib/shared/colors.js'

  const backgroundColors = Object.keys(colors).map((color) => `bg-${color}`)

  let opacity = 1
</script>

<Header appName="Style Guide">
  <URLInput />
</Header>

<main class="container mx-auto p-4">
  <ul class="space-y-2">
    {#each backgroundColors as color}
      <li><Color {color} /></li>
    {/each}
  </ul>

  <!-- svelte-ignore a11y-label-has-associated-control -->
  <label class="flex items-center gap-2">
    <Dial bind:value={opacity} keyCode="Space" label="Opacity" />
    <span>{Math.round(opacity * 100)}%</span>
  </label>
</main>
