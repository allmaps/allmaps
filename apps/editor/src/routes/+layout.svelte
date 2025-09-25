<script lang="ts">
  import { page } from '$app/state'
  import { onNavigate, afterNavigate } from '$app/navigation'

  import { Banner, Stats, Loading } from '@allmaps/components'
  import { setProjectionsState } from '@allmaps/components/state'

  import { setApiState } from '$lib/state/api.svelte.js'
  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setExamplesState } from '$lib/state/examples.svelte.js'
  import { setHeadState } from '$lib/state/head.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'
  import { setMapsHistoryState } from '$lib/state/maps-history.svelte.js'
  import { setMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setScopeState } from '$lib/state/scope.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { setUrlState } from '$lib/state/url.svelte.js'
  import { setViewportsState } from '$lib/state/viewports.svelte.js'

  import { createRouteUrl, gotoRoute, getRouteId } from '$lib/shared/router.js'

  import Head from '$lib/components/Head.svelte'
  import Header from '$lib/components/Header.svelte'
  import Controls from '$lib/components/Controls.svelte'

  import About from '$lib/components/modals/About.svelte'
  import Annotation from '$lib/components/modals/Annotation.svelte'
  import EditGcps from '$lib/components/modals/EditGcps.svelte'
  import Export from '$lib/components/modals/Export.svelte'
  import Keyboard from '$lib/components/modals/Keyboard.svelte'

  import Error from '$lib/components/Error.svelte'
  import Command from '$lib/components/Command.svelte'

  import type { Snippet } from 'svelte'

  import type { View } from '$lib/types/shared.js'

  import '../app.css'
  import '@allmaps/components/css/fonts.css'

  const { children }: { children: Snippet } = $props()

  const views: View[] = ['images', 'mask', 'georeference', 'results']

  const isView = $derived(
    page.route.id && views.map((view) => `/${view}`).includes(page.route.id)
  )

  const errorState = setErrorState()
  const urlState = setUrlState(page.url, errorState)
  setExamplesState()

  const uiState = setUiState(urlState)
  setImageInfoState()

  const sourceState = setSourceState(urlState, errorState)
  const apiState = setApiState(sourceState)
  setViewportsState(sourceState)

  const mapsState = setMapsState(sourceState, errorState)
  const mapsHistoryState = setMapsHistoryState(sourceState, mapsState)
  const mapsMergedState = setMapsMergedState(
    mapsState,
    mapsHistoryState,
    apiState
  )

  setScopeState(sourceState, mapsState, mapsMergedState)
  setHeadState(sourceState)
  setProjectionsState()

  function handleKeypress(event: KeyboardEvent) {
    if (!isView) {
      return
    }

    if (event.target instanceof Element) {
      if (['BUTTON', 'INPUT'].includes(event.target.nodeName)) {
        return
      }
    }

    if (event.key === '[') {
      const previousImageId = sourceState.getPreviousActiveImageId()

      gotoRoute(
        createRouteUrl(page, getRouteId(page), { image: previousImageId })
      )
    } else if (event.key === ']') {
      const nextImageId = sourceState.getNextActiveImageId()

      gotoRoute(createRouteUrl(page, getRouteId(page), { image: nextImageId }))
    } else if (event.key === '{') {
      const previousMapId = mapsState.previousMapId
      if (previousMapId) {
        uiState.lastClickedItem = {
          type: 'map',
          mapId: previousMapId
        }
        mapsState.activeMapId = previousMapId
      }
    } else if (event.key === '}') {
      const nextMapId = mapsState.nextMapId
      if (nextMapId) {
        uiState.lastClickedItem = {
          type: 'map',
          mapId: nextMapId
        }

        mapsState.activeMapId = nextMapId
      }
    } else if (event.key === '1') {
      gotoRoute(createRouteUrl(page, 'images'))
    } else if (event.key === '2') {
      gotoRoute(createRouteUrl(page, 'mask'))
    } else if (event.key === '3') {
      gotoRoute(createRouteUrl(page, 'georeference'))
    } else if (event.key === '4') {
      gotoRoute(createRouteUrl(page, 'results'))
    }
  }

  onNavigate((navigation) => {
    if (!document.startViewTransition) return

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  afterNavigate(() => {
    urlState.updateUrl(page.url)
  })
</script>

<svelte:body onkeypress={handleKeypress} />

<Head />
<Stats />
<div
  class="absolute w-full h-full grid grid-rows-[min-content_min-content_1fr]"
>
  <div>
    <Banner />
  </div>

  {#if isView}
    <Header />
  {:else}
    <!-- TODO: remove this div, make main grid only 2 cols when not view -->
    <div></div>
  {/if}

  <div class="relative flex w-full h-full justify-center min-h-0">
    {#if sourceState.loading}
      <div class="absolute w-full h-full top-0 left-0">
        <Loading />
      </div>
    {:else if errorState.error}
      <Error error={errorState.error} />
    {:else}
      <div class="absolute w-full h-full top-0 left-0">
        {@render children()}
      </div>
      {#if isView}
        <Controls />
      {/if}
    {/if}
  </div>
</div>
{#if isView}
  <About />
  <Annotation />
  <Command />
  <EditGcps />
  <Export />
  <Keyboard />
{/if}
