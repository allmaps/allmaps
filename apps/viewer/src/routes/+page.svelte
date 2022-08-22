<script lang="ts">
  import { onMount } from 'svelte'

  import Header from '$lib/components/Header.svelte'
  import Annotation from '$lib/components/Annotation.svelte'

  import Examples from '$lib/components/Examples.svelte'

  import 'ol/ol.css'

  // import { trackAnnotationUrl, trackAnnotationSource } from './lib/umami.js'

  const dataUrlPrefix = 'data:text/x-url,'
  const dataJsonPrefix = 'data:application/json,'

  let type: string | null
  let data: string | null
  let hash: string

  let annotationUrl = ''
  let annotationString = ''

  function getHash() {
    return window.location.hash.slice(1)
  }

  $: {
    const queryParams = new URLSearchParams(hash)
    data = queryParams.get('data')
    type = queryParams.get('type')
  }

  function setDataHash(data: string) {
    const queryParams = new URLSearchParams('')
    queryParams.set('data', data)
    history.pushState(null, '', '#' + queryParams.toString())
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  function handleUrlSubmit() {
    setDataHash(dataUrlPrefix + annotationUrl)
  }

  function handleStringSubmit() {
    setDataHash(dataJsonPrefix + annotationString)
  }

  async function fetchAnnotation(url: string) {
    const response = await fetch(url)
    const annotation = await response.json()
    return annotation
  }

  async function parseUrlData(data: string) {
    if (data.startsWith(dataUrlPrefix)) {
      const url = data.replace(dataUrlPrefix, '')

      // trackAnnotationSource('url')
      // trackAnnotationUrl(url)

      return fetchAnnotation(url)
    } else if (data.startsWith(dataJsonPrefix)) {
      const annotation = JSON.parse(data.replace(dataJsonPrefix, ''))

      // trackAnnotationSource('string')

      return annotation
    } else {
      throw new Error(`Unsupported URL`)
    }
  }

  onMount(async () => {
    hash = getHash()
    console.log('moubt', hash)

    window.addEventListener(
      'hashchange',
      () => {
        hash = getHash()
        console.log(hash, 'change')
      },
      false
    )
  })
</script>

<svelte:head>
  <!-- <link
    rel="stylesheet"
    type="text/css"
    href="https://cdn.jsdelivr.net/npm/bulma@0.9.2/css/bulma.min.css"
  /> -->
  <link rel="stylesheet" href="/global.css" />
</svelte:head>

<main>
  <Header inline={!data} />
  {#if data}
    {#await parseUrlData(data)}
      <div class="content">
        <!-- TODO: centered  -->
        <p>Loading…</p>
      </div>
    {:then annotation}
      <Annotation {annotation} />
    {:catch error}
      <div class="content">
        <!-- TODO: centered! Make Error component!  -->
        <p>An error occurred!</p>
        <p><code>{error.message}</code></p>
      </div>
    {/await}
  {:else}
    <div class="content">
      <p>Open a IIIF Georef Annotation from a URL:</p>
      <form on:submit|preventDefault={handleUrlSubmit}>
        <input
          bind:value={annotationUrl}
          name="url"
          placeholder="Georef Annotation URL"
          autofocus
        />
        <button disabled={annotationUrl.length === 0}>View</button>
      </form>
      <p>Or, paste an Georef Annotation in the text box:</p>
      <form on:submit|preventDefault={handleStringSubmit}>
        <textarea
          bind:value={annotationString}
          class="monospace"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <button disabled={annotationString.length === 0}>View</button>
      </form>
      <section>
        <Examples />
      </section>
      <footer>What is Allmaps</footer>
    </div>
  {/if}
</main>

<style>
  main {
    flex-grow: 1;
    overflow: auto;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .content {
    padding: 0.5em;
    margin: 0 auto;
    max-width: 900px;
  }

  form input,
  form textarea {
    width: 100%;
    display: block;
  }

  form textarea {
    height: 10em;
    resize: none;
  }

  form > *:not(:last-child) {
    margin-bottom: 0.5em;
  }

  footer {
    padding-top: 4em;
    padding-bottom: 1em;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>
