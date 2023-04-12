<script lang="ts">
  import { onMount } from 'svelte'
  import { browser } from '$app/environment'
  import { fade } from 'svelte/transition'

  import {
    Header,
    Loading,
    URLInput,
    URLType,
    Navigation,
    dataStore,
    paramStore
  } from '@allmaps/ui'

  import {
    addUrlSource,
    addStringSource,
    resetSources
  } from '$lib/shared/stores/sources.js'
  import { mapCount } from '$lib/shared/stores/maps.js'
  import {
    renderOptions,
    resetRenderOptionsLayer
  } from '$lib/shared/stores/render-options.js'

  import Container from '$lib/components/Container.svelte'
  import Examples from '$lib/components/Examples.svelte'

  import ShowError from '$lib/components/elements/Error.svelte'

  import 'ol/ol.css'

  let type: 'annotation'

  let initialized = false
  let showForm = false
  let error: Error | null

  let annotationUrl = ''
  let annotationString = ''

  function resetForm() {
    error = null
    annotationUrl = ''
    annotationString = ''

    showForm = true
  }

  async function handleAnnotationStringSubmit() {
    dataStore.set(annotationString)
  }

  function hasTouch() {
    if (browser) {
      // See:
      //  - https://css-tricks.com/touch-devices-not-judged-size/
      //  - https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript
      return window.matchMedia('(pointer: coarse)').matches
    }

    return false
  }

  let autofocus = !hasTouch()

  onMount(async () => {
    paramStore.subscribe(async (value) => {
      resetRenderOptionsLayer()
      resetSources()

      initialized = true
      if (!value) {
        resetForm()
      } else {
        showForm = false

        try {
          if (value.type === 'url' && value.url) {
            await addUrlSource(value.url)
          } else if (value.data) {
            await addStringSource(value.data)
          }
        } catch (err) {
          if (err instanceof Error) {
            error = err
          }
        }
      }
    })
  })
</script>

<Navigation />
<div class="absolute w-full h-full flex flex-col">
  <div class="z-10">
    <Header appName="Viewer">
      {#if !showForm && initialized}
        <URLInput>
          <URLType {type} />
        </URLInput>
      {/if}
    </Header>
  </div>
  <main class="relative h-full overflow-y-auto">
    {#if showForm}
      <div
        class="container mx-auto mt-10 p-2"
        transition:fade={{ duration: 120 }}
      >
        <p class="mb-3">Open a Georeference Annotation from a URL:</p>
        <URLInput {autofocus} />

        <p class="mt-3 mb-3">
          Or, paste an Georeference Annotation in the text box:
        </p>
        <form on:submit|preventDefault={handleAnnotationStringSubmit}>
          <textarea
            bind:value={annotationString}
            class="font-mono block mb-3 w-full h-60 bg-gray-50 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 text-sm"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <button
            type="submit"
            disabled={annotationString.length === 0}
            class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >View</button
          >
        </form>
        <section>
          <Examples />
        </section>
      </div>
    {:else if $mapCount}
      <Container />
    {:else if error}
      <div class="h-full flex flex-col gap-2 items-center justify-center">
        <ShowError {error} />
      </div>
    {:else if initialized}
      <div class="h-full flex items-center justify-center">
        <Loading />
      </div>
    {/if}
  </main>
</div>
