<script lang="ts">
  import { page } from '$app/state'

  import { Banner, Stats, Loading } from '@allmaps/components'

  import { setProjectionsState } from '@allmaps/components/state'

  import { getErrorState } from '$lib/state/error.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'
  import { setApiState } from '$lib/state/api.svelte.js'
  import { setHeadState } from '$lib/state/head.svelte.js'
  import { setMapsHistoryState } from '$lib/state/maps-history.svelte.js'
  import { setMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setScopeState } from '$lib/state/scope.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'

  import { setViewportsState } from '$lib/state/viewports.svelte.js'
  // import { setWarpedMapLayerState } from '$lib/state/warpedmaplayer.svelte'

  import { createRouteUrl, gotoRoute, getView } from '$lib/shared/router.js'

  import Head from '$lib/components/Head.svelte'
  import Header from '$lib/components/Header.svelte'
  import Controls from '$lib/components/Controls.svelte'

  import About from '$lib/components/modals/About.svelte'
  import Annotation from '$lib/components/modals/Annotation.svelte'
  import Export from '$lib/components/modals/Export.svelte'
  import Keyboard from '$lib/components/modals/Keyboard.svelte'
  import Command from '$lib/components/modals/Command.svelte'

  import Error from '$lib/components/Error.svelte'

  import type { Snippet } from 'svelte'

  const { children }: { children: Snippet } = $props()

  const errorState = getErrorState()
  const urlState = getUrlState()
  const sourceState = setSourceState(urlState, errorState)
  const uiState = setUiState(urlState, sourceState)
  const apiState = setApiState(sourceState)

  setViewportsState(sourceState)

  const projectionsState = setProjectionsState(
    'https://dev.api.allmaps.org/projections'
  )

  const mapsHistoryState = setMapsHistoryState(sourceState)
  const mapsState = setMapsState(sourceState, errorState, mapsHistoryState)

  const mapsMergedState = setMapsMergedState(
    mapsState,
    mapsHistoryState,
    apiState,
    projectionsState
  )

  setScopeState(sourceState, mapsState, mapsMergedState, projectionsState)
  setHeadState(sourceState)

  // setWarpedMapLayerState(
  //   mapsState,
  //   mapsMergedState,
  //   scopeState,
  //   projectionsState
  // )

  function shouldHandleKeyboardEvent(event: KeyboardEvent) {
    if (event.target instanceof Element) {
      if (['BUTTON', 'INPUT'].includes(event.target.nodeName)) {
        return false
      }
    }

    if (uiState.hasModalOpen) {
      return false
    }

    return true
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      uiState.setModalOpen('command', !uiState.getModalOpen('command'))
    }

    if (!shouldHandleKeyboardEvent(event)) {
      return
    }

    if (event.code === 'Space') {
      uiState.dispatchToggleVisible(false)
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (!shouldHandleKeyboardEvent(event)) {
      return
    }

    if (event.code === 'Space') {
      uiState.dispatchToggleVisible(true)
    }
  }

  function handleKeypress(event: KeyboardEvent) {
    if (!shouldHandleKeyboardEvent(event)) {
      return
    }

    if (event.key === '[') {
      const previousImageId = sourceState.getPreviousActiveImageId()

      gotoRoute(createRouteUrl(page, getView(page), { image: previousImageId }))
    } else if (event.key === ']') {
      const nextImageId = sourceState.getNextActiveImageId()

      gotoRoute(createRouteUrl(page, getView(page), { image: nextImageId }))
    } else if (event.key === '{') {
      const previousMapId = mapsState.previousMapId
      if (previousMapId) {
        uiState.lastClickedItem = {
          type: 'map',
          mapId: previousMapId
        }
        mapsState.activeMapId = previousMapId
        console.log('set previous map', previousMapId)
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
    } else if (event.key === 'm') {
      uiState.dispatchToggleRenderMasks()
    }
  }
</script>

<svelte:body
  onkeypress={handleKeypress}
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
/>

<Head />
<div
  class="fixed w-screen h-screen grid grid-rows-[min-content_min-content_1fr]"
>
  <div>
    <Banner />
  </div>
  <div class="z-20">
    <Header />
  </div>
  <div class="grid w-full h-full min-h-0">
    <!-- {#if sourceState.loading}
      <div class="w-full h-full top-0 left-0">
        <Loading />
      </div>
    {:else if errorState.error}
      <Error error={errorState.error} />
    {:else}
         {/if} -->

    <div class="col-span-full row-span-full min-h-0">
      {@render children()}
    </div>

    <div class="z-10 col-span-full row-span-full min-h-0 pointer-events-none">
      <Controls />
    </div>
  </div>
</div>

<About />
<Annotation />
<Command />
<Export />
<Keyboard />
