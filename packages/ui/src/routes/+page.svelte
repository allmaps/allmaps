<script lang="ts">
  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import Dial from '$lib/components/Dial.svelte'

  import Color from '$lib/components/styleguide/Color.svelte'

  const colors = [
    'bg-blue-dark',
    'bg-blue',
    'bg-purple',
    'bg-pink',
    'bg-orange',
    'bg-red',
    'bg-green',
    'bg-yellow',
    'bg-gray-dark',
    'bg-gray-light',
    'bg-black',
    'bg-white'
  ]

  let opacity = 1
</script>

<Header appName="Style Guide">
  <URLInput />
</Header>

<main class="container mx-auto p-4">
  <ul class="space-y-2">
    {#each colors as color}
      <li><Color {color} /></li>
    {/each}
  </ul>

  <Dial bind:value={opacity} keyCode="Space" label="Opacity" />
  <span>{Math.round(opacity * 100)}%</span>
</main>
