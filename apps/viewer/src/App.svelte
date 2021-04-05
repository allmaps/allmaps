<script>
  import { onMount } from 'svelte'

  import Banner from './Banner.svelte'
  import Header from './Header.svelte'
  import Maps from './Maps.svelte'
  import Examples from './Examples.svelte'
  import BertSpaan from './BertSpaan.svelte'

  import { parse as parseAnnotation } from '@allmaps/annotation'

  const dataUrlPrefix = 'data:text/x-url,'
  const dataJsonPrefix = 'data:application/json,'

  let type
  let data

  let annotationUrl = ''
  let annotationString = ''

  function getHash () {
    return location.hash.slice(1)
  }

  let hash = getHash()

  $: {
    const queryParams = new URLSearchParams(hash)
    data = queryParams.get('data')
    type = queryParams.get('type')
  }

  function setDataHash (data) {
    const queryParams = new URLSearchParams('')
    queryParams.set('data', data)
    history.pushState(null, null, '#' + queryParams.toString())
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  function handleUrlSubmit () {
    setDataHash(dataUrlPrefix + annotationUrl)
  }

  function handleStringSubmit () {
    setDataHash(dataJsonPrefix + annotationString)
  }

  async function fetchAnnotation (url) {
    const response = await fetch(url)
    const annotation = await response.json()
    return annotation
  }

  async function parseUrlData (data) {
    if (data.startsWith(dataUrlPrefix)) {
      const url = data.replace(dataUrlPrefix, '')
      return fetchAnnotation(url)
    } else if (data.startsWith(dataJsonPrefix)) {
      const annotation = JSON.parse(data.replace(dataJsonPrefix, ''))
      return annotation
    } else {
      throw new Error(`Unsupported URL`)
    }
  }

  onMount(async () => {
    window.addEventListener('hashchange', () => {
      hash = getHash()
    }, false)
  })
</script>

<svelte:head>
  <link
    rel="stylesheet"
    type="text/css"
    href="https://cdn.jsdelivr.net/npm/bulma@0.9.2/css/bulma.min.css"
  />
  <link rel='stylesheet' href='/global.css'>
</svelte:head>

<Banner />
<main>
  <Header inline={!data} />
  {#if data}
    {#await parseUrlData(data)}
      <div class="content">
        <!-- TODO: centered  -->
        <p>Loading…</p>
      </div>
    {:then annotation}
      <Maps maps={parseAnnotation(annotation)} />
    {:catch error}
      <div class="content">
        <!-- TODO: centered! Make Error component!  -->
        <p>An error occurred!</p>
        <p><code>{ error.message }</code></p>
      </div>
    {/await}
  {:else}
    <div class="content">
      <p>Open a <a href="https://allmaps.org/#annotations">
        IIIF georeference annotation</a> from a URL:</p>
      <form on:submit|preventDefault={handleUrlSubmit}>
        <input bind:value="{annotationUrl}" name="url" placeholder="Annotation URL" autofocus />
        <button disabled="{annotationUrl.length === 0}">View</button>
      </form>
      <p>Or, paste an annotation in the text box:</p>
      <form on:submit|preventDefault={handleStringSubmit}>
        <textarea bind:value="{annotationString}" class="monospace"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>
        <button disabled="{annotationString.length === 0}">View</button>
      </form>
      <section>
        <Examples />
      </section>
      <footer>
        <BertSpaan />
      </footer>
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
