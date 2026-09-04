<script lang="ts">
  import { page } from '$app/state'

  import { getLocaleForUrl } from '$lib/paraglide/runtime.js'
  import { getMapGuideState } from '$lib/state/map-guide.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import {
    createEditorMapGuideCompletionPrompt,
    createEditorMapGuideMessages
  } from '$lib/shared/editor-map-guide-messages.js'
  import { getEditorMapGuideProgress } from '$lib/shared/editor-map-guide-progress.js'
  import { getView, getViewUrl, gotoRoute } from '$lib/shared/router.js'

  import type {
    EditorMapGuideContext,
    EditorMapGuideTarget
  } from '$lib/types/map-guide.js'
  import type { View } from '$lib/types/shared.js'

  const mapGuideState = getMapGuideState()
  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()
  const uiState = getUiState()
  const urlState = getUrlState()

  const locale = $derived(getLocaleForUrl(page.url))
  let pendingMapId = $state<string>()

  const progress = $derived(
    getEditorMapGuideProgress({
      sourceState,
      mapsState,
      mapsMergedState,
      locale
    })
  )

  const context = $derived<EditorMapGuideContext>({
    resourceKey: sourceState.source?.url,
    view: getView(page),
    activeImageId: sourceState.activeImageId,
    activeMapId: mapsState.activeMapId,
    firstUse: uiState.firstUse,
    progress,
    completeFirstUse: () => uiState.completeFirstUse(),
    startTour: () => uiState.dispatchStartTour(),
    gotoView,
    gotoTarget,
    activateImage,
    activateMap,
    openMapsPopover,
    openExportPopover
  })

  $effect(() => {
    mapGuideState.setDefinitions(createEditorMapGuideMessages(locale, context))
    mapGuideState.setCompletionPrompt(
      createEditorMapGuideCompletionPrompt(locale, context)
    )
  })

  $effect(() => {
    if (
      pendingMapId &&
      mapsState.connectedImageId === sourceState.activeImageId &&
      mapsState.getMapById(pendingMapId)
    ) {
      mapsState.activeMapId = pendingMapId
      pendingMapId = undefined
    }
  })

  $effect(() => {
    mapGuideState.setContext(context)
  })

  function gotoView(view: View) {
    gotoRoute(
      urlState.generateUrl(getViewUrl(view), {
        imageId: sourceState.activeImageId || undefined
      })
    )
  }

  function gotoTarget(target: EditorMapGuideTarget) {
    if (target.mapId) {
      pendingMapId = target.mapId
    }

    if (target.view) {
      gotoRoute(
        urlState.generateUrl(getViewUrl(target.view), {
          imageId: target.imageId || sourceState.activeImageId || undefined
        })
      )
    } else if (target.imageId) {
      gotoRoute(
        urlState.generateUrl(page.url.pathname, {
          imageId: target.imageId
        })
      )
    }

    if (
      target.mapId &&
      (!target.imageId || target.imageId === sourceState.activeImageId) &&
      mapsState.getMapById(target.mapId)
    ) {
      mapsState.activeMapId = target.mapId
      pendingMapId = undefined
    }
  }

  function activateImage(imageId: string) {
    gotoRoute(
      urlState.generateUrl(page.url.pathname, {
        imageId
      })
    )
  }

  function activateMap(mapId: string) {
    mapsState.activeMapId = mapId
  }

  function openMapsPopover() {
    uiState.popoverOpen.maps = true
  }

  function openExportPopover() {
    uiState.popoverOpen.export = true
  }
</script>
