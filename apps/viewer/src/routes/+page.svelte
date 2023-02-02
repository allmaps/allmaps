<script lang="ts">
  import { onMount } from 'svelte'
  import { afterNavigate } from '$app/navigation'
  import { fade } from 'svelte/transition'

  import {
    Header,
    URLInput,
    URLType,
    urlStore,
    dataStore,
    paramStore
  } from '@allmaps/ui-components'

  import {
    addUrlSource,
    addStringSource,
    resetSources
  } from '$lib/shared/stores/sources.js'
  import { mapCount } from '$lib/shared/stores/maps.js'

  import Loading from '$lib/components/Loading.svelte'
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

  // TODO: move to ui-components
  afterNavigate(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const data = searchParams.get('data')

    if (data) {
      dataStore.set(data)
    } else {
      dataStore.set('')
    }
  })

  onMount(async () => {
    // TODO: move out of onMount?
    paramStore.subscribe(async (value) => {
      console.log('new paramStore', value)
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

    // // TODO: move out of onMount?
    // urlStore.subscribe(async (value) => {
    //   console.log('new urlStore', value)
    //   resetSources()

    //   initialized = true
    //   if (!value) {
    //     resetForm()
    //   } else {
    //     showForm = false

    //     try {
    //       await addUrlSource(value)
    //     } catch (err) {
    //       if (err instanceof Error) {
    //         error = err
    //       }
    //     }
    //   }
    // })

    // // TODO: move out of onMount?
    // dataStore.subscribe(async (value) => {
    //   console.log('new dataStore', value)
    //   resetSources()

    //   initialized = true
    //   if (!value) {
    //     resetForm()
    //   } else {
    //     showForm = false

    //     try {
    //       await addStringSource(value)
    //     } catch (err) {
    //       if (err instanceof Error) {
    //         error = err
    //       }
    //     }
    //   }
    // })
  })
</script>

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Viewer">
    {#if !showForm && initialized}
      <URLInput>
        <URLType {type} />
      </URLInput>
    {/if}
  </Header>
  <main class="grow">
    {#if showForm}
      <div
        class="container mx-auto mt-10 p-2"
        transition:fade={{ duration: 120 }}
      >
        <p class="mb-3">Open a Georeference Annotation from a URL:</p>
        <URLInput />

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
      <div class="container mx-auto">
        <ShowError {error} />
      </div>
    {:else if initialized}
      <Loading />
    {/if}
  </main>
</div>
