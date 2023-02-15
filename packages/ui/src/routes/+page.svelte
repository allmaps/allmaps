<script lang="ts">
  import url from '$lib/shared/stores/url.js'

  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import URLType from '$lib/components/URLType.svelte'

  import Color from '$lib/components/styleguide/Color.svelte'

  let urlValue: string

  const colors = [
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

  url.subscribe((value) => {
    urlValue = value
  })
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
</main>
