<script lang="ts">
  import url from '$lib/shared/stores/url.js'

  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'

  // const url = 'https://collections.leventhalmap.org/search/commonwealth:7h14cv71z/manifest'

  let urlValue: string

  url.subscribe((value) => {
    urlValue = value
  })
</script>

<Header appName="Header">
  <URLInput>
    <div class="shrink-0 px-1 py-0.5 m-1 bg-lime-600/50 text-lime-700 rounded-md border-lime-800/25 border-2 text-xs ">Length: {urlValue.length}</div>
  </URLInput>
</Header>

<main class="container mx-auto p-4">
  <URLInput />

  <p class="my-2">
    The current URL is <a class="underline" href={urlValue}>{urlValue}</a>.
  </p>
</main>
