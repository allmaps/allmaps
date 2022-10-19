<script lang="ts">
  import { onMount } from 'svelte'

  import { Header, URLInput, URLType, urlStore } from '@allmaps/ui-components'

  import Loading from '$lib/components/Loading.svelte'
  import Annotation from '$lib/components/Annotation.svelte'

  import Examples from '$lib/components/Examples.svelte'

  import 'ol/ol.css'

  const dataUrlPrefix = 'data:text/x-url,'
  const dataJsonPrefix = 'data:application/json,'

  let type: 'annotation'
  let loaded = false
  let annotationUrl = ''
  let annotationString = ''

  urlStore.subscribe((value) => {
    loadUrl(value)
  })

  // function getAnnotationFromHash() {
  //   const hash = window.location.hash.slice(1)
  //   const queryParams = new URLSearchParams(hash)
  //   const urlParam = queryParams.get('url')
  //   const annotationParam = queryParams.get('annotation')
  //   const dataParam = queryParams.get('data')

  //   annotationUrl = ''
  //   annotationString = ''

  //   if (urlParam) {
  //     annotationUrl = urlParam
  //   } else if (annotationParam) {
  //     annotationString = annotationParam
  //   } else if (dataParam && dataParam.startsWith(dataUrlPrefix)) {
  //     annotationUrl = dataParam.replace(dataUrlPrefix, '')
  //   } else if (dataParam && dataParam.startsWith(dataJsonPrefix)) {
  //     annotationString = dataParam.replace(dataJsonPrefix, '')
  //   }

  //   if (!annotationUrl && !annotationString) {
  //     loaded = false
  //   }
  // }

  // function setDataHash(annotationUrl: string, annotationString: string) {
  //   if (annotationUrl || annotationString) {
  //     const queryParams = new URLSearchParams('')

  //     if (annotationUrl) {
  //       queryParams.set('url', annotationUrl)
  //     } else if (annotationString) {
  //       queryParams.set('annotation', annotationString)
  //     }

  //     history.pushState(null, '', '#' + queryParams.toString())
  //     window.dispatchEvent(new HashChangeEvent('hashchange'))
  //   }
  // }

  // function handleUrlSubmit() {
  //   setDataHash(annotationUrl, '')
  // }

  function handleStringSubmit() {
    //   setDataHash('', annotationString)
  }

  function loadUrl(url: string) {
    if (url) {
      annotationUrl = url
    }
  }

  async function fetchAnnotation(url: string) {
    const response = await fetch(url)
    const annotation = await response.json()
    return annotation
  }

  async function parseAnnotation() {
    let annotation
    if (annotationUrl) {
      annotation = fetchAnnotation(annotationUrl)
    } else if (annotationString) {
      annotation = JSON.parse(annotationString)
    }

    type = 'annotation'
    loaded = true

    return annotation
  }

  onMount(async () => {
    // getAnnotationFromHash()
    // window.addEventListener(
    //   'hashchange',
    //   () => {
    //     getAnnotationFromHash()
    //   },
    //   false
    // )
  })
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Viewer">
    {#if loaded}
      <URLInput>
        <URLType {type} />
      </URLInput>
    {/if}
  </Header>
  <main class="h-full">
    {#if annotationUrl || annotationString}
      {#await parseAnnotation()}
        <Loading />
      {:then annotation}
        <Annotation {annotation} />
      {:catch error}
        <div class="content">
          <!-- TODO: centered! Make Error component!  -->
          <p>An error occurred!</p>
          <p><code>{error.message}</code></p>
          <a href="/#">Reset</a>.
        </div>
      {/await}
      <!-- {:else if !loaded} -->
      <!-- <Loading /> -->
    {:else}
      <div class="content">
        <p>Open a Georef Annotation from a URL:</p>
        <URLInput />
        <!-- <form on:submit|preventDefault={handleUrlSubmit}>
        <input
          bind:value={annotationUrl}
          name="url"
          placeholder="Georef Annotation URL"
          autofocus
        />
        <button disabled={annotationUrl.length === 0}>View</button>
      </form> -->
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
      </div>
    {/if}
  </main>
</div>
