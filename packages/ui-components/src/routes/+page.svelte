<script lang="ts">
  import url from '$lib/shared/stores/url.js'

  import Header from '$lib/components/Header.svelte'
  import URLInput from '$lib/components/URLInput.svelte'
  import URLType from '$lib/components/URLType.svelte'

  let urlValue: string

  url.subscribe((value) => {
    urlValue = value
  })
</script>

<Header appName="Header">
  <URLInput>
    <URLType type="manifest" />
  </URLInput>
</Header>

<main class="container mx-auto p-4">
  <URLInput autofocus={false} />

  <p class="my-2">
    The current URL is "{urlValue}".
  </p>
</main>
