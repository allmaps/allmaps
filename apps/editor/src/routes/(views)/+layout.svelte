<script lang="ts">
  import { page } from '$app/state'

  import { Banner, Loading } from '@allmaps/components'

  import { setProjectionsState } from '@allmaps/components/state'

  import { getErrorState } from '$lib/state/error.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { setApiState } from '$lib/state/api.svelte.js'
  import { setHeadState } from '$lib/state/head.svelte.js'
  import { setMapsHistoryState } from '$lib/state/maps-history.svelte.js'
  import { setMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { setMapsState } from '$lib/state/maps.svelte.js'
  import { setScopeState } from '$lib/state/scope.svelte.js'
  import { setSourceState } from '$lib/state/source.svelte.js'
  import { setUiState } from '$lib/state/ui.svelte.js'
  import { getVarsState } from '$lib/state/vars.svelte.js'

  import { setViewportsState } from '$lib/state/viewports.svelte.js'
  // import { setWarpedMapLayerState } from '$lib/state/warpedmaplayer.svelte'

  import { gotoRoute, getViewUrl } from '$lib/shared/router.js'

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

  import type { Env } from '$lib/types/env.js'

  const { children }: { children: Snippet } = $props()

  const varsState = getVarsState<Env>()

  const apiBaseUrl = varsState.get('PUBLIC_ALLMAPS_API_URL')
  const annotationsApiBaseUrl = varsState.get(
    'PUBLIC_ALLMAPS_ANNOTATIONS_API_URL'
  )
  const previewUrl = varsState.get('PUBLIC_ALLMAPS_PREVIEW_URL')
  const apiWsUrl = varsState.get('PUBLIC_ALLMAPS_API_WS_URL')

  const errorState = getErrorState()
  const urlState = getUrlState()
  const sourceState = setSourceState(
    varsState.get('PUBLIC_ALLMAPS_ANNOTATIONS_API_URL'),
    urlState,
    errorState
  )
  const uiState = setUiState(urlState, sourceState)
  const apiState = setApiState(apiBaseUrl, sourceState)

  setViewportsState(sourceState)

  const projectionsState = setProjectionsState(`${apiBaseUrl}/projections`)

  const mapsHistoryState = setMapsHistoryState(sourceState)
  const mapsState = setMapsState(
    apiWsUrl,
    sourceState,
    errorState,
    mapsHistoryState
  )

  const mapsMergedState = setMapsMergedState(
    apiBaseUrl,
    annotationsApiBaseUrl,
    mapsState,
    mapsHistoryState,
    apiState,
    projectionsState
  )

  setScopeState(
    apiBaseUrl,
    annotationsApiBaseUrl,
    sourceState,
    mapsState,
    mapsMergedState,
    projectionsState
  )
  setHeadState(previewUrl, sourceState)

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
      uiState.modalOpen.command = !uiState.modalOpen.command
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

      gotoRoute(
        urlState.generateUrl(page.url.pathname, { imageId: previousImageId })
      )
    } else if (event.key === ']') {
      const nextImageId = sourceState.getNextActiveImageId()

      gotoRoute(
        urlState.generateUrl(page.url.pathname, { imageId: nextImageId })
      )
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
      gotoRoute(urlState.generateUrl(getViewUrl('images')))
    } else if (event.key === '2') {
      gotoRoute(urlState.generateUrl(getViewUrl('mask')))
    } else if (event.key === '3') {
      gotoRoute(urlState.generateUrl(getViewUrl('georeference')))
    } else if (event.key === '4') {
      gotoRoute(urlState.generateUrl(getViewUrl('results')))
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
<div class="fixed grid h-dvh w-dvw grid-rows-[min-content_min-content_1fr]">
  <div>
    <Banner />
  </div>
  <div class="z-20">
    <Header />
  </div>
  <div class="grid h-full min-h-0 w-full">
    {#if errorState.error}
      <Error error={errorState.error} />
    {:else}
      <div class="col-span-full row-span-full min-h-0 min-w-0">
        {@render children()}
      </div>

      {#if sourceState.fetching}
        <div class="col-span-full row-span-full">
          <div class="flex h-full w-full items-center justify-center">
            <div class="z-50 rounded-lg bg-white p-1 shadow-lg">
              <Loading />
            </div>
          </div>
        </div>
      {/if}

      <div class="pointer-events-none z-10 col-span-full row-span-full min-h-0">
        <Controls />
      </div>
    {/if}
  </div>
</div>

<About />
<Annotation />
<Command />
<Export />
<Keyboard />
